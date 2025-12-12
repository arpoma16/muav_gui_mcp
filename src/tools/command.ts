import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet, apiPost } from "../utils.js";
import { RouteSchema } from "../schemas/missions.js";

export function registerCommandTools(server:McpServer){
  server.tool(
    "send_command",
    "Send a command to a  registered device/robot",
    {
      deviceId: z.number().describe("Device ID to send command to"),
      type: z.string().describe("Type of command to send"),
      attributes: z.any().describe("Attributes for the command"),
    },
    async ({ deviceId, type, attributes }) => {
      const result = await apiPost("/commands/send", {
        deviceId,
        type,
        attributes,
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


  // Tool: Load Mission
  server.tool(
    "load_mission_to_uav",
    "Load a mission to UAV devices",
    {
      deviceId: z
        .number()
        .describe("Device ID to load mission or -1 for all devices"),
      routes: z.array(RouteSchema).describe("Array of routes"),
    },
    async ({ deviceId, routes }) => {
      console.log("Loading mission for device:", deviceId);
      console.log("Loading mission with routes:", routes);
      const result = await apiPost("/commands/send", {
        deviceId,
        type: "loadMission",
        attributes: routes,
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


  //Tool: Start Mission
  server.tool(
    "start_mission",
    "send command start mission to UAV devices",
    {
      deviceId: z.number().describe("Device ID or -1 for all devices"),
    },
    async ({ deviceId }) => {
      const result = await apiPost("/commands/send", {
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
  //    const result = await apiPost("/commands/send", {
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
  // Tool: Get Available Commands
  server.tool(
    "get_available_commands",
    "Get the list of available commands for UAV devices",
    {
      deviceId: z.number().describe("Device ID to get commands for"),
    },
    async () => {
      const commands = await apiGet("/commands/send");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(commands, null, 2),
          },
        ],
      };
    }
  );

  // Tool: Send Task to GCS
  server.tool(
    "send_task",
    "Send a high level task to GCS for UAV inspection",
    {
      mission_id: z.number().describe("Mission ID"),
      objetivo: z
        .number()
        .describe("Objective: 0=Location, 1=Bird inspection, 2=Lidar survey"),
      loc: z
        .array(
          z.object({
            lat: z.number().describe("Latitude"),
            lng: z.number().describe("Longitude"),
            alt: z.number().describe("Altitude"),
          })
        )
        .describe("Location data with geo points"),
      meteo: z
        .array(
          z.object({
            temperature: z.number().describe("Temperature in Celsius"),
            humidity: z.number().describe("Humidity percentage"),
            windSpeed: z.number().describe("Wind speed in m/s"),
            windDirection: z.number().describe("Wind direction in degrees"),
          })
        )
        .describe("Meteorological data"),
    },
    async ({ mission_id, objetivo, loc, meteo }) => {
      const result = await apiPost("/missions/sendTask", {
        mission_id,
        objetivo,
        loc,
        meteo,
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


}