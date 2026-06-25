import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiGet, apiPost } from '../utils.js';
import {
  MissionSchemaXYZ,
  filteredMissionSchema,
  markedStepSchema,
  completeMissionSchema,
  showMissionSchema,
} from '../schemas/missions.js';
import { ValidateCollisionsInputSchema } from '../schemas/collision.js';
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
    'mark_step_complete',
    `Mark a logical mission-planning step as completed when no physical tool call is needed.
    Advances the MISSION PLANNING STATUS to the next step.`,
    markedStepSchema,
    async args => {
      console.log('[MARK_STEP_COMPLETE] Tool called with args:', args);
      const { stepId, summary } = args;
      console.log(
        `[MARK_STEP_COMPLETE] Step ${stepId} marked as complete with summary: ${summary}`
      );
      return {
        content: [
          {
            type: 'text',
            text: `SUCCESS. Step ${stepId} marked as complete. You can now move to the next step.`,
          },
        ],
      };
    }
  );

  server.tool(
    'request_mission_plan',
    `Submit pre-collected and filtered data to the mission planner sub-agent.
    REQUIRES: target elements from get_registered_objects, drone info from get_devices/get_fleet_telemetry, and obstacle data.
    Do NOT call this tool without first gathering all required data through the appropriate tools.
    The mission planner will return a complete mission plan suitable for visualization and loading to the UAV.
    If returning "planning mission start" or similar, the planner accepted the request and is working asynchronously.
    Wait for the next response before calling this tool again.
    `,
    filteredMissionSchema,
    async args => {
      console.log('[REQUEST_MISSION_PLAN] Tool called');
      const { chat_id } = args as any;

      // Step 1: convert geodetic briefing → XYZ
      const missionDataXYZ = await apiPost('/missions/convert/geodetic-to-xyz', { ...args });

      // Step 2: build the planner prompt and launch subagent
      const userMessage = `Execute the MISSION PLANNING SEQUENCE with this data for ${missionDataXYZ.user_context?.user_request ?? 'the requested mission'} :

## global_origin_coordinates
${JSON.stringify(missionDataXYZ.global_origin)}
## Devices Information
${encode(missionDataXYZ.drone_information)}
## Elements to Inspect
${encode(missionDataXYZ.target_elements)}
## group Information
${encode(missionDataXYZ.group_information)}
## obstacles Information
${encode(missionDataXYZ.obstacle_elements)}
## Mission Requirements
${encode(missionDataXYZ.mission_requirements)}`;

      const origin = missionDataXYZ.global_origin;
      const contextInstructions = origin
        ? `- global_origin_coordinates: ${JSON.stringify(origin)} (lat, lng in decimal degrees)\n- coordinate_system: Cartesian coordinates (ENU - East/North/Up in meters)\n- yaw_reference: Angle in degrees, 0 degrees = North (+Y), 90° = East (+X), ±180° = South (-Y), -90° = West (-X). Range: [-180°, 180°]`
        : '';

      await apiPost('/chat/subagents', {
        mainChatId: chat_id,
        agentType: 'planner',
        userMessage,
        contextInstructions,
      });

      return {
        content: [{ type: 'text', text: 'Planning mission started. Wait for the planner sub-agent response.' }],
      };
    }
  );

  server.tool(
    'complete_mission',
    `Submit the mission XYZ created by the planner sub-agent.
    Requires a fully validated mission with waypoints in local XYZ coordinates (meters).`,
    completeMissionSchema,
    async args => {
      const { chat_id, missionDataXYZ, status, description } = args as any;
      const missionWithVersion = { version: '3', ...missionDataXYZ };
      console.log('[COMPLETE_MISSION] Tool called');
      try {
        // Step 1: convert XYZ → geodetic
        const missionGeodetic = await apiPost('/missions/convert/xyz-to-geodetic', missionWithVersion);

        // Step 2: persist the geodetic mission plan
        const saved = await apiPost('/missions/plans', { missionData: missionGeodetic });
        const missionPlanId = saved.id;

        // Step 3: inject result into main chat and resume it
        await apiPost(`/chat/subagents/${chat_id}/inject`, {
          toolName: 'request_mission_plan',
          status,
          description,
          payload: { missionPlanId },
        });

        return {
          content: [{ type: 'text', text: 'OK Mission received and accepted.' }],
        };
      } catch (error: any) {
        const serverMessage = error?.response?.data?.error ?? error?.message ?? 'Unknown error';
        return {
          content: [{ type: 'text', text: `ERROR submitting mission: ${serverMessage}` }],
          isError: true,
        };
      }
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
    'show_mission_xyz',
    `Display an XYZ mission plan on the platform map for user review.
    Waypoints must use local XYZ coordinates (meters). All routes belong in a single mission.`,
    {
      missionDataXYZ: MissionSchemaXYZ.describe('Complete Mission data structure'),
    },
    async args => {
      try {
        const { missionDataXYZ } = args;
        const missionWithVersion = { version: '3', ...missionDataXYZ };
        const result = await apiPost('/missions/showXYZ', missionWithVersion);
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
    'show_mission_to_user',
    `Display a GPS mission plan.
    Call this after mission creation to visualize the result.`,
    showMissionSchema,
    async args => {
      console.log('\n\n=== CREATE_MISSION HANDLER STARTED ===');
      console.log('Raw args:', args);
      console.log('Args type:', typeof args);
      console.log('Args keys:', Object.keys(args || {}));

      try {
        const { missionPlanid } = args;

        const result = await apiGet(`/missions/plans/show/${missionPlanid}`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ result, description: 'Mission showed successfully' }, null, 2),
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


  // ============================================================================
  // Collision Detection Tools
  // ============================================================================

  server.tool(
    'validate_mission_collisions',
    `Critically validates a multi-route XYZ mission against a 3D obstacle database. 
    Use this tool as a mandatory safety check before finalizing any flight plan.
    
    The tool detects:
    1. HARD COLLISIONS: Physical intersections with obstacles (includes obstacle name, exact XYZ coordinates, and penetration depth in meters).
    2. PROXIMITY WARNINGS: Safety buffer breaches.
    
    Input: Must contain all mission routes in a single batch.
    Output: A detailed diagnostic report. If 'isError' is true, the mission MUST be rejected or recalculated based on the specific failing segments provided.`,
    ValidateCollisionsInputSchema,
    async args => {
      console.log('[VALIDATE_COLLISIONS] Tool called');
      try {
        const { mission, collision_objects } = args;
        const result = await apiPost('/missions/validate', {
          mission,
          collision_objects,
        });
        console.log('[VALIDATE_COLLISIONS] API returned, preparing response...');
        const statusPrefix = result.valid
          ? '✅ MISSION VALID: No collisions detected.\n'
          : '❌ MISSION INVALID: Collisions detected. See details below:\n';

        let response = {
          valid: result.valid,
          collisions: result.totalCollisions,
          report: statusPrefix + result.report,
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
        };
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
