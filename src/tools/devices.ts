import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet, apiGetBinary, apiPost } from "../utils.js";

export function registerDevicesTools(server: McpServer) {
  server.tool(
    "get_devices",
    "get list of robots registered in the platform",
    {},
    async () => {
      const devices = await apiGet("/devices");

      // Format as a readable summary
      const summary = devices
        .map(
          (device: any) =>
            `- ${device.name} (ID: ${device.id})
          Category: ${device.category}
          Status: ${device.status}
          Protocol: ${device.protocol}
          Last Update: ${device.lastUpdate || "Never"}`
        )
        .join("\n\n");

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

  server.tool(
    "download_device_camera_image",
    `Downloads the current real-time camera image from a specific device. Use this tool when you need visual access to what the device's camera is capturing at this moment — the returned image data lets you analyse the live scene.
    Capture a snapshot from the robot's camera. 
    **Frame convention**: the camera is mounted pointing **forward** on the robot chassis (offset +X, no yaw rotation). An object centered in the image corresponds to approximately 0° robot-frame — directly ahead of the robot's current heading. Lateral objects are at ±FoV/2 from center.
    Use it:
    - When the operator asks what the robot sees
    - As a complement to LIDAR when identifying object type
    - Never use camera position alone to infer world coordinates — always cross-reference with "get_agv_state" yaw + LIDAR  
    `,
    {
      deviceId: z.number().describe("ID of the device whose live camera image should be downloaded"),
    },
    async ({ deviceId }) => {
      try {
        const snapshot = await apiGetBinary(`/devices/${deviceId}/snapshot`);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "success",
                image_data: snapshot.data,
                mime_type: snapshot.mimeType,
                description: `Captura de imagen del dispositivo ${deviceId}`,
              }),
            },
          ],
        };
      } catch (error: any) {
        const status = error.response?.status;
        const detail = error.response?.data?.message || error.message;
        const message =
          status === 404
            ? `Device ${deviceId} not found (404). Verify the ID with get_devices before retrying.`
            : `Failed to get snapshot for device ${deviceId}: [${status ?? "network error"}] ${detail}`;

        return {
          isError: true,
          content: [{ type: "text", text: message }],
        };
      }
    }
  );
}
