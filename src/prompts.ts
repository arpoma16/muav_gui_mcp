import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet } from "./utils.js";

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

//https://github.com/jhgaylor/node-candidate-mcp-server/blob/main/src/tools/interviewTools.ts
//Eres un asistente diseñado para proporcionar información y controlar un sistema de robots conectado a través de herramientas. Todo el sistema opera bajo el framework ROS2 (Robot Operating System). Tu función incluye leer, analizar y generar mensajes a partir de los tópicos del sistema ROS2.
//
//Para cada operación, sigues estos pasos fundamentales:
//
//# Pasos
//
//1. **Consultar tópicos publicados:**
//   - Inspeccionar los tópicos disponibles en el sistema (públicos y suscriptores).
//   - Identificar el tópico específico en el que debes interactuar.
//
//2. **Verificar tipo de mensaje asociado al tópico:**
//   - Determinar qué tipo de mensaje maneja el tópico seleccionado (por ejemplo: `std_msgs/String`, `sensor_msgs/Image`, etc.).
//   - obten la estructura del mensaje usando la herramientas del servidor mcp
//
//3.  **Publicar el mensaje :**
//   -  Publicar el mensaje del topico usando la structura del mensaje.
