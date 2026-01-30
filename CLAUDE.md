# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TypeScript-based MCP (Model Context Protocol) server that provides UAV control tools for LLM integration with the MultiUAV-GUI ground control station. The server exposes tools, resources, and prompts for controlling UAV fleets via the main GCS backend API. the default way to interact with LLM is using HTTP streamable transport

## Development Commands

```bash
# Install dependencies
npm install

# Development with hot reload (choose one transport)
npm run dev:sse      # SSE transport on port 3001
npm run dev:stdio    # STDIO transport
npm run dev:http     # HTTP streamable transport

# Build for production
npm run build        # Outputs to ./lib/

# Production run
npm run start:sse    # SSE mode
npm run start:stdio  # STDIO mode
npm run start:http   # HTTP mode

# Debug with MCP Inspector
npm run dev:inspector
```

### VS Code Debugging

- **Debug in Agent Builder**: F5 with "Debug in Agent Builder" configuration
- **Debug SSE in Inspector**: Use "Debug SSE in Inspector (Edge/Chrome)" compound
- **Debug STDIO in Inspector**: Use "Debug STDIO in Inspector" compound

## Architecture

### Entry Points

- `src/index.ts` - Server launcher supporting three transports: `stdio`, `sse`, `http`
- `src/server.ts` - MCP server instance creation, registers resources/prompts/tools

### Core Components

| File               | Purpose                                                             |
| ------------------ | ------------------------------------------------------------------- |
| `src/config.ts`    | Environment configuration (API URL, tokens, timeouts)               |
| `src/utils.ts`     | API helpers (`apiGet`, `apiPost`) for backend communication         |
| `src/resources.ts` | MCP resources (devices, positions, missions, routes)                |
| `src/prompts.ts`   | Pre-built prompts (safety check, mission planning, status analysis) |

### Tool Modules (`src/tools/`)

| Module        | Tools Provided                                                                                |
| ------------- | --------------------------------------------------------------------------------------------- |
| `devices.ts`  | `get_devices` - List registered robots                                                        |
| `command.ts`  | `send_command`, `load_mission_to_uav`, `start_mission`, `get_available_commands`, `send_task` |
| `missions.ts` | `get_missions`, `build_mission`, `create_mission`                                             |
| `planning.ts` | `get_registered_objects` - Get GPS-located inspection elements                                |
| `position.ts` | `get_telemetry_data` - Current robot positions/telemetry                                      |

### Schemas (`src/schemas/`)

- `missions.ts` - Zod schemas for `WaypointSchema`, `RouteSchema`, `MissionSchema`

## Configuration

Environment variables (via `.env` or process environment):

| Variable          | Default                     | Description              |
| ----------------- | --------------------------- | ------------------------ |
| `MUAV_API_URL`    | `http://localhost:4000/api` | Backend API base URL     |
| `MUAV_API_TOKEN`  | -                           | Optional API auth token  |
| `SERVER_PORT`     | `3001`                      | MCP server port          |
| `REQUEST_TIMEOUT` | `5000`                      | API request timeout (ms) |
| `DEBUG`           | `false`                     | Enable debug logging     |

## Key Patterns

### Adding New Tools

1. Create tool file in `src/tools/` following existing pattern
2. Use `server.tool(name, description, zodSchema, handler)` from MCP SDK
3. Register in `src/tools/index.ts` via `registerXTools(server)`
4. Use `apiGet`/`apiPost` helpers for backend communication

### Tool Handler Structure

```typescript
server.tool('tool_name', 'Tool description', { param: z.string().describe('Param description') }, async ({ param }) => {
  const result = await apiGet('/endpoint');
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
});
```

## Dependencies

- `@modelcontextprotocol/sdk` - MCP server framework
- `axios` - HTTP client for backend API
- `zod` - Schema validation for tool inputs
- `express` - SSE/HTTP transport server
