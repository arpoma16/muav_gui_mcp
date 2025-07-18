import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerResources } from "./resources";
//import { registerTools } from "./tools";
import { registerPrompts } from "./prompts";

const server = new McpServer({
  name: "multiuav-gui-mcp-server",
  version: "1.0.0",
});

// Register all resources
registerResources(server);

// Register all tools
//registerTools(server);

// Register all prompts
registerPrompts(server);

// Start the server
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.log("MCP server connected to multiuav_gui API.");
});
