import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet, apiPost } from "../utils.js";

export function registerPlanningTools(server: McpServer) {
  server.tool(
    "get_markers",
    "get list of object markers in the environment from all robots inspection",
    {},
    async () => {
      const data = await apiGet("/planning/getMarkers");

      // Format as a readable summary
      
      const summary = JSON.stringify(data, null, 2);

      return {
        content: [
          {
            type: "text",
            text: `Found ${data.length} data(s):\n\n${summary}`,
          },
        ],
      };
    }
  );
}
