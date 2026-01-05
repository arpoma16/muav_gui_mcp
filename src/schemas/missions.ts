import { z } from 'zod';

const WaypointSchema = z.object({
  pos: z.array(z.number()).length(3)
    .refine((coords) => coords[0] >= -90 && coords[0] <= 90, {
      message: "Latitude must be between -90 and 90"
    })
    .refine((coords) => coords[1] >= -180 && coords[1] <= 180, {
      message: "Longitude must be between -180 and 180"
    })
    .refine((coords) => coords[2] >= 0, {
      message: "Altitude must be non-negative"
    })
    .describe("Position array [latitude, longitude, altitude in meters from ground]"),
  yaw: z.number().min(-180).max(180).optional().describe("Yaw angle in degrees  -180 to 180, 0 is North  90 is East, -90 is West (optional)"),
  speed: z.number().optional().describe("Speed at waypoint in m/s (optional)"),
  gimbal: z.number().optional().describe("Gimbal pitch angle in degrees (optional)"),
  action: z.record(z.any()).optional().default({}).describe("Optional actions to perform at waypoint (default: empty object)")
});

const RouteSchema = z.object({
  name: z.string().describe("Route name (short description)"),
  uav: z.string().describe("UAV identifier (e.g., px4_3)"),
  id: z.number().describe("Route ID (starting from 0)"),
  attributes: z.object({
    max_vel: z.number().describe("Maximum velocity in m/s"),
    idle_vel: z.number().describe("Idle velocity in m/s "),
    mode_yaw: z.number().describe("Yaw mode (0-3). 0: Auto , 1: lock, 2: RC control,3: waypoint yaw control heading"),
    mode_gimbal: z.number().describe("Gimbal mode (0-2)"),
    mode_trace: z.number().describe("Trace mode (0-2)"),
    mode_landing: z.number().describe("Landing mode (0-2)")
  }).describe("Flight attributes and modes"),
  wp: z.array(WaypointSchema).describe("Array of waypoints defining the route"),
  uav_type: z.string().describe("UAV type (e.g., px4_ros2, px4_sitl)")
});

const MissionSchema = z.object({
  version: z.string().describe("Mission format version"),
  name: z.string().describe("Mission name (short description of the mission)"),
  description: z.string().optional().describe("Mission description (optional)"),
  route: z.array(RouteSchema).describe("Array of routes")
});

export { WaypointSchema, RouteSchema, MissionSchema };