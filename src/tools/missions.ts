import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, apiPost } from "../utils.js";
import {
  MissionSchema,
  MissionSchemaXYZ,
  filteredMissionSchema,
  markedStepSchema,
} from "../schemas/missions.js";
import {
  ValidateCollisionsInputSchema,
  ResolveCollisionsInputSchema,
} from "../schemas/collision.js";
import { encode } from "@toon-format/toon";
export function registerMissionTools(server: McpServer) {
  console.log("[MISSIONS] Registering mission tools...");

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
    "mark_step_complete",
    `Mark a logical mission-planning step as completed when no physical tool call is needed.
    Advances the MISSION PLANNING STATUS to the next step.`,
    markedStepSchema,
    async (args) => {
      console.log("[MARK_STEP_COMPLETE] Tool called with args:", args);
      const { stepId, summary } = args;
      console.log(
        `[MARK_STEP_COMPLETE] Step ${stepId} marked as complete with summary: ${summary}`,
      );
      return {
        content: [
          {
            type: "text",
            text: `SUCCESS. Step ${stepId} marked as complete. You can now move to the next step.`,
          },
        ],
      };
    },
  );

  server.tool(
    "request_mission_plan",
    `Submit pre-collected and filtered data to the mission planner sub-agent.
    REQUIRES: target elements from get_registered_objects, drone info from get_devices/get_fleet_telemetry, and obstacle data.
    Do NOT call this tool without first gathering all required data through the appropriate tools.
    Returns a mission plan in local XYZ coordinates.`,
    filteredMissionSchema,
    async (args) => {
      console.log("[CREATE_MISSION_PLAN] Tool called with args:", args);
      const result = await apiPost("/chat/build_mission_plan_xyz", { ...args });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  server.tool(
    "complete_mission",
    `Submit the final XYZ mission plan after all planning steps are completed.
    Requires a fully validated mission with waypoints in local XYZ coordinates (meters).`,
    {
      missionDataXYZ: MissionSchemaXYZ.describe(
        "Complete Mission data structure",
      ),
    },
    async (args) => {
      const { missionDataXYZ } = args;
      const missionWithVersion = { version: "3", ...missionDataXYZ };
      console.log("[RETURN_MISSION_PLAN] Tool called with args:", args);
      const result = await apiPost("/chat/return_mission_plan_xyz", {
        missionDataXYZ: missionWithVersion,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
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
    "show_mission_xyz",
    `Display an XYZ mission plan on the platform map for user review.
    Waypoints must use local XYZ coordinates (meters). All routes belong in a single mission.`,
    {
      missionDataXYZ: MissionSchemaXYZ.describe(
        "Complete Mission data structure",
      ),
    },
    async (args) => {
      try {
        const { missionDataXYZ } = args;
        const missionWithVersion = { version: "3", ...missionDataXYZ };
        const result = await apiPost("/missions/showXYZ", missionWithVersion);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ result }, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error("Error:", error);

        return {
          content: [
            {
              type: "text",
              text: `Error creating mission: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "show_mission",
    `Display a GPS mission plan on the platform map for user review.
    Waypoints must use global coordinates [lat, lon, alt].
    Call this after mission creation to visualize the result.`,
    { missionData: MissionSchema.describe("Complete Mission data structure") },
    async (args) => {
      console.log("\n\n=== CREATE_MISSION HANDLER STARTED ===");
      console.log("Raw args:", args);
      console.log("Args type:", typeof args);
      console.log("Args keys:", Object.keys(args || {}));

      try {
        const { missionData } = args;
        const missionWithVersion = { version: "3", ...missionData };
        console.log("\n=== AFTER DESTRUCTURING ===");
        console.log(
          "Mission data received:",
          JSON.stringify(missionWithVersion, null, 2),
        );
        console.log("Type of missionData:", typeof missionData);
        console.log("=================================\n");

        const result = await apiPost("/missions/", missionWithVersion);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ result, missionData }, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error("\n\n!!! ERROR IN CREATE_MISSION !!!");
        console.error("Error:", error);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        console.error("=================================\n");

        return {
          content: [
            {
              type: "text",
              text: `Error creating mission: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  console.log("[MISSIONS] Registered request_mission_plan tool");

  // ============================================================================
  // Collision Detection Tools
  // ============================================================================

  server.tool(
    "validate_mission_collisions",
    `Check an XYZ mission for collisions against obstacles without modifying it.
    Send all routes in a single call. All input data must be in English.

    Returns per-route collision and warning details:
    - exclusion_zone hit → collision (mission invalid)
    - caution_zone hit → warning only (mission still valid)

    Checks waypoint positions and flight segments between consecutive waypoints.`,
    ValidateCollisionsInputSchema,
    async (args) => {
      console.log("[VALIDATE_COLLISIONS] Tool called");
      try {
        const { mission, collision_objects } = args;
        const result = await apiPost("/missions/validate", {
          mission,
          collision_objects,
        });
        console.log(
          "[VALIDATE_COLLISIONS] API returned, preparing response...",
        );
        const statusPrefix = result.valid
          ? "✅ MISSION VALID: No collisions detected.\n"
          : "❌ MISSION INVALID: Collisions detected. See details below:\n";

        if (result.valid) {
          return {
            content: [
              {
                type: "text",
                text: statusPrefix + result.report,
              },
            ],
          };
        }
        return {
          content: [{ type: "text", text: statusPrefix + result.report }],
          error: {
            type: "MISSION_VALIDATION_ERROR",
            message: "Collisions detected"  
          },
        };
      } catch (error: any) {
        console.error("[VALIDATE_COLLISIONS] Error:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error validating mission collisions: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    },
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

  console.log("[MISSIONS] Registered collision detection tools");
  console.log("[MISSIONS] All mission tools registered successfully");
}
