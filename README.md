# MultiUAV GUI MCP Server

A Model Context Protocol (MCP) server that provides standardized access to MultiUAV GUI functionality, enabling LLMs to interact with UAV devices, missions, and flight data.

## Overview

This MCP server connects to the MultiUAV GUI application and exposes its capabilities through:
- **Resources**: Access to device information, positions, missions, and configuration
- **Tools**: Commands for controlling UAVs, managing missions, and gimbal control
- **Prompts**: Common data analysis tasks for flight operations

## Features

### Resources
- **Device Information**: List all UAV devices or get specific device details
- **Position Data**: Current and historical position data for UAVs
- **Mission Management**: Access to missions and routes
- **Server Configuration**: System settings and status

### Tools
- **Send Commands**: Execute various commands on UAV devices
- **Mission Control**: Load and start missions on UAVs
- **Gimbal Control**: Precise control of camera gimbal positioning
- **Task Management**: Send inspection tasks to Ground Control Station
- **Command Discovery**: Get available commands for devices

### Prompts
- **Status Analysis**: Analyze device statuses and health
- **Safety Checks**: Pre-flight safety verification
- **Mission Planning**: Assistance with mission planning
- **Performance Analysis**: Flight data and performance metrics analysis
- **Battery Monitoring**: Identify devices with low battery levels

## Installation

### Prerequisites

- **Node.js 18+** ✅ (Node.js 20 detected)
- **npm** or **yarn**

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd muav_gui_mcp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the API endpoint**
   
   Copy the example environment file and configure it:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your settings:
   ```bash
   MUAV_API_URL=https://your-server:4000/api
   MUAV_API_TOKEN=your-auth-token-if-needed
   DEBUG=false
   ```

   Alternatively, you can edit `config.ts` directly for quick changes.

## Usage

### Running the Server

```bash
npm start
# or
npx ts-node server.ts
```

The server will connect via stdio transport and log when ready.

### Using with MCP Clients

This server implements the standard MCP protocol and can be used with any MCP-compatible client:

1. **Configure your MCP client** to connect to this server
2. **Use Resources** to fetch UAV data:
   - `devices://all` - All devices
   - `device://{id}` - Specific device
   - `positions://all` - All positions
   - `missions://all` - All missions

3. **Use Tools** to control UAVs:
   - `send_command` - Send any command
   - `load_mission` - Load mission waypoints
   - `start_mission` - Begin mission execution
   - `control_gimbal` - Control camera gimbal

4. **Use Prompts** for analysis:
   - `analyze_status` - Device status summary
   - `safety_check` - Pre-flight checks
   - `mission_planning` - Mission assistance

## Project Structure

```
muav_gui_mcp/
├── server.ts          # Main server setup and initialization
├── resources.ts       # Resource definitions and registration
├── tools.ts          # Tool definitions and registration
├── prompts.ts        # Prompt definitions and registration
├── package.json      # Dependencies and scripts
└── README.md         # This file
```

## API Integration

This server integrates with the MultiUAV GUI REST API. Key endpoints used:

- `GET /devices` - Device information
- `GET /positions` - Position data
- `GET /missions/` - Mission data
- `POST /comands/send` - Send commands
- `POST /missions/sendTask` - Send tasks

## Configuration

### Environment Variables

You can configure the server using environment variables in a `.env` file:

```bash
# MultiUAV GUI API Configuration
MUAV_API_URL=https://localhost:4000/api
MUAV_API_TOKEN=your_auth_token_here

# Server Configuration
SERVER_PORT=3000
REQUEST_TIMEOUT=5000

# Development Configuration
DEBUG=false
SSL_VERIFY=true
```

### Configuration Methods

#### Method 1: Environment Variables (Recommended)
1. Copy `.env.example` to `.env`
2. Edit the values in `.env`
3. The server will automatically load these settings

#### Method 2: Direct Configuration
Edit `config.ts` directly for quick changes:
```typescript
export const config = {
  BASE_URL: "https://your-server:4000/api",
  API_TOKEN: "Bearer your-token",
  DEBUG: true,
  // ... other settings
};
```

### API Authentication

If your MultiUAV GUI API requires authentication, modify the API helper functions in each module to include appropriate headers.

## Development

### Adding New Resources

1. Add resource definition in `resources.ts`
2. Follow the existing pattern with `server.registerResource()`
3. Update this README with the new resource

### Adding New Tools

1. Add tool definition in `tools.ts`
2. Define input schema using Zod
3. Implement the tool handler function
4. Update this README with the new tool

### Adding New Prompts

1. Add prompt definition in `prompts.ts`
2. Define any required arguments
3. Implement the prompt handler
4. Update this README with the new prompt

## Examples

### Using the Send Command Tool

```typescript
// Example: Emergency landing for all UAVs
{
  "deviceId": -1,
  "type": "emergency_land",
  "attributes": {}
}

// Example: Control specific UAV gimbal
{
  "deviceId": 1,
  "type": "Gimbal",
  "attributes": {
    "pitch": -90,
    "yaw": 0,
    "roll": 0
  }
}
```

### Mission Loading Example

```typescript
{
  "deviceId": 1,
  "routes": [
    {
      "name": "Survey Mission",
      "uav": "uav_1",
      "wp": [
        {
          "pos": [37.1234, -6.5678, 50],
          "yaw": 0,
          "gimbal": -45,
          "action": {"video_start": 0}
        }
      ],
      "attributes": {
        "mode_landing": 2,
        "mode_yaw": 3,
        "idle_vel": 5
      }
    }
  ]
}
```

## Troubleshooting

### Common Issues

1. **Connection Refused**: Ensure MultiUAV GUI API is running and accessible
2. **Authentication Errors**: Check if API requires authentication tokens
3. **Timeout Errors**: Verify network connectivity and API response times
4. **Invalid Commands**: Use `get_available_commands` tool to see valid options

### Debug Mode

Enable debug logging by setting:
```bash
export DEBUG=1
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

[Specify your license here]

## Support

For issues and questions:
- GitHub Issues: [Repository Issues](link-to-issues)
- Email: arpoma167@gmail.com
- Documentation: [MultiUAV GUI Docs](https://grvc.us.es/)

## Related Projects

- [MultiUAV GUI](https://github.com/alvcaballero/multiuav_gui/) - Main UAV management interface
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) - MCP implementation
- [Model Context Protocol](https://modelcontextprotocol.io) - Protocol specification
