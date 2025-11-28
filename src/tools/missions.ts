import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet, apiPost } from "../utils.js";
import { MissionSchema } from "../schemas/missions.js";

export function registerMissionTools(server: McpServer) {
  server.tool(
    "get_missions",
    "get list of missions registered in the platform",
    {}, 
    async () => {
      const result = await apiGet("/missions");
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
    "create_mission",
    `Create a new UAV mission in the platform.
    A mission consists of:
    - version: mission format version (typically "3")
    - name: mission identifier
    - route: array of routes, where each route contains:
      * name: route name (can be empty)
      * uav: UAV identifier (e.g., px4_3)
      * id: route number (starting from 0)
      * attributes: flight parameters (max_vel, idle_vel, mode_yaw, mode_gimbal, mode_trace, mode_landing)
      * wp: waypoints array with pos [lat, lon, alt] and action objects
      * uav_type: UAV type (e.g., px4_ros2)

    Example mission with 2 waypoints:
    {
      "version": "3",
      "name": "test_mission",
      "route": [{
        "name": "",
        "uav": "px4_3",
        "id": 0,
        "attributes": {
          "max_vel": 12,
          "idle_vel": 3,
          "mode_yaw": 2,
          "mode_gimbal": 0,
          "mode_trace": 0,
          "mode_landing": 2
        },
        "wp": [
          {"pos": [47.3978, 8.5461, 5], "action": {}},
          {"pos": [47.3979, 8.5463, 5], "action": {}}
        ],
        "uav_type": "px4_ros2"
      }]
    }`,
    {missionData: MissionSchema.describe("Complete mission data structure")},
    async (missionData) => {
      const result = await apiPost("/missions", missionData);
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
