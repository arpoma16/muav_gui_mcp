import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { apiGet, apiPost } from "../utils.js";

export function registerRosTools(server: McpServer) {
  server.tool(
    "get_ros_topics",
    "Get the current ROS topics of devices are connecting to the server",
    {},
    async ({}) => {
      const result = await apiGet(`/ros/topics`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result.topics, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "get_ros_topics_type",
    "Get the current ROS topics message type",
    { topic: z.string().min(1).max(100).describe("Topic name") },
    async ({ topic }) => {
      const result = await apiGet(`/ros/topics_type`, { topic });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "get_ros_message_type_details",
    "Get the ros message structure",
    { type: z.string().min(1).max(100).describe("message type") },
    async ({ type }) => {
      const result = await apiGet(`/ros/message_details`, { type });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "subscribe_topic_once",
    "Subscribe to a ROS topic once",
    { topic: z.string().min(1).max(100).describe("Topic name") },
    async ({ topic }) => {
      const result = await apiGet(`/ros/subscribe_once`, { topic });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "get_ros_services",
    "Get the current ROS services of devices are connecting to the server",
    {},
    async ({}) => {
      const result = await apiGet(`/ros/services`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result.services, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "pub_ros_topic",
    "Publish a message to a ROS topic",
    {
      topic: z.string().min(1).max(100),
      messageType: z.string().min(1).max(1000),
      message: z.object({}).passthrough(),
    },
    async ({ topic, messageType, message }) => {
      console.log("message", message);
      const result = await apiPost(`/ros/publish`, {
        topic: topic,
        messageType: messageType,
        message: message,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
