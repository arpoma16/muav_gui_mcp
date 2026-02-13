import { z } from 'zod';
import {
  PositionXYZSchema,
  PositionArraySchema,
  WaypointBaseSchema,
  RouteAttributesSchema,
  ObstacleSchema,
  ObstacleZonesSchema,
  AABBSchema,
  OriginGlobalSchema,
} from './common.js';

// ============================================================================
// Waypoint Schemas (for collision validation)
// ============================================================================

const CollisionWaypointSchema = z.object({
  type: z.enum(['inspection', 'transit', 'takeoff', 'landing']).describe('Type of waypoint'),
  target_id: z.string().optional().describe('Identifier of the target element (required for inspection waypoints)'),
  notes: z.string().optional().describe('Additional notes for this waypoint'),
  pos: PositionArraySchema.or(PositionXYZSchema).describe('Position in local XYZ coordinates'),
  ...WaypointBaseSchema,
});

// ============================================================================
// Route Schemas (for collision validation)
// ============================================================================

const CollisionRouteSchema = z.object({
  name: z.string().describe('Route name'),
  uav: z.string().describe('UAV identifier'),
  id: z.number().describe('Route ID'),
  attributes: RouteAttributesSchema,
  uav_type: z.string().describe('UAV type'),
  wp: z.array(CollisionWaypointSchema).describe('Array of waypoints'),
});

// ============================================================================
// Mission Schema (for collision validation)
// ============================================================================

const CollisionMissionSchema = z
  .object({
    version: z.string().optional().default('3').describe('Mission format version'),
    name: z.string().optional().describe('Mission name'),
    description: z.string().optional().describe('Mission description'),
    route: z.array(CollisionRouteSchema).describe('Array of routes to validate'),
    origin_global: OriginGlobalSchema,
  })
  .describe('Mission data structure for collision validation');

// ============================================================================
// Validation Input Schemas
// ============================================================================

export const ValidateCollisionsInputSchema = {
  mission: CollisionMissionSchema.describe('Mission data with routes and waypoints to validate'),
  collision_objects: z
    .array(ObstacleSchema)
    .describe(
      'All physical objects in the scene that require collision checking. ' +
        'MUST include: (1) obstacles to avoid (buildings, trees, etc.), AND (2) inspection targets (turbines, panels, etc.) '
    ),
};

export const ResolveCollisionsInputSchema = {
  mission: CollisionMissionSchema.describe('Mission data with routes and waypoints to validate and resolve'),
  collision_objects: z.array(ObstacleSchema).describe('Array of obstacles to check for collisions'),
};

// ============================================================================
// Output Types (for documentation)
// ============================================================================

/**
 * Collision result structure returned by validation
 */
export interface CollisionResult {
  hasCollision: boolean;
  obstacleName: string;
  obstacleType: string;
  zoneType: 'exclusion' | 'caution';
  segmentIndex: number;
  collisionPoint: { x: number; y: number; z: number };
  penetrationDepth: number;
}

/**
 * Route validation result
 */
export interface RouteValidationResult {
  routeId: number;
  routeName: string;
  uav: string;
  valid: boolean;
  collisions: CollisionResult[];
  warnings: CollisionResult[];
  summary: {
    totalWaypoints: number;
    totalSegments: number;
    collisionCount: number;
    warningCount: number;
  };
}

/**
 * Mission validation result
 */
export interface MissionValidationResult {
  valid: boolean;
  totalCollisions: number;
  totalWarnings: number;
  routes: RouteValidationResult[];
  report: string;
}

/**
 * Collision resolution result
 */
export interface CollisionResolutionResult {
  modified: boolean;
  message?: string;
  detoursApplied?: number;
  mission: object;
  report?: string;
  validation: MissionValidationResult;
}

// Export schemas for use in tools
export {
  ObstacleSchema,
  CollisionMissionSchema,
  CollisionRouteSchema,
  CollisionWaypointSchema,
  PositionXYZSchema,
  AABBSchema,
  ObstacleZonesSchema,
};
