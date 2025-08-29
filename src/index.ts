import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { server } from "./server.js";
import { httpStreamableSever } from "./httpStemeable.js";
import { config } from "./config.js";

type TransportType = "stdio" | "sse" | "http";

class MCPServerLauncher {
  private static readonly DEFAULT_PORT = 3001;

  private static getTransportType(): TransportType {
    const args = process.argv.slice(2);
    const type = args.at(0) || "stdio";

    if (!["stdio", "sse", "http"].includes(type)) {
      throw new Error(`Unknown transport type: ${type}`);
    }

    return type as TransportType;
  }

  private static async startSSEServer(port: number): Promise<void> {
    const app = express();
    let transport: SSEServerTransport;

    app.get("/sse", async (req, res) => {
      transport = new SSEServerTransport("/messages", res);
      await server.connect(transport);
    });

    app.post("/messages", async (req, res) => {
      // Note: to support multiple simultaneous connections, these messages will
      // need to be routed to a specific matching transport. (This logic isn't
      // implemented here, for simplicity.)
      await transport.handlePostMessage(req, res);
    });

    app.listen(port);
    console.error(`MCP Server running on SSE (port ${port})`);
  }

  private static async startHTTPServer(port: number): Promise<void> {
    httpStreamableSever(server, port);
    console.error(`MCP Server running on HTTP (port ${port})`);
  }

  private static async startStdioServer(): Promise<void> {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Server running on STDIO");
  }

  public static async start(): Promise<void> {
    const transportType = this.getTransportType();
    const port = config.SERVER_PORT;

    switch (transportType) {
      case "sse":
        await this.startSSEServer(port);
        break;
      case "http":
        await this.startHTTPServer(port);
        break;
      case "stdio":
        await this.startStdioServer();
        break;
    }
  }
}

// Start the server
async function main(): Promise<void> {
  await MCPServerLauncher.start();
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
