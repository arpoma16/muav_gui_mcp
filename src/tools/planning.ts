import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiGet, apiPost } from '../utils.js';

export function registerPlanningTools(server: McpServer) {
  server.tool(
    'get_registered_objects',
    `Returns all registered objects/elements in the system with their GPS coordinates (latitude, longitude), type, and additional attributes. Use before creating inspection missions for named elements or when the user asks about available objects.`,
    {},
    async () => {
      const data = await apiGet('/planning/getMarkers');

      // Format as a readable summary

      const summary = JSON.stringify(data, null, 2);

      return {
        content: [
          {
            type: 'text',
            text: `Found ${data.length} data(s):\n\n${summary}`,
          },
        ],
      };
    }
  );

  server.tool(
    'get_bases_with_assignments',
    `Returns all operation bases with their GPS positions and assigned drones. Each base includes id, coordinates, and assigned device (or null). Use when drone positions are unknown, drones are offline, or you need departure points for mission planning.`,
    {},
    async () => {
      const data = await apiGet('/planning/getBasesWithAssignments');

      const basesWithDrones = data.filter((b: { device: unknown }) => b.device !== null);
      const basesWithoutDrones = data.filter((b: { device: unknown }) => b.device === null);

      const summary = JSON.stringify(data, null, 2);

      return {
        content: [
          {
            type: 'text',
            text: `Found ${data.length} base(s): ${basesWithDrones.length} with assigned drones, ${basesWithoutDrones.length} without assignment.\n\n${summary}`,
          },
        ],
      };
    }
  );

  // server.tool(
  //   "get_object_characteristics",
  //   `Obtiene características detalladas de elementos específicos para planificar inspecciones seguras.

  //   DEVUELVE:
  //   - Dimensiones estructurales (altura hub, longitud palas, diámetro rotor)
  //   - Parámetros de seguridad calculados (altitudes mínimas, distancias)
  //   - Zonas de inspección recomendadas
  //   - Sistema de coordenadas y elevación del terreno`,
  //   {
  //     elementName: z.string().describe("Nombre del elemento (ej: 'Line A', 'Torre B')"),
  //   },
  //   async (args) => {
  //     const element = await apiGet(`/planning/getElementCharacteristics/${args.elementName}`);

  //     if (element.type === 'windTurbine') {
  //       const hubHeight = parseFloat(element.hub_height);
  //       const bladeLength = parseFloat(element.blade_length);

  //       return {
  //         content: [{
  //           type: "text",
  //           text: JSON.stringify({
  //             ...element,
  //             calculated: {
  //               total_height: hubHeight + bladeLength,
  //               safe_altitude: hubHeight + bladeLength + 20,
  //               rotor_diameter: bladeLength * 2,
  //               min_horizontal_distance: bladeLength + 10
  //             }
  //           }, null, 2)
  //         }]
  //       };
  //     }

  //     // For other element types, return raw data
  //     return {
  //       content: [{
  //         type: "text",
  //         text: JSON.stringify(element, null, 2)
  //       }]
  //     };
  //   }
  // );
}
