import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiGet, apiPost } from '../utils.js';
import { parseLidarScan } from '../utils/LidarParser.js';
import { checkMapGrid } from '../utils/map.js';

async function getAGVPosition(deviceName: string) {
  const result = await apiGet('/ros/subscribe_once', {
    topic: `/${deviceName}/odom`,
  });
  console.log('getAGVPosition result:', result);
  const msgPosition = { x: 0, y: 0, yaw: 0 };
  console.log(result);
  if (result?.pose?.pose) {
    msgPosition.x = parseFloat(result.pose.pose.position.x.toFixed(1));
    msgPosition.y = parseFloat(result.pose.pose.position.y.toFixed(1));
    const orientation = result.pose.pose.orientation;
    const yaw = Math.atan2(
      2.0 * (orientation.w * orientation.z),
      1.0 - 2.0 * (orientation.z * orientation.z)
    );
    msgPosition.yaw = parseFloat(((yaw * 180) / Math.PI).toFixed(1));
  }
  return msgPosition;
}

const OCCUPIED_THRESHOLD = 1.5;

async function getRobotPositions(): Promise<{ x: number; y: number; name: string }[]> {
  const devices: any[] = await apiGet('/devices/with-positions');
  return devices
    .filter(d => d.localposition?.x != null && d.localposition?.y != null)
    .map(d => ({ x: d.localposition.x, y: d.localposition.y, name: d.name ?? d.id }));
}

function isPositionOccupied(
  px: number,
  py: number,
  robots: { x: number; y: number }[],
  threshold = OCCUPIED_THRESHOLD
): boolean {
  return robots.some(r => Math.sqrt((r.x - px) ** 2 + (r.y - py) ** 2) < threshold);
}

export function registerAGVCommandTools(server: McpServer) {
  server.tool(
    'get_agv_fleet',
    'get list of robots registered in the platform with position and status',
    {},
    async () => {
      const devices = await apiGet('/devices/with-positions');
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(devices, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    'move_to_world_pose_agv',
    `Navigate an AGV to an ABSOLUTE pose in the world (map) frame. Use this when you already know the exact world-frame coordinates (x, y, yaw) — e.g. from a pre-defined waypoint table, a coordinates database, or a previously computed goal.
DO NOT use this to move relative to the robot or based on sensor readings (LIDAR/camera) — use move_relative_robot_frame for that instead.
Send one goal at a time and wait for the result before sending another.
On timeout: check robot position — if within 0.5 m of goal, treat as success; otherwise retry or investigate.`,
    {
      deviceName: z.string().describe('Device name to send command to'),
      x: z.number().describe('X coordinate of the pose goal'),
      y: z.number().describe('Y coordinate of the pose goal'),
      yaw: z.number().describe('Rotation angle around Z axis in degrees (yaw)'),
      blocking: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          'If true, wait until navigation completes before returning. If false, return immediately and use get_agv_action_status to track progress.'
        ),
    },
    async ({ deviceName, x, y, yaw, blocking = true }) => {
      const yawRad = (yaw * Math.PI) / 180;
      const qz = Math.sin(yawRad / 2);
      const qw = Math.cos(yawRad / 2);

      // When blocking=true the backend holds the request until Nav2 finishes (up to 120s).
      // MCP axios timeout is set slightly higher so the backend error arrives first.
      const NAV_TIMEOUT_MS = blocking ? 180_000 : 5_000;
      const ARRIVAL_THRESHOLD = 0.5; // metres

      let result: any;
      try {
        result = await apiPost(
          '/ros/action_send_goal',
          {
            action: `/${deviceName}/navigate_to_pose`,
            actionType: 'nav2_msgs/action/NavigateToPose',
            timeout: 120_000,
            blocking,
            target: { x, y, yaw },
            message: {
              pose: {
                header: { frame_id: 'map' },
                pose: {
                  position: { x, y, z: 0.0 },
                  orientation: { x: 0.0, y: 0.0, z: qz, w: qw },
                },
              },
              behavior_tree: '',
            },
          },
          NAV_TIMEOUT_MS
        );
      } catch (err: any) {
        const isTimeout =
          err.code === 'ECONNABORTED' ||
          err.message?.includes('timeout') ||
          err.message?.includes('Timeout');

        // Non-blocking requests don't time out on the MCP side — rethrow any error
        if (!isTimeout || !blocking) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  { state: 'error', msg: `API error: ${err.response?.data?.error ?? err.message}` },
                  null,
                  2
                ),
              },
            ],
          };
        }

        // Blocking + timeout: check final position to distinguish "arrived late" from "stuck"
        let finalPos = { x: 0, y: 0, yaw: 0 };
        try {
          finalPos = await getAGVPosition(deviceName);
        } catch (_) {}
        const dx = finalPos.x - x;
        const dy = finalPos.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        result =
          dist <= ARRIVAL_THRESHOLD
            ? {
                state: 'success',
                msg: `Robot is at destination (distance ${dist.toFixed(2)}m). Blocking wait expired but Nav2 likely completed.`,
              }
            : {
                state: 'wait_expired',
                msg: `Blocking wait expired. Robot is ${dist.toFixed(2)}m from goal (x=${finalPos.x}, y=${finalPos.y}). Action is still EXECUTING on Nav2 — use get_agv_action_status to track progress.`,
              };
      }
      console.log('send_pose_goal_agv result:', result);
      if (result?.code) {
        if (result.code === 103) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    state: 'aborted',
                    msg: 'GoalError: error code 103 Action was aborted: obstacle o can reach the goal',
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'get_agv_action_status',
    "Get the current navigation action status for an AGV. Returns status: 'idle' | 'executing' | 'succeeded' | 'aborted' | 'canceling' | 'canceled' | 'timeout', plus target and timing.",
    {
      deviceName: z.string().describe('Device name, e.g. bcr_bot_1'),
    },
    async ({ deviceName }) => {
      const action = `/${deviceName}/navigate_to_pose`;
      const result = await apiGet('/ros/action_status', { action });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'cancel_agv_action',
    'Cancel the currently executing navigation action for an AGV. No-op if idle.',
    {
      deviceName: z.string().describe('Device name, e.g. bcr_bot_1'),
    },
    async ({ deviceName }) => {
      const action = `/${deviceName}/navigate_to_pose`;
      const result = await apiPost('/ros/action_cancel', { action });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'send_stop_agv',
    'Send a stop command to a agv,cancel moving mobile robot',
    {
      deviceName: z.string().describe('Device name to send command to'),
    },
    async ({ deviceName }) => {
      const result = await apiPost('/ros/publish', {
        topic: `/${deviceName}/goal_pose_cancel`,
        messageType: 'std_msgs/msg/Empty',
        message: {},
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    'get_agv_state',
    'Get the current position of a agv world-frame, mobile robot, get the current goal position',
    {
      deviceName: z.string().describe('Device name to get position from'),
    },
    async ({ deviceName }) => {
      const currentPosition = await getAGVPosition(deviceName);
      const currentGoal = { x: null, y: null, yaw: null };
      let msg = 'no goal yet';
      const result = {
        currentPosition: currentPosition,
        currentGoal: currentGoal,
        msg: msg,
      };
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
  server.tool(
    'get_free_position_near',
    `Find multiple free positions around a given (x, y) point that are not occupied by any robot AND are free on the occupancy map.
Generates candidate positions in a spiral grid (step 1 m) within the given radius and returns up to
'count' positions sorted by distance, where no robot is within 1.5 m and the map cell is FREE.
The first result is the requested point itself if it is free. Use this to compute staging or waiting
positions for robots — having multiple options lets the caller place several objects without conflicts.`,
    {
      x: z.number().describe('Center X coordinate to search around'),
      y: z.number().describe('Center Y coordinate to search around'),
      radius: z.number().min(1).max(20).default(5).describe('Search radius in metres (default 5)'),
      namespace: z
        .string()
        .default('bcr_bot_1')
        .describe("ROS namespace for map_server (e.g. 'bcr_bot_1')"),
      count: z
        .number()
        .int()
        .min(1)
        .max(10)
        .default(3)
        .describe('Number of free positions to return (default 3)'),
    },
    async ({ x, y, radius, namespace, count }) => {
      const GRID_STEP = 1.0;
      const robots = await getRobotPositions();

      const candidates: { x: number; y: number; dist: number }[] = [];
      for (let ring = 0; ring * GRID_STEP <= radius; ring++) {
        const r = ring * GRID_STEP;
        if (ring === 0) {
          candidates.push({ x, y, dist: 0 });
          continue;
        }
        const steps = Math.ceil((2 * Math.PI * r) / GRID_STEP);
        for (let s = 0; s < steps; s++) {
          const angle = (2 * Math.PI * s) / steps;
          const cx = parseFloat((x + r * Math.cos(angle)).toFixed(2));
          const cy = parseFloat((y + r * Math.sin(angle)).toFixed(2));
          candidates.push({ x: cx, y: cy, dist: parseFloat(r.toFixed(2)) });
        }
      }

      candidates.sort((a, b) => a.dist - b.dist);

      const freePositions: { x: number; y: number; distFromCenter: number; mapChecked: boolean }[] =
        [];

      for (const c of candidates) {
        if (freePositions.length >= count) break;
        if (isPositionOccupied(c.x, c.y, robots)) continue;

        let mapChecked = false;
        try {
          const { grid, visual } = await checkMapGrid(c.x, c.y, namespace, 1.0);
          console.log(visual);
          const centerCell = grid[1][1];
          if (centerCell.status !== 'FREE') continue;
          mapChecked = true;
        } catch {
          // map unavailable — accept robot-free position
        }

        freePositions.push({ x: c.x, y: c.y, distFromCenter: c.dist, mapChecked });
      }

      if (freePositions.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { found: false, msg: `No free position found within ${radius} m of (${x}, ${y})` },
                null,
                2
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { found: true, positions: freePositions, total: freePositions.length },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    'pickup_object_agv',
    `Pick up an object using the AGV's manipulator.
     Call this after the robot is in final approach position or  in a supplied location or near a object that can be picked up. Ensure the object is within reach , on failure check the robot's position because it may be too far from the object or the object may be out of reach, analize the position and the object location and try again, if the problem persist check the robot's manipulator and the object for any issues.`,
    {
      deviceName: z.string().describe('Device name to control for pickup'),
    },
    async ({ deviceName }) => {
      try {
        const result = await apiPost(
          `/ros/service_call`,
          {
            service: `/${deviceName}/pickup`,
            messageType: 'std_srvs/srv/Trigger',
            message: {},
          },
          15000
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        if (error.response?.status === 500) {
          throw new Error(
            `Server error: ${error.response?.data?.message || error.response?.data?.error || 'Internal server error occurred'}`
          );
        }
        // Re-throw other errors
        throw error;
      }
    }
  );

  server.tool(
    'drop_object_agv',
    "Drop/release the currently held object using the AGV's manipulator. Call this after the robot has navigated to the delivery destination. on failure check the robot's position because it may be too far from the object or the object may be out of reach, analize the position and the object location and try again, if the problem persist check the robot's manipulator and the object for any issues.",
    {
      deviceName: z.string().describe('Device name to control for drop'),
    },
    async ({ deviceName }) => {
      try {
        const result = await apiPost(
          `/ros/service_call`,
          {
            service: `/${deviceName}/drop`,
            messageType: 'std_srvs/srv/Trigger',
            message: {},
          },
          15000
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        if (error.response?.status === 500) {
          throw new Error(
            `Server error: ${error.response?.data?.message || error.response?.data?.error || 'Internal server error occurred'}`
          );
        }
        // Re-throw other errors
        throw error;
      }
    }
  );

  server.tool(
    'wait_seconds',
    'Pause execution for a specified number of seconds. Use this when you need to wait between actions, e.g. after sending a command and before checking its result.',
    {
      seconds: z.number().min(1).max(300).describe('Number of seconds to wait (0.1–300)'),
    },
    async ({ seconds }) => {
      await new Promise(resolve => setTimeout(resolve, seconds * 1000));
      return {
        content: [{ type: 'text', text: `Waited ${seconds}s.` }],
      };
    }
  );

  server.tool(
    'move_relative_robot_frame',
    `Move an AGV by a displacement expressed in the robot's own frame, then set a desired world-frame yaw at the goal.
Internally reads the robot's current pose, applies the robot→world rotation, and sends the resulting world-frame goal — the LLM never needs to do trigonometry.

Parameters (all distances in metres, angles in degrees):
- fwd:  displacement along the robot's forward axis (positive = forward, negative = backward)
- lat:  displacement along the robot's lateral axis (positive = left, negative = right)
- yaw_world: desired heading at the goal in world-frame degrees (same convention as send_pose_goal_agv)
- blocking: wait for Nav2 to finish before returning (default true)

Returns: { goal_x, goal_y, yaw_world, state, msg } — goal_x/goal_y are the computed world coordinates for debugging.`,
    {
      deviceName: z.string().describe('Device name, e.g. bcr_bot_1'),
      fwd: z.number().describe('Forward displacement in robot frame (metres). Positive = forward.'),
      lat: z.number().describe('Lateral displacement in robot frame (metres). Positive = left.'),
      yaw_world: z
        .number()
        .describe('Desired heading at goal in world-frame degrees (same as send_pose_goal_agv yaw).'),
      blocking: z
        .boolean()
        .optional()
        .default(true)
        .describe('Wait for navigation to finish before returning (default true).'),
    },
    async ({ deviceName, fwd, lat, yaw_world, blocking = true }) => {
      const pose = await getAGVPosition(deviceName);
      const yawRad = (pose.yaw * Math.PI) / 180;

      const goal_x = parseFloat(
        (pose.x + fwd * Math.cos(yawRad) - lat * Math.sin(yawRad)).toFixed(3)
      );
      const goal_y = parseFloat(
        (pose.y + fwd * Math.sin(yawRad) + lat * Math.cos(yawRad)).toFixed(3)
      );

      const yawRad_goal = (yaw_world * Math.PI) / 180;
      const qz = Math.sin(yawRad_goal / 2);
      const qw = Math.cos(yawRad_goal / 2);

      const NAV_TIMEOUT_MS = blocking ? 180_000 : 5_000;
      const ARRIVAL_THRESHOLD = 0.5;

      let result: any;
      try {
        result = await apiPost(
          '/ros/action_send_goal',
          {
            action: `/${deviceName}/navigate_to_pose`,
            actionType: 'nav2_msgs/action/NavigateToPose',
            timeout: 120_000,
            blocking,
            target: { x: goal_x, y: goal_y, yaw: yaw_world },
            message: {
              pose: {
                header: { frame_id: 'map' },
                pose: {
                  position: { x: goal_x, y: goal_y, z: 0.0 },
                  orientation: { x: 0.0, y: 0.0, z: qz, w: qw },
                },
              },
              behavior_tree: '',
            },
          },
          NAV_TIMEOUT_MS
        );
      } catch (err: any) {
        const isTimeout =
          err.code === 'ECONNABORTED' ||
          err.message?.includes('timeout') ||
          err.message?.includes('Timeout');

        if (!isTimeout || !blocking) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    goal_x,
                    goal_y,
                    yaw_world,
                    state: 'error',
                    msg: `API error: ${err.response?.data?.error ?? err.message}`,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        let finalPos = { x: 0, y: 0, yaw: 0 };
        try {
          finalPos = await getAGVPosition(deviceName);
        } catch (_) {}
        const dx = finalPos.x - goal_x;
        const dy = finalPos.y - goal_y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        result =
          dist <= ARRIVAL_THRESHOLD
            ? {
                state: 'success',
                msg: `Robot is at destination (distance ${dist.toFixed(2)}m). Blocking wait expired but Nav2 likely completed.`,
              }
            : {
                state: 'wait_expired',
                msg: `Blocking wait expired. Robot is ${dist.toFixed(2)}m from goal (x=${finalPos.x}, y=${finalPos.y}). Action still EXECUTING — use get_agv_action_status to track.`,
              };
      }

      if (result?.code === 103) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  goal_x,
                  goal_y,
                  yaw_world,
                  state: 'aborted',
                  msg: 'GoalError: code 103 — action aborted, obstacle or unreachable goal',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ goal_x, goal_y, yaw_world, ...result }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    'get_agv_lidar',
    `Call this to get a LIDAR distance scan for a specific robot. The response includes distances indexed by angle.
    **Frame convention**: all angles are in **robot-frame** (0° = forward, 90° = left, 180°/−180° = rear, 270°/−90° = right — counter-clockwise positive). Raw readings are NOT world coordinates.
    Use it:
    - Before any pickup or proximity approach to confirm the path is clear
    - When the camera detects an object and you need to confirm distance and bearing
    - To verify a sector is free before moving`,
    {
      deviceName: z.string().describe('Device name to get lidar data from'),
    },
    async ({ deviceName }) => {
      const result = await apiGet(
        '/ros/subscribe_once',
        {
          topic: `/${deviceName}/scan`,
        },
        15000
      );
      console.log('get_agv_lidar result:', result);
      const msg = parseLidarScan(result);
      console.log('Parsed Lidar Scan:', msg);
      return {
        content: [
          {
            type: 'text',
            text: msg,
          },
        ],
      };
    }
  );
}
