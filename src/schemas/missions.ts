import { z } from 'zod';

const WaypointSchema = z.object({
  pos: z.array(z.number()).length(3).describe("Position array [latitude, longitude, altitude in meters from ground]"),
  action: z.record(z.any()).optional().default({}).describe("Optional actions to perform at waypoint (default: empty object)")
});

const RouteSchema = z.object({
  name: z.string().describe("Route name (can be empty string)"),
  uav: z.string().describe("UAV identifier (e.g., px4_3)"),
  id: z.number().describe("Route ID (starting from 0)"),
  attributes: z.object({
    max_vel: z.number().describe("Maximum velocity in m/s"),
    idle_vel: z.number().describe("Idle velocity in m/s"),
    mode_yaw: z.number().describe("Yaw mode (0-2)"),
    mode_gimbal: z.number().describe("Gimbal mode (0-2)"),
    mode_trace: z.number().describe("Trace mode (0-2)"),
    mode_landing: z.number().describe("Landing mode (0-2)")
  }).describe("Flight attributes and modes"),
  wp: z.array(WaypointSchema).describe("Array of waypoints defining the route"),
  uav_type: z.string().describe("UAV type (e.g., px4_ros2, px4_sitl)")
});

const MissionSchema = z.object({
  version: z.string().describe("Mission format version"),
  name: z.string().describe("Mission name"),
  route: z.array(RouteSchema).describe("Array of routes")
});

export { WaypointSchema, RouteSchema, MissionSchema };