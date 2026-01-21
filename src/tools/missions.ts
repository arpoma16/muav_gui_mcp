import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiGet, apiPost } from '../utils.js';
import { MissionSchema, MissionSchemaXYZ, filteredMissionSchema } from '../schemas/missions.js';

export function registerMissionTools(server: McpServer) {
  console.log('[MISSIONS] Registering mission tools...');

  server.tool('get_missions', 'get list of missions registered in the platform', {}, async () => {
    console.log('[GET_MISSIONS] Tool called');
    const result = await apiGet('/missions');
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  });

  console.log('[MISSIONS] Registered get_missions tool');

  server.tool(
    'create_mission',
    'Builds a UAV mission based on user requirements and context information.',
    filteredMissionSchema,
    async (args) => {
      console.log('[CREATE_MISSION_PLAN] Tool called with args:', args);
      const result = await apiPost('/chat/build_mission_plan_xyz', { ...args });
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
    'mission_xyz',
    `mission plan with XYZ coordinates (meters) for waypoints. Dont use at least the system specifies otherwise.
      A mission consists of:
      - version: mission format version (typically "3")
      - name: mission name (can be a short description of the mission)
      - description: detailed mission description
      - route: array of routes, where each route contains:
        * name: route name (can be a short description of the route)
        * uav: UAV identifier (e.g., px4_3)
        * id: route number (starting from 0)
        * attributes: flight parameters (max_vel, idle_vel, mode_yaw, mode_gimbal, mode_trace, mode_landing)
        * wp: waypoints array with pos [x,y,z] in meters and action objects
        * uav_type: UAV type (e.g., px4_ros2, px4_sitl)

      Example mission with 2 waypoints:
      {
        "version": "3",
        "name": "Test mission",
        "description": "This is a test mission with 2 waypoints.",
        "route": [{
          "name": "test_route",
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
            {"pos": [10, 5.5, 5], "action": {}},
            {"pos": [10, 5.5, 15], "action": {}}
          ],
          "uav_type": "px4_ros2"
        }]
      }`,
    { missionData: MissionSchemaXYZ.describe('Complete Mission data structure') },
    async (args) => {
      try {
        const { missionData } = args;
        const result = await apiPost('/chat/validate_mission_briefing', JSON.stringify(missionData));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ result }, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error('Error:', error);

        return {
          content: [
            {
              type: 'text',
              text: `Error creating mission: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'Show_mission_to_user',
    `Show and represent the mission on the platform.
      IMPORTANT: You MUST call this tool to actually show the mission to the user once created.

      A mission consists of:
      - version: mission format version (typically "3")
      - name: mission name (can be a short description of the mission)
      - description: detailed mission description
      - route: array of routes, where each route contains:
        * name: route name (can be a short description of the route)
        * uav: UAV identifier (e.g., px4_3)
        * id: route number (starting from 0)
        * attributes: flight parameters (max_vel, idle_vel, mode_yaw, mode_gimbal, mode_trace, mode_landing)
        * wp: waypoints array with pos [lat, lon, alt] and action objects
        * uav_type: UAV type (e.g., px4_ros2, px4_sitl)

      Example mission with 2 waypoints:
      {
        "version": "3",
        "name": "Test mission",
        "description": "This is a test mission with 2 waypoints.",
        "route": [{
          "name": "test_route",
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
      }
      Call this tool whenever the user requests to create, send, or execute a mission.`,
    { missionData: MissionSchema.describe('Complete Mission data structure') },
    async (args) => {
      console.log('\n\n=== CREATE_MISSION HANDLER STARTED ===');
      console.log('Raw args:', args);
      console.log('Args type:', typeof args);
      console.log('Args keys:', Object.keys(args || {}));

      try {
        const { missionData } = args;
        console.log('\n=== AFTER DESTRUCTURING ===');
        console.log('Mission data received:', JSON.stringify(missionData, null, 2));
        console.log('Type of missionData:', typeof missionData);
        console.log('=================================\n');

        const result = await apiPost('/missions/', JSON.stringify(missionData));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ result, missionData }, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error('\n\n!!! ERROR IN CREATE_MISSION !!!');
        console.error('Error:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('=================================\n');

        return {
          content: [
            {
              type: 'text',
              text: `Error creating mission: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  console.log('[MISSIONS] Registered create_mission tool');
  console.log('[MISSIONS] All mission tools registered successfully');
}
