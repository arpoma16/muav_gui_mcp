import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
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

export function registerPrompts(server: McpServer) {
  // Prompt: Analyze Device Statuses
  server.registerPrompt(
    "analyze_status",
    {
      title: "Analyze Device Statuses",
      description: "Summarize the status of all UAV devices",
      argsSchema: {},
    },
    async () => {
      const devices = await apiGet("/devices");
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Analyze the following UAV device statuses:\n\n${JSON.stringify(
                devices,
                null,
                2
              )}`,
            },
          },
        ],
      };
    }
  );

  // Prompt: Find Devices with Low Battery
  server.registerPrompt(
    "find_low_battery",
    {
      title: "Find Low Battery Devices",
      description: "List UAVs with battery below 20%",
      argsSchema: {},
    },
    async () => {
      const positions = await apiGet("/positions");
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Which UAVs have battery below 20%?\n\n${JSON.stringify(
                positions,
                null,
                2
              )}`,
            },
          },
        ],
      };
    }
  );

  // Prompt: Mission Planning
  server.registerPrompt(
    "mission_planning",
    {
      title: "Mission Planning",
      description: "Help plan a mission for UAV devices",
      argsSchema: {},
    },
    async () => {
      const devices = await apiGet("/devices");
      const missions = await apiGet("/missions/");
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Help me plan a mission using the following available devices and current missions:\n\nDevices:\n${JSON.stringify(
                devices,
                null,
                2
              )}\n\nCurrent Missions:\n${JSON.stringify(missions, null, 2)}`,
            },
          },
        ],
      };
    }
  );

  // Prompt: Flight Safety Check
  server.registerPrompt(
    "safety_check",
    {
      title: "Flight Safety Check",
      description: "Perform a safety check on UAV devices before flight",
      argsSchema: {},
    },
    async () => {
      const devices = await apiGet("/devices");
      const positions = await apiGet("/positions");
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Perform a safety check on the UAV devices. Check battery levels, connection status, and any alarms:\n\nDevices:\n${JSON.stringify(
                devices,
                null,
                2
              )}\n\nPositions:\n${JSON.stringify(positions, null, 2)}`,
            },
          },
        ],
      };
    }
  );

  // Prompt: Mission Status Report
  server.registerPrompt(
    "mission_status",
    {
      title: "Mission Status Report",
      description: "Generate a report on current mission status",
      argsSchema: {},
    },
    async () => {
      const missions = await apiGet("/missions/");
      const positions = await apiGet("/positions");
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Generate a mission status report based on the following data:\n\nMissions:\n${JSON.stringify(
                missions,
                null,
                2
              )}\n\nCurrent Positions:\n${JSON.stringify(positions, null, 2)}`,
            },
          },
        ],
      };
    }
  );

  // Prompt: Analyze Flight Data
  server.registerPrompt(
    "analyze_flight_data",
    {
      title: "Analyze Flight Data",
      description: "Analyze flight data and performance metrics",
      argsSchema: {},
    },
    async () => {
      const positions = await apiGet("/positions");
      const files = await apiGet("/files/get");
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Analyze the flight data and performance metrics:\n\nPosition Data:\n${JSON.stringify(
                positions,
                null,
                2
              )}\n\nMission Files:\n${JSON.stringify(files, null, 2)}`,
            },
          },
        ],
      };
    }
  );
}
