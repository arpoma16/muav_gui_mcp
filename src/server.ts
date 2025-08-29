import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
//import { z } from "zod";
import { registerResources } from "./resources.js";
import { registerPrompts } from "./prompts.js";
import { registerTools } from "./tools/index.js";

// Create server instance
const server = new McpServer({
  name: "muav_gui_assistant",
  version: "1.0.0",
});

registerResources(server);

registerPrompts(server);

registerTools(server);

export { server };
