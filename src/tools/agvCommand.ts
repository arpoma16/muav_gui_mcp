import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet, apiPost } from "../utils.js";


async function getAGVPosition(deviceName: string) {
  const result = await apiGet("/ros/subscribe_once", {
    topic: `/${deviceName}/odom`,
  });
  console.log("getAGVPosition result:", result);
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

interface LaserScan {
  angle_min: number;
  angle_max: number;
  angle_increment: number;
  range_min: number;
  range_max: number;
  ranges: number[];
}

function parseLidarScan(msg: LaserScan): string {
  const { ranges, angle_min, angle_increment, range_min, range_max } = msg;
  const n = ranges.length;
  const OBSTACLE_THRESH = 2.0;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const isValid = (r: number) => isFinite(r) && r >= range_min;

  function sectorStats(degMin: number, degMax: number): [number | null, number | null] {
    const i0 = Math.max(0, Math.round((toRad(degMin) - angle_min) / angle_increment));
    const i1 = Math.min(n - 1, Math.round((toRad(degMax) - angle_min) / angle_increment));
    const valid = ranges.slice(i0, i1 + 1).filter(isValid);
    if (valid.length === 0) return [null, null];
    const min = Math.min(...valid);
    const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
    return [min, mean];
  }

  function findClusters(thresh = 6.0) {
    const clusters: { dist: number; angle: number; approxWidth: number }[] = [];
    let inCluster = false;
    let indices: number[] = [];

    const flush = () => {
      if (inCluster && indices.length >= 3) {
        const dists = indices.map((i) => ranges[i]);
        const minDist = Math.min(...dists);
        const centerI = indices[dists.indexOf(minDist)];
        const angleDeg = toDeg(angle_min + centerI * angle_increment);
        const approxWidth = parseFloat((minDist * indices.length * angle_increment).toFixed(2));
        clusters.push({ dist: parseFloat(minDist.toFixed(2)), angle: parseFloat(angleDeg.toFixed(1)), approxWidth });
      }
      inCluster = false;
      indices = [];
    };

    for (let i = 0; i < n; i++) {
      const r = ranges[i];
      if (isValid(r) && r <= thresh) {
        inCluster = true;
        indices.push(i);
      } else {
        flush();
      }
    }
    flush();
    return clusters;
  }

  // ROS angle convention: 0°=front, positive=left (CCW), negative=right (CW)
  const sectors: Record<string, [number, number]> = {
    Front: [-45,  45],
    Left:  [ 45, 135],
    Rear:  [135, 225],
    Right: [225, 315],
  };

  const sectorRange: Record<string, string> = {
    Front: '-45°..+45°  ',
    Left:  '+45°..+135° ',
    Rear:  '+135°..+225°',
    Right: '-135°..-45° ',
  };

  function sectorDetails(degMin: number, degMax: number) {
    const i0 = Math.max(0, Math.round((toRad(degMin) - angle_min) / angle_increment));
    const i1 = Math.min(n - 1, Math.round((toRad(degMax) - angle_min) / angle_increment));
    const validIndices = ranges.slice(i0, i1 + 1).reduce<number[]>((acc, r, j) => {
      if (isValid(r)) acc.push(i0 + j);
      return acc;
    }, []);
    if (validIndices.length === 0) return { min: null as number | null, mean: null as number | null, bearings: [] as number[] };
    const dists = validIndices.map(i => ranges[i]);
    const min = Math.min(...dists);
    const mean = dists.reduce((a, b) => a + b, 0) / dists.length;
    const bearings = validIndices
      .filter(i => ranges[i] < OBSTACLE_THRESH)
      .map(i => parseFloat(toDeg(angle_min + i * angle_increment).toFixed(1)));
    return { min, mean, bearings };
  }

  const lines: string[] = [];
  lines.push(`LIDAR scan — robot-frame (0°=forward, CCW positive), range ${range_max.toFixed(0)}m`);
  lines.push('');

  for (const [label, [dMin, dMax]] of Object.entries(sectors)) {
    const { min, mean, bearings } = sectorDetails(dMin, dMax);
    const rangeStr = sectorRange[label];
    if (min === null) {
      lines.push(`  ${label.padEnd(5)} [${rangeStr}]: open (>${range_max.toFixed(0)}m)`);
    } else if (min < OBSTACLE_THRESH) {
      const bearStr = bearings.length > 0 ? ` — bearing: ${bearings.join('°, ')}°` : '';
      lines.push(`  ${label.padEnd(5)} [${rangeStr}]: OBSTACLE ${min.toFixed(2)}m (mean ${mean!.toFixed(1)}m)${bearStr}`);
    } else {
      lines.push(`  ${label.padEnd(5)} [${rangeStr}]: clear, nearest ${min.toFixed(1)}m`);
    }
  }

  function angleToPaddedSector(angleDeg: number): string {
    const a = ((angleDeg % 360) + 360) % 360;
    if (a <= 45 || a >= 315) return 'Front';
    if (a > 45  && a <= 135) return 'Left';
    if (a > 135 && a <= 225) return 'Rear';
    return 'Right';
  }

  const clusters = findClusters(6.0).sort((a, b) => a.dist - b.dist);
  lines.push('');
  if (clusters.length > 0) {
    lines.push('Detected objects (robot-frame):');
    for (const c of clusters) {
      lines.push(`  - ${c.dist}m at ${c.angle}° → ${angleToPaddedSector(c.angle)} sector (~${c.approxWidth}m wide)`);
    }
  } else {
    lines.push('No significant objects detected nearby.');
  }

  const validAll = ranges.filter(isValid);
  if (validAll.length > 0) {
    const nearest = Math.min(...validAll);
    const nearestI = ranges.indexOf(nearest);
    const nearestDeg = toDeg(angle_min + nearestI * angle_increment).toFixed(1);
    lines.push('');
    lines.push(`Nearest point: ${nearest.toFixed(2)}m at ${nearestDeg}° (robot-frame)`);
  }

  return lines.join('\n');
}

export function registerAGVCommandTools(server: McpServer) {
  server.tool(
    "send_pose_goal_agv",
    "Send a agv, mobile robot, to a specific pose goal",
    {
      deviceName: z.string().describe("Device name to send command to"),
      x: z.number().describe("X coordinate of the pose goal"),
      y: z.number().describe("Y coordinate of the pose goal"),
      yaw: z.number().describe("Rotation angle around Z axis in degrees (yaw)"),
    },
    async ({ deviceName, x, y, yaw }) => {
      // Convert yaw angle to quaternion
      yaw = (yaw * Math.PI) / 180; // Convert degrees to radians
      const qz = Math.sin(yaw / 2);
      const qw = Math.cos(yaw / 2);

      const result = await apiPost("/ros/action_send_goal", {
        action: `/${deviceName}/navigate_to_pose`,
        actionType: "nav2_msgs/action/NavigateToPose",
        message: {
          pose: {
            header: {
              frame_id: "map",
            },
            pose: {
              position: {
                x: x,
                y: y,
                z: 0.0,
              },
              orientation: {
                x: 0.0,
                y: 0.0,
                z: qz,
                w: qw,
              },
            },
          },
          behavior_tree: "",
        },
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
  server.tool(
    "send_stop_agv",
    "Send a stop command to a agv,cancel moving mobile robot",
    {
      deviceName: z.string().describe("Device name to send command to"),
    },
    async ({ deviceName }) => {
      const result = await apiPost("/ros/publish", {
        topic: `/${deviceName}/goal_pose_cancel`,
        messageType: "std_msgs/msg/Empty",
        message: {},
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "get_agv_state",
    "Get the current position of a agv world-frame, mobile robot, get the current goal position",
    {
      deviceName: z.string().describe("Device name to get position from"),
    },
    async ({ deviceName }) => {
      const currentPosition = await getAGVPosition(deviceName);
      const currentGoal = { x: null, y: null, yaw: null };
      let msg = "no goal yet";      
      const result = {
        currentPosition: currentPosition,
        currentGoal: currentGoal,
        msg: msg,
      };
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
  server.tool(
    "get_agv_lidar",
    `Call this to get a LIDAR distance scan for a specific robot. The response includes distances indexed by angle.
    **Frame convention**: all angles are in **robot-frame** (0° = forward, 90° = left, 180°/−180° = rear, 270°/−90° = right — counter-clockwise positive). Raw readings are NOT world coordinates.
    Use it:
    - Before any pickup or proximity approach to confirm the path is clear
    - When the camera detects an object and you need to confirm distance and bearing
    - To verify a sector is free before moving`,
    {
      deviceName: z.string().describe("Device name to get lidar data from"),
    },
    async ({ deviceName }) => {
      const result = await apiGet("/ros/subscribe_once", {
        topic: `/${deviceName}/scan`,
      }, 15000);
      console.log("get_agv_lidar result:", result);
      const msg = parseLidarScan(result);
      console.log("Parsed Lidar Scan:", msg);
      return {
        content: [
          {
            type: "text",
            text: msg,
          },
        ],
      };
    }
  );
}
