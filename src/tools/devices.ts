import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet, apiPost } from "../utils.js";

export function registerDevicesTools(server: McpServer) {
  server.tool(
    "get_devices",
    "get list of robots registered in the platform",
    {},
    async () => {
      const devices = await apiGet("/devices");

      // Format as a readable summary
      const summary = devices.map((device: any) =>
        `- ${device.name} (ID: ${device.id})
          Category: ${device.category}
          Status: ${device.status}
          Protocol: ${device.protocol}
          Last Update: ${device.lastUpdate || 'Never'}`
      ).join('\n\n');

      return {
        content: [
          {
            type: "text",
            text: `Found ${devices.length} device(s):\n\n${summary}`,
          },
        ],
      };
    }
  );
}
