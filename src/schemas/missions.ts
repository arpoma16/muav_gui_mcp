import { group } from 'node:console';
import { z } from 'zod';

const WaypointSchema = z.object({
  pos: z
    .array(z.number())
    .length(3)
    .refine((coords) => coords[0] >= -90 && coords[0] <= 90, {
      message: 'Latitude must be between -90 and 90',
    })
    .refine((coords) => coords[1] >= -180 && coords[1] <= 180, {
      message: 'Longitude must be between -180 and 180',
    })
    .refine((coords) => coords[2] >= 0, {
      message: 'Altitude must be non-negative',
    })
    .describe('Position array [latitude, longitude, altitude in meters from ground]'),
  yaw: z
    .number()
    .min(-180)
    .max(180)
    .optional()
    .describe('Yaw angle in degrees  -180 to 180, 0 is North  90 is East, -90 is West (optional)'),
  speed: z.number().optional().describe('Speed at waypoint in m/s (optional)'),
  gimbal: z.number().optional().describe('Gimbal pitch angle in degrees (optional)'),
  action: z
    .record(z.any())
    .optional()
    .default({})
    .describe('Optional actions to perform at waypoint (default: empty object)'),
});
const WaypointSchemaXYZ = z.object({
  pos: z
    .array(z.number())
    .length(3)
    .refine((coords) => coords[2] >= 0, {
      message: 'Altitude must be non-negative',
    })
    .describe('Position array [x, y, z in meters x+East, y+North, z+Up]'),
  yaw: z
    .number()
    .min(-180)
    .max(180)
    .optional()
    .describe('Yaw angle in degrees  -180 to 180, 0 is North  90 is East, -90 is West (optional)'),
  speed: z.number().optional().describe('Speed at waypoint in m/s (optional)'),
  gimbal: z.number().optional().describe('Gimbal pitch angle in degrees (optional)'),
  action: z
    .record(z.any())
    .optional()
    .default({})
    .describe('Optional actions to perform at waypoint (default: empty object)'),
});
const RouteSchema = z.object({
  name: z.string().describe('Route name (short description)'),
  uav: z.string().describe('UAV identifier (e.g., px4_3)'),
  id: z.number().describe('Route ID (starting from 0)'),
  attributes: z
    .object({
      max_vel: z.number().describe('Maximum velocity in m/s'),
      idle_vel: z.number().describe('Idle velocity in m/s '),
      mode_yaw: z.number().describe('Yaw mode (0-3). 0: Auto , 1: lock, 2: RC control,3: waypoint yaw control heading'),
      mode_gimbal: z.number().describe('Gimbal mode (0-2)'),
      mode_trace: z.number().describe('Trace mode (0-2)'),
      mode_landing: z.number().describe('Landing mode (0-2)'),
    })
    .describe('Flight attributes and modes'),
  wp: z.array(WaypointSchema).describe('Array of waypoints defining the route'),
  uav_type: z.string().describe('UAV type (e.g., px4_ros2, px4_sitl)'),
});

const RouteSchemaXYZ = z.object({
  name: z.string().describe('Route name (short description)'),
  uav: z.string().describe('UAV identifier (e.g., px4_3)'),
  id: z.number().describe('Route ID (starting from 0)'),
  attributes: z
    .object({
      max_vel: z.number().describe('Maximum velocity in m/s'),
      idle_vel: z.number().describe('Idle velocity in m/s '),
      mode_yaw: z.number().describe('Yaw mode (0-3). 0: Auto , 1: lock, 2: RC control,3: waypoint yaw control heading'),
      mode_gimbal: z.number().describe('Gimbal mode (0-2)'),
      mode_trace: z.number().describe('Trace mode (0-2)'),
      mode_landing: z.number().describe('Landing mode (0-2)'),
    })
    .describe('Flight attributes and modes'),
  wp: z.array(WaypointSchemaXYZ).describe('Array of waypoints defining the route'),
  uav_type: z.string().describe('UAV type (e.g., px4_ros2, px4_sitl)'),
});

const MissionSchema = z.object({
  version: z.string().describe('Mission format version'),
  name: z.string().describe('Mission name (short description of the mission)'),
  description: z.string().optional().describe('Mission description (optional)'),
  route: z.array(RouteSchema).describe('Array of routes'),
});
const MissionSchemaXYZ = z.object({
  origin_global: z
    .object({
      lat: z
        .number()
        .describe('Origin latitude in decimal degrees')
        .refine((lat) => lat >= -90 && lat <= 90, {
          message: 'Latitude must be between -90 and 90',
        }),
      lng: z
        .number()
        .describe('Origin longitude in decimal degrees')
        .refine((lng) => lng >= -180 && lng <= 180, {
          message: 'Longitude must be between -180 and 180',
        }),
      alt: z.number().describe('Origin altitude in meters'),
    })
    .describe('Global origin for local XYZ coordinates'),
  chat_id: z.string().describe('The chat identifier'),
  version: z.string().describe('Mission format version'),
  name: z.string().describe('Mission name (short description of the mission)'),
  description: z.string().optional().describe('Mission description (optional)'),
  route: z.array(RouteSchemaXYZ).describe('Array of routes'),
});

const filteredMissionSchema = {
  chat_id: z.string().describe('The chat identifier'),
  target_elements: z
    .array(
      z.object({
        name: z.string().describe('Name of the element to inspect'),
        type: z.string().describe('Type of the element to inspect (e.g., wind turbine, solar panel, etc.)'),
        group_name: z.string().describe('Group or category the element belongs to'),
        position: z
          .object({
            lat: z.number().describe('Latitude of the element'),
            lng: z.number().describe('Longitude of the element'),
            alt: z.number().describe('Altitude of the element, in meters default to 0 if not specified'),
          })
          .describe('Position of the element'),
        characteristics: z
          .string()
          .optional()
          .describe(
            'All physical and geometric characteristics of the element (dimensions, orientation, specific features, etc.)'
          ),
        metadata: z.string().optional().describe('Additional contextual information about the element'),
      })
    )
    .describe('List of elements to inspect with all available information'),
  group_information: z
    .array(
      z.object({
        elements_name: z.string().describe('Name or names  of the elements to consider for the mission'),
        group_name: z.string().describe('Group or category the elements belong to'),
        shared_characteristics: z
          .string()
          .describe(
            'Complete description of physical and geometric characteristics shared by all elements in this group. Include dimensions, orientation, operational state, etc.'
          ),
      })
    )
    .describe('List of element types to consider for the mission'),
  points_of_interest: z.array(z.object({})).describe('List of POI IDs to inspect given for the user'),
  drone_information: z
    .array(
      z.object({
        name: z.string().describe('Device identifier (e.g., px4_3)'),
        type: z.string().describe('Device category (e.g., px4_ros2, px4_sitl)'),
        location: z
          .object({
            lat: z.number().describe('Latitude of the device'),
            lng: z.number().describe('Longitude of the device'),
            alt: z.number().describe('Altitude of the device, in meters default to 0 if not specified'),
          })
          .describe('Location of the device'),
        capabilities: z.record(z.any()).optional().describe('Additional drone capabilities or specifications'),
      })
    )
    .describe('Complete information about the drone that will execute the mission'),
  mission_requirements: z
    .object({
      mission_type: z
        .string()
        .describe(
          'Type of mission to create (e.g., fast , standar, detail.)  and  characteristics of this type of mission.'
        ),
      mission_details: z
        .string()
        .describe(
          'explanation of the specific requirements for the mission, including any constraints, priorities,strategies, or special instructions.'
        ),
    })
    .describe('Specific requirements and details for the mission to be created'),
  user_context: z
    .object({
      user_request: z.string().describe('The intent of the user request that led to this mission.'),
      additional_info: z.string().describe('Any additional relevant information about the user or request.'),
    })
    .describe('Contextual information about the user making the request'),
};

export { MissionSchema, MissionSchemaXYZ, RouteSchema, filteredMissionSchema };
