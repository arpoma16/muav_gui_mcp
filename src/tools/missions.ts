import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet, apiPost } from "../utils.js";

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
}
