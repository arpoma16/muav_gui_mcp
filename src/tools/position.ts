import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet, apiPost } from "../utils.js";

export function registerPositionsTools(server: McpServer) {
  server.tool(
    "get_telemetry_data",
    "get list of current position and telemetry data from all robots in the platform",
    {},
    async () => {
      const positions = await apiGet("/positions");

      // Format as a readable summary
      
      const summary = JSON.stringify(positions, null, 2);

      return {
        content: [
          {
            type: "text",
            text: `Found ${positions.length} positions(s):\n\n${summary}`,
          },
        ],
      };
    }
  );
}
