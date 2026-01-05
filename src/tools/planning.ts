import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet, apiPost } from "../utils.js";

export function registerPlanningTools(server: McpServer) {
  server.tool(
    "get_registered_objects",
    `Obtiene la lista completa de objetos/elementos registrados en el sistema con sus ubicaciones GPS (latitud, longitud).
    USA ESTA HERRAMIENTA CUANDO:
    - El usuario mencione elementos específicos por nombre (ej: "Torre A", "Transformador B", "Poste 123")
    - El usuario solicite inspeccionar elementos sin especificar coordenadas
    - Necesites verificar si un elemento existe en el sistema
    - Requieras las coordenadas exactas de elementos conocidos
    - El usuario pregunte "qué elementos hay", "qué puedo inspeccionar", "lista de objetos"
    
    DEVUELVE:
    - Nombre/ID de cada objeto
    - Coordenadas GPS (latitud, longitud)
    - Tipo de elemento (torre, transformador, poste, etc.)
    - Características adicionales si están disponibles (altura, estado, etc.)
    
    LLAMA ESTA HERRAMIENTA ANTES DE:
    - Crear cualquier misión de inspección para elementos nombrados
    - Validar que los elementos solicitados existan
    - Calcular rutas o waypoints para inspección`,
    {},
    async () => {
      const data = await apiGet("/planning/getMarkers");

      // Format as a readable summary
      
      const summary = JSON.stringify(data, null, 2);

      return {
        content: [
          {
            type: "text",
            text: `Found ${data.length} data(s):\n\n${summary}`,
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
