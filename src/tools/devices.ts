import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet, apiPost } from "../utils.js";

export function registerDevicesTools(server: McpServer) {
  server.tool(
    "get_devices",
    "get list of robots registered in the platform",
    {},
    async () => {
      const result = await apiGet("/devices");
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
