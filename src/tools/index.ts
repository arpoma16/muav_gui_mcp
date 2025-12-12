import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { registerRosTools } from "./ros.js";
import { registerDevicesTools } from "./devices.js";
import { registerCommandTools } from "./command.js";
import { registerAGVCommandTools } from "./agvCommand.js";
import { registerMissionTools } from "./missions.js";
import { registerPositionsTools } from "./position.js";
import { registerPlanningTools } from "./planning.js";
export function registerTools(server: McpServer) {
  //registerRosTools(server);
  registerDevicesTools(server);
  registerCommandTools(server);
  //registerAGVCommandTools(server);
  registerMissionTools(server);
  registerPlanningTools(server);
  registerPositionsTools(server);
}
