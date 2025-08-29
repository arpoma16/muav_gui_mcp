import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { registerRosTools } from "./ros.js";
import { registerOtherTools } from "./other.js";

export function registerTools(server: McpServer) {
  registerRosTools(server);
  registerOtherTools(server);
}
