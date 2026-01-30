import { z } from 'zod';

// ============================================================================
// Position Schemas
// ============================================================================

export const PositionXYZSchema = z
  .object({
    x: z.number().describe('X coordinate in meters (East)'),
    y: z.number().describe('Y coordinate in meters (North)'),
    z: z.number().describe('Z coordinate in meters (Up)'),
  })
  .describe('Local position coordinates in meters');

export const PositionArraySchema = z
  .array(z.number())
  .length(3)
  .describe('Position array [x, y, z] in meters');

// ============================================================================
// Waypoint Base Schema
// ============================================================================

export const WaypointBaseSchema = {
  yaw: z
    .number()
    .min(-180)
    .max(180)
    .optional()
    .describe('Yaw angle in degrees -180 to 180, 0 is North, 90 is East, -90 is West (optional)'),
  speed: z.number().optional().describe('Speed at waypoint in m/s (optional)'),
  gimbal: z.number().optional().describe('Gimbal pitch angle in degrees (optional)'),
  action: z
    .record(z.any())
    .optional()
    .default({})
    .describe('Optional actions to perform at waypoint (default: empty object)'),
};

// ============================================================================
// Route Attributes Schema
// ============================================================================

export const RouteAttributesSchema = z
  .object({
    max_vel: z.number().describe('Maximum velocity in m/s'),
    idle_vel: z.number().describe('Idle velocity in m/s'),
    mode_yaw: z.number().describe('Yaw mode (0-3). 0: Auto, 1: lock, 2: RC control, 3: waypoint yaw control heading'),
    mode_gimbal: z.number().describe('Gimbal mode (0-2)'),
    mode_trace: z.number().describe('Trace mode (0-2)'),
    mode_landing: z.number().describe('Landing mode (0-2)'),
  })
  .describe('Flight attributes and modes');

// ============================================================================
// Obstacle Schemas
// ============================================================================

export const ObstacleZonesSchema = z
  .object({
    exclusion_zone: z.string().describe('Exclusion zone description (e.g., "cylinder: radius=15m, height=120m")'),
    caution_zone: z.string().describe('Caution zone description (e.g., "cylinder: radius=25m, height=130m")'),
    safe_zone: z.string().describe('Safe zone description (e.g., "beyond 30m radius")'),
  })
  .describe('Zone definitions around the obstacle');

export const AABBSchema = z
  .object({
    min_point: PositionXYZSchema.describe('Minimum corner of the bounding box'),
    max_point: PositionXYZSchema.describe('Maximum corner of the bounding box'),
  })
  .describe('Axis-aligned bounding box for quick collision checks');

export const ObstacleSchema = z
  .object({
    name: z.string().describe('Obstacle identifier (e.g., "turbine_1", "building_A")'),
    type: z.string().describe('Obstacle type (e.g., "windTurbine", "building", "tree", "powerLine")'),
    position: PositionXYZSchema.describe('Center position of the obstacle'),
    zones: ObstacleZonesSchema,
    safe_passages: z.array(z.string()).describe('List of pre-approved safe passages around the obstacle'),
    aabb: AABBSchema,
    metadata: z.string().optional().describe('Additional contextual information about the obstacle'),
  })
  .describe('Obstacle definition for collision detection');
