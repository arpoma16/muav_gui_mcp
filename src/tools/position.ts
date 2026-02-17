import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet, apiPost } from "../utils.js";

export function registerPositionsTools(server: McpServer) {
  server.tool(
    "get_fleet_telemetry",
    `Returns real-time telemetry for UAVs: GPS position (lat, lon, alt), heading, ground speed, battery level, flight mode, and connection status. Pass device_ids to filter specific UAVs or omit for the entire fleet. Use to check drone availability before mission planning, verify positions during flight, or diagnose connectivity issues.`,
    {
      device_ids: z
        .array(z.number().describe("Device ID"))
        .optional()
        .describe("List of device IDs to query. Omit to get telemetry for all UAVs."),
    },
    async ({ device_ids }) => {
      const params = device_ids?.length ? { deviceId: device_ids } : {};
      const positions = await apiGet("/positions", params);

      const posArray = Array.isArray(positions) ? positions : Object.values(positions);
      const online = posArray.filter((p: any) => p.attributes?.landed_state === "IN AIR");
      const label = device_ids?.length
        ? `Telemetry for ${posArray.length} requested UAV(s)`
        : `Fleet telemetry: ${posArray.length} UAV(s) total`;
      const summary = JSON.stringify(posArray, null, 2);

      return {
        content: [
          {
            type: "text" as const,
            text: `${label}, ${online.length} in air.\n\n${summary}`,
          },
        ],
      };
    }
  );
}
