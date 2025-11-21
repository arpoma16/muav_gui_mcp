import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet, apiPost } from "../utils.js";


async function getAGVPosition(deviceName: string) {
  const result = await apiGet("/ros/subscribe_once", {
    topic: "/bcr_bot/odom",
  });
  console.log("getAGVPosition result:", result);
  const msgPosition = { x: 0, y: 0, yaw: 0 };
  console.log(result);
  if (result?.pose?.pose) {
    msgPosition.x = result.pose.pose.position.x;
    msgPosition.y = result.pose.pose.position.y;
    const orientation = result.pose.pose.orientation;
    const yaw = Math.atan2(
      2.0 * (orientation.w * orientation.z),
      1.0 - 2.0 * (orientation.z * orientation.z)
    );
    msgPosition.yaw = (yaw * 180) / Math.PI; // Convert radians to degrees
  }
  return msgPosition;
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
        action: "navigate_to_pose",
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
        topic: "/bcr_bot/goal_pose_cancel",
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
    "Get the current position of a agv, mobile robot, get the current goal position",
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
}
