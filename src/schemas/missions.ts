import { z } from 'zod';
import { PositionXYZSchema, WaypointBaseSchema, RouteAttributesSchema, ObstacleSchema } from './common.js';

// ============================================================================
// Position schemas (mission-specific)
// ============================================================================

const PositionGlobalSchema = z
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
  .describe('Position array [latitude, longitude, altitude in meters from ground]');

const GeoLocationSchema = z
  .object({
    lat: z.number().describe('Latitude in decimal degrees'),
    lng: z.number().describe('Longitude in decimal degrees'),
    alt: z.number().describe('Altitude in meters, default to 0 if not specified'),
  })
  .describe('Geographic location');

const PositionLocalSchema = z
  .array(z.number())
  .length(3)
  .refine((coords) => coords[2] >= 0, {
    message: 'Altitude must be non-negative',
  })
  .describe('Position array [x, y, z in meters x+East, y+North, z+Up]');

// ============================================================================
// Waypoint schemas
// ============================================================================

const WaypointSchema = z.object({
  pos: PositionGlobalSchema,
  ...WaypointBaseSchema,
});

const WaypointSchemaXYZ = z.object({
  type: z.enum(['inspection', 'transit', 'takeoff', 'landing']).describe('Type of waypoint'),
  notes: z.string().optional().describe('Additional notes or instructions for this waypoint'),
  pos: PositionLocalSchema,
  ...WaypointBaseSchema,
});

const DetailedWaypointSchemaXYZ = z
  .object({
    type: z.enum(['inspection', 'transit', 'takeoff', 'landing']).describe('Type of waypoint'),
    target_id: z
      .string()
      .optional()
      .describe('Identifier of the target element associated with this waypoint (required for inspection waypoints)'),
    notes: z.string().optional().describe('Additional notes or instructions for this waypoint'),
    pos: PositionXYZSchema,
    ...WaypointBaseSchema,
  })
  .superRefine((data, ctx) => {
    if (data.type === 'inspection' && !data.target_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'target_id is required for inspection waypoints',
        path: ['target_id'],
      });
    }
  });

// ============================================================================
// Route schemas
// ============================================================================

const RouteBaseSchema = {
  name: z.string().describe('Route name (short description)'),
  uav: z.string().describe('UAV identifier (e.g., px4_3)'),
  id: z.number().describe('Route ID (starting from 0)'),
  attributes: RouteAttributesSchema,
  uav_type: z.string().describe('UAV type (e.g., px4_ros2, px4_sitl)'),
};

const RouteSchema = z.object({
  ...RouteBaseSchema,
  wp: z.array(WaypointSchema).describe('Array of waypoints defining the route'),
});

const RouteSchemaXYZ = z.object({
  ...RouteBaseSchema,
  wp: z.array(WaypointSchemaXYZ).describe('Array of waypoints defining the route'),
});
const DetailedRouteSchemaXYZ = z.object({
  ...RouteBaseSchema,
  wp: z
    .array(DetailedWaypointSchemaXYZ.describe('Detailed waypoint with local position and actions'))
    .describe('Array of waypoints defining the route'),
});

// ============================================================================
// Mission schemas
// ============================================================================

const MissionBaseSchema = {
  version: z.string().describe('Mission format version'),
  name: z.string().describe('Mission name (short description of the mission)'),
  description: z.string().optional().describe('Mission description (optional)'),
};

const OriginGlobalSchema = z
  .object({
    lat: z
      .number()
      .refine((lat) => lat >= -90 && lat <= 90, {
        message: 'Latitude must be between -90 and 90',
      })
      .describe('Origin latitude in decimal degrees'),
    lng: z
      .number()
      .refine((lng) => lng >= -180 && lng <= 180, {
        message: 'Longitude must be between -180 and 180',
      })
      .describe('Origin longitude in decimal degrees'),
    alt: z.number().describe('Origin altitude in meters'),
  })
  .describe('Global origin for local XYZ coordinates');

const MissionSchema = z.object({
  ...MissionBaseSchema,
  route: z.array(RouteSchema).describe('Array of routes'),
});

const MissionSchemaXYZ = z.object({
  ...MissionBaseSchema,
  origin_global: OriginGlobalSchema,
  chat_id: z.string().describe('The chat identifier'),
  route: z.array(RouteSchemaXYZ).describe('Array of routes'),
});

// ============================================================================
// Filtered mission schema components
// ============================================================================

const TargetElementSchema = z.object({
  name: z.string().describe('Name of the element to inspect'),
  type: z.string().describe('Type of the element to inspect (e.g., wind turbine, solar panel, etc.)'),
  group_name: z.string().describe('Group or category the element belongs to'),
  position: GeoLocationSchema.describe('Position of the element'),
  characteristics: z
    .string()
    .optional()
    .describe(
      'Extract and list ALL physical dimensions and geometric parameters verbatim to describe the element.Format as key:value pairs separated by commas.'
    ),
  metadata: z.string().optional().describe('Information about the elements to inspect'),
});

const GroupInformationSchema = z.object({
  elements_name: z.string().describe('Name or names of the elements to consider for the mission'),
  group_name: z.string().describe('Group or category the elements belong to'),
  shared_characteristics: z
    .string()
    .describe(
      'Complete description of physical and geometric characteristics shared by all elements in this group. Include dimensions, orientation, operational state, etc.'
    ),
});

const DroneInformationSchema = z.object({
  name: z.string().describe('Device identifier (e.g., px4_3)'),
  type: z.string().describe('Device category (e.g., px4_ros2, px4_sitl)'),
  location: GeoLocationSchema.describe('Location of the device'),
  capabilities: z.record(z.any()).optional().describe('Additional drone capabilities or specifications'),
});

const MissionRequirementsSchema = z
  .object({
    mission_type: z.string().describe('Name of the type of mission to create '),
    mission_strategy: z
      .string()
      .describe('Describe the strategy following EXACTLY the pattern from the inspection type.'),
  })
  .describe('Specific information about the mission requirements and objectives');

const UserContextSchema = z
  .object({
    user_request: z.string().describe('The intent of the user request that led to this mission'),
    additional_info: z.string().describe('Any additional relevant information about the user or request'),
  })
  .describe('Contextual information about the user making the request');

const obstacle_elements = z
  .object({
    id: z.string().describe('Identifier of the obstacle element'),
    type: z.string().describe('Type of the element (e.g., building, tree, power line, etc.)'),
    position: GeoLocationSchema.describe('Position of the element'),
    dimensions: z
      .object({
        height_m: z.number().optional().describe('Total height of the obstacle'),
        radius_m: z.number().optional().describe('Radius or half-width for cylindrical approximation'),
        width_m: z.number().optional().describe('Width (if rectangular)'),
        length_m: z.number().optional().describe('Length (if rectangular)'),
      })
      .optional()
      .describe('Physical dimensions for collision avoidance calculations'),
    metadata: z.string().optional().describe('Additional contextual information about the obstacle'),
  })
  .optional()
  .describe(
    'ALL other elements in the area that are NOT inspection targets. These are obstacles that must be avoided during flight. CRITICAL for collision avoidance and safe path planning.'
  );

const filteredMissionSchema = {
  chat_id: z.string().describe('The chat identifier'),
  target_elements: z.array(TargetElementSchema).describe('List of elements to inspect with all available information'),
  //group_information: z.array(GroupInformationSchema).describe('List of element types to consider for the mission'),
  obstacle_elements: z.array(obstacle_elements).describe('List of obstacle elements in the mission area'),
  points_of_interest: z.array(z.object({})).describe('List of POI IDs to inspect given by the user'),
  drone_information: z
    .array(DroneInformationSchema)
    .describe('Complete information about the drone that will execute the mission'),
  mission_requirements: MissionRequirementsSchema,
  user_context: UserContextSchema,
};

const validateMissionSchema = {
  origin_global: OriginGlobalSchema,
  chat_id: z.string().describe('The chat identifier'),
  objectives: z.string().describe('Clear and concise list of mission objectives and goals'),
  route: z.array(DetailedRouteSchemaXYZ).describe('Array of routes'),
  collision_objects: z
    .array(ObstacleSchema)
    .describe(
      'All physical objects in the scene that require collision checking. ' +
        'MUST include: (1) obstacles to avoid (buildings, trees, etc.), AND (2) inspection targets (turbines, panels, etc.) '
    ),
};

export { MissionSchema, MissionSchemaXYZ, RouteSchema, filteredMissionSchema, validateMissionSchema };
