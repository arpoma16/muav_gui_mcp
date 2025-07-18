import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import axios from "axios";
import { config } from "./config";
import de from "zod/v4/locales/de.cjs";

// Helper to call the multiuav_gui API
async function apiPost(path: string, data: any) {
  const res = await axios.post(`${config.BASE_URL}${path}`, data, {
    timeout: config.REQUEST_TIMEOUT,
    headers: config.API_TOKEN ? { Authorization: config.API_TOKEN } : {},
  });
  return res.data;
}

async function apiGet(path: string, params: any = {}) {
  const res = await axios.get(`${config.BASE_URL}${path}`, {
    params,
    timeout: config.REQUEST_TIMEOUT,
    headers: config.API_TOKEN ? { Authorization: config.API_TOKEN } : {},
  });
  return res.data;
}

export function registerTools(server: McpServer) {
  //  // Tool: Send Command to Device
  //  server.registerTool(
  //    "send_command",
  //    {
  //      title: "Send Command",
  //      description: "Send a command to a UAV device",
  //      inputSchema: {
  //        deviceId: z.number(),
  //        type: z.string(),
  //        attributes: z.any(),
  //      },
  //    },
  //    async ({ deviceId, type, attributes }) => {
  //      const result = await apiPost("/comands/send", {
  //        deviceId,
  //        type,
  //        attributes,
  //      });
  //      return {
  //        content: [
  //          {
  //            type: "text",
  //            text: JSON.stringify(result, null, 2),
  //          },
  //        ],
  //      };
  //    }
  //  );

  //  // Tool: Load Mission
  //  server.registerTool(
  //    "load_mission",
  //    {
  //      title: "Load Mission",
  //      description: "Load a mission to UAV devices",
  //      inputSchema: z.object({
  //        deviceId: z
  //          .number()
  //          .min(-1)
  //          .description("Device ID or -1 for all devices"),
  //        routes: z
  //          .array(
  //            z.object({
  //              // Define the structure of each route here
  //              id: z.string().description("Route ID"),
  //              waypoints: z
  //                .array(
  //                  z.object({
  //                    lat: z.number().description("Latitude"),
  //                    lng: z.number().description("Longitude"),
  //                    alt: z.number().description("Altitude"),
  //                  })
  //                )
  //                .description("Array of waypoints"),
  //            })
  //          )
  //          .description("Array of routes for the mission"),
  //      }),
  //    },
  //    async ({ deviceId, routes }) => {
  //      const result = await apiPost("/comands/send", {
  //        deviceId,
  //        type: "loadMission",
  //        attributes: routes,
  //      });
  //      return {
  //        content: [
  //          {
  //            type: "text",
  //            text: JSON.stringify(result, null, 2),
  //          },
  //        ],
  //      };
  //    }
  //  );

  //Tool: Start Mission
  server.tool(
    "start_mission",
    "send command start mission to UAV devices",
    {
      deviceId: z.number().describe("Device ID or -1 for all devices"),
    },
    async ({ deviceId }) => {
      const result = await apiPost("/comands/send", {
        deviceId: deviceId,
        type: "commandMission",
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
  //
  //// Tool: Control Gimbal
  //server.registerTool(
  //  "control_gimbal",
  //  {
  //    title: "Control Gimbal",
  //    description: "Control the gimbal of a UAV device",
  //    inputSchema: {
  //      type: "object",
  //      properties: {
  //        deviceId: {
  //          type: "number",
  //          description: "Device ID or -1 for all devices",
  //        },
  //        pitch: {
  //          type: "number",
  //          minimum: -180,
  //          maximum: 180,
  //          description: "Pitch angle in degrees",
  //        },
  //        yaw: {
  //          type: "number",
  //          minimum: -180,
  //          maximum: 180,
  //          description: "Yaw angle in degrees",
  //        },
  //        roll: {
  //          type: "number",
  //          minimum: -180,
  //          maximum: 180,
  //          description: "Roll angle in degrees",
  //        },
  //      },
  //      required: ["deviceId", "pitch", "yaw", "roll"],
  //    },
  //  },
  //  async ({ deviceId, pitch, yaw, roll }) => {
  //    const result = await apiPost("/comands/send", {
  //      deviceId,
  //      type: "Gimbal",
  //      attributes: {
  //        pitch,
  //        yaw,
  //        roll,
  //      },
  //    });
  //    return {
  //      content: [
  //        {
  //          type: "text",
  //          text: JSON.stringify(result, null, 2),
  //        },
  //      ],
  //    };
  //  }
  //);
  //
  //// Tool: Get Available Commands
  ////  server.registerTool(
  //    "get_available_commands",
  //    {
  //      title: "Get Available Commands",
  //      description: "Get the list of available commands for UAV devices",
  //      inputSchema: {
  //        type: "object",
  //        properties: {},
  //        required: [],
  //      },
  //    },
  //    async () => {
  //      const commands = await apiGet("/comands/send");
  //      return {
  //        content: [
  //          {
  //            type: "text",
  //            text: JSON.stringify(commands, null, 2),
  //          },
  //        ],
  //      };
  //    }
  //  );

  // Tool: Send Task to GCS
  //  server.registerTool(
  //    "send_task",
  //    {
  //      title: "Send Inspection Task",
  //      description: "Send a task to GCS for UAV inspection",
  //      inputSchema: z.object({
  //        mission_id: z.number().description("Mission ID"),
  //        objetivo: z
  //          .number()
  //          .description(
  //            "Objective: 0=Location, 1=Bird inspection, 2=Lidar survey"
  //          ),
  //        loc: z
  //          .array(
  //            z.object({
  //              lat: z.number().description("Latitude"),
  //              lng: z.number().description("Longitude"),
  //              alt: z.number().description("Altitude"),
  //            })
  //          )
  //          .description("Location data with geo points"),
  //        meteo: z
  //          .array(
  //            z.object({
  //              temperature: z.number().description("Temperature in Celsius"),
  //              humidity: z.number().description("Humidity percentage"),
  //              windSpeed: z.number().description("Wind speed in m/s"),
  //              windDirection: z
  //                .number()
  //                .description("Wind direction in degrees"),
  //            })
  //          )
  //          .description("Meteorological data"),
  //      }),
  //    },
  //    async ({ mission_id, objetivo, loc, meteo }) => {
  //      const result = await apiPost("/missions/sendTask", {
  //        mission_id,
  //        objetivo,
  //        loc,
  //        meteo,
  //      });
  //      return {
  //        content: [
  //          {
  //            type: "text",
  //            text: JSON.stringify(result, null, 2),
  //          },
  //        ],
  //      };
  //    }
  //  );
}
