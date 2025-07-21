import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";

import axios from "axios";
import { config } from "./config";

// Helper to call the multiuav_gui API
async function apiGet(path: string, params: any = {}) {
  const res = await axios.get(`${config.BASE_URL}${path}`, {
    params,
    timeout: config.REQUEST_TIMEOUT,
    headers: config.API_TOKEN ? { Authorization: config.API_TOKEN } : {},
  });
  return res.data;
}

export function registerResources(server: McpServer) {
  // Resource: List of Devices
  server.registerResource(
    "devices",
    "devices://all",
    {
      title: "UAV Devices",
      description: "List of all UAV devices",
    },
    async () => {
      const devices = await apiGet("/devices");
      return {
        contents: [
          {
            uri: "devices://all",
            text: JSON.stringify(devices, null, 2),
          },
        ],
      };
    }
  );

  // Resource: Device by ID
  server.registerResource(
    "device",
    new ResourceTemplate("device://{id}", { list: undefined }),
    {
      title: "Device Info",
      description: "Information for a specific UAV device",
    },
    async (uri, { id }) => {
      const devices = await apiGet("/devices", { id });
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(devices, null, 2),
          },
        ],
      };
    }
  );

  // Resource: Positions
  server.registerResource(
    "positions",
    "positions://all",
    {
      title: "UAV Positions",
      description: "Current positions of all UAV devices",
    },
    async () => {
      const positions = await apiGet("/positions");
      return {
        contents: [
          {
            uri: "positions://all",
            text: JSON.stringify(positions, null, 2),
          },
        ],
      };
    }
  );

  // Resource: Position by Device ID
  server.registerResource(
    "position",
    new ResourceTemplate("position://{deviceId}", { list: undefined }),
    {
      title: "Device Position",
      description: "Current position of a specific UAV device",
    },
    async (uri, { deviceId }) => {
      const positions = await apiGet("/positions", { deviceId });
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(positions, null, 2),
          },
        ],
      };
    }
  );

  // Resource: Missions
  server.registerResource(
    "missions",
    "missions://all",
    {
      title: "Missions",
      description: "List of all missions",
    },
    async () => {
      const missions = await apiGet("/missions/");
      return {
        contents: [
          {
            uri: "missions://all",
            text: JSON.stringify(missions, null, 2),
          },
        ],
      };
    }
  );

  // Resource: Mission Routes
  server.registerResource(
    "routes",
    new ResourceTemplate("routes://{missionId}", { list: undefined }),
    {
      title: "Mission Routes",
      description: "Routes for a specific mission",
    },
    async (uri, { missionId }) => {
      const routes = await apiGet("/missions/routes", { missionId });
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(routes, null, 2),
          },
        ],
      };
    }
  );

  // Resource: Server Configuration
  server.registerResource(
    "server_config",
    "server://config",
    {
      title: "Server Configuration",
      description: "Current server configuration",
    },
    async () => {
      const config = await apiGet("/server");
      return {
        contents: [
          {
            uri: "server://config",
            text: JSON.stringify(config, null, 2),
          },
        ],
      };
    }
  );
}
