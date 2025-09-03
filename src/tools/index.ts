import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { registerRosTools } from "./ros.js";
import { registerDevicesTools } from "./devices.js";
import { registerCommandTools } from "./command.js";

export function registerTools(server: McpServer) {
  registerRosTools(server);
  registerDevicesTools(server);
  registerCommandTools(server);
}
