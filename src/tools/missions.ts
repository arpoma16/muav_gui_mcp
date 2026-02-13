import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiGet, apiPost } from '../utils.js';
import { MissionSchema, MissionSchemaXYZ, filteredMissionSchema, validateMissionSchema } from '../schemas/missions.js';
import { ValidateCollisionsInputSchema, ResolveCollisionsInputSchema } from '../schemas/collision.js';
import { encode } from '@toon-format/toon';
export function registerMissionTools(server: McpServer) {
  console.log('[MISSIONS] Registering mission tools...');

  // server.tool('get_missions', 'get list of missions registered in the platform', {}, async () => {
  //   console.log('[GET_MISSIONS] Tool called');
  //   const result = await apiGet('/missions');
  //   return {
  //     content: [
  //       {
  //         type: 'text',
  //         text: JSON.stringify(result, null, 2),
  //       },
  //     ],
  //   };
  // });

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

  // server.tool(
  //   'send_to_verification_chat',
  //   `Only use if you have a mission plan with waypoints in  XYZ coordinates (meters).`,
  //   validateMissionSchema,
  //   async (args) => {
  //     console.log('[send_to_verification_chat] Tool called with args:', args);
  //     const result = await apiPost('/chat/verification_mission', { ...args });
  //     return {
  //       content: [
  //         {
  //           type: 'text',
  //           text: JSON.stringify(result, null, 2),
  //         },
  //       ],
  //     };
  //   }
  // );

  server.tool(
    'Show_mission_xyz_to_user',
    `Only use if you have amission plan with waypoints in  XYZ coordinates (meters).
     Routes should never be separated into different missions. 


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
    { missionDataXYZ: MissionSchemaXYZ.describe('Complete Mission data structure') },
    async (args) => {
      try {
        const { missionDataXYZ } = args;
        const result = await apiPost('/missions/showXYZ', missionDataXYZ);
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

        const result = await apiPost('/missions/', missionData);

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

  // ============================================================================
  // Collision Detection Tools
  // ============================================================================

  server.tool(
    'validate_mission_collisions',
    `Validate a mission for collisions against obstacles WITHOUT modifying it.
    Use only for xyz missions.
    Routes should never be separated into different tool requests.

    IMPORTANT: All input data (names, descriptions, notes, metadata) MUST be provided in English.

    Use this tool to check if a mission's routes will collide with any obstacles in the environment.
    Returns detailed collision and warning information for each route.

    The validation checks:
    - Waypoint positions against obstacle exclusion and caution zones
    - Flight segments between consecutive waypoints for intersections

    Zone types:
    - exclusion_zone: Hard constraint, collision detected (mission invalid)
    - caution_zone: Soft constraint, warning only (mission still valid)

    Obstacle format example:
    {
      "name": "turbine_1",
      "type": "windTurbine",
      "position": {"x": 100, "y": 50, "z": 0},
      "zones": {
        "exclusion_zone": "cylinder: radius=15m, height=120m",
        "caution_zone": "cylinder: radius=25m, height=130m",
        "safe_zone": "beyond 30m radius"
      },
      "aabb": {
        "min_point": {"x": 85, "y": 35, "z": 0},
        "max_point": {"x": 115, "y": 65, "z": 120}
      }
    }`,
    ValidateCollisionsInputSchema,
    async (args) => {
      console.log('[VALIDATE_COLLISIONS] Tool called');
      try {
        const { mission, collision_objects } = args;
        const result = await apiPost('/missions/validate', { mission, collision_objects });
        console.log('[VALIDATE_COLLISIONS] API returned, preparing response...');
        const response = {
          content: [
            {
              type: 'text',
              text: encode(result),
            },
          ],
        };
        console.log('[VALIDATE_COLLISIONS] Returning response to MCP');
        return response;
      } catch (error: any) {
        console.error('[VALIDATE_COLLISIONS] Error:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error validating mission collisions: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // server.tool(
  //   'resolve_mission_collisions',
  //   `Validate a mission for collisions and AUTOMATICALLY RESOLVE them with detours.

  //   Use this tool when you have a mission with potential collisions and want the system
  //   to automatically generate safe detours around obstacles.

  //   The resolution process:
  //   1. First validates the mission against obstacles
  //   2. If collisions are found, generates detour waypoints to avoid obstacles
  //   3. Returns the modified mission with safe flight paths

  //   The tool returns:
  //   - modified: boolean indicating if the mission was changed
  //   - detoursApplied: number of detour maneuvers added
  //   - mission: the corrected mission (or original if no collisions)
  //   - report: human-readable summary of changes made
  //   - validation: final validation result after corrections

  //   Obstacle format example:
  //   {
  //     "name": "building_A",
  //     "type": "building",
  //     "position": {"x": 200, "y": 100, "z": 0},
  //     "zones": {
  //       "exclusion_zone": "cylinder: radius=20m, height=50m",
  //       "caution_zone": "cylinder: radius=30m, height=55m",
  //       "safe_zone": "beyond 35m radius"
  //     },
  //     "safe_passages": ["fly over at 60m altitude", "approach from east"],
  //     "aabb": {
  //       "min_point": {"x": 180, "y": 80, "z": 0},
  //       "max_point": {"x": 220, "y": 120, "z": 50}
  //     }
  //   }`,
  //   ResolveCollisionsInputSchema,
  //   async (args) => {
  //     console.log('[RESOLVE_COLLISIONS] Tool called');
  //     try {
  //       const { mission, obstacles } = args;
  //       const result = await apiPost('/missions/resolve', { mission, obstacles });
  //       return {
  //         content: [
  //           {
  //             type: 'text',
  //             text: JSON.stringify(result, null, 2),
  //           },
  //         ],
  //       };
  //     } catch (error: any) {
  //       console.error('[RESOLVE_COLLISIONS] Error:', error);
  //       return {
  //         content: [
  //           {
  //             type: 'text',
  //             text: `Error resolving mission collisions: ${error.message}`,
  //           },
  //         ],
  //         isError: true,
  //       };
  //     }
  //   }
  // );

  console.log('[MISSIONS] Registered collision detection tools');
  console.log('[MISSIONS] All mission tools registered successfully');
}
