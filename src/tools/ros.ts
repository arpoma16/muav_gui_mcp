import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { apiGet, apiPost } from "../utils.js";
import { isArray } from "node:util";
import { ca, ms } from "zod/v4/locales";

export function registerRosTools(server: McpServer) {
  server.tool(
    "get_ros_topics_list",
    "Get the current ROS topics of devices are connecting to the server",
    {},
    async ({}) => {
      try {
        const result = await apiGet(`/ros/topics`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.topics, null, 2),
            },
          ],
        };
      } catch (error: any) {
        if (error.response?.status === 500) {
          throw new Error(`Server error: ${error.response?.data?.message  || error.response?.data?.error || 'Internal server error occurred'}`);
        }
        // Re-throw other errors
        throw error;
      }
    }
  );

  server.tool(
    "get_ros_topics_message_type",
    "Get the message type for a given ROS topic",
    { topic: z.string().min(1).max(100).describe("Topic name") },
    async ({ topic }) => {
      try {
        const result = await apiGet(`/ros/topics_type`, { topic });
        if (!result) {
          throw new Error(`Topic '${topic}' not found`);
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        if (error.response?.status === 500) {
          throw new Error(`Server error: ${error.response?.data?.message  || error.response?.data?.error || 'Internal server error occurred'}`);
        }
        // Re-throw other errors
        throw error;
      }
    }
  );

  server.tool(
    "get_ros_message_structure",
    "Retrieve the detailed structure and fields of a ROS message type",
    { msg_type: z.string().min(1).max(100).describe("message type") },
    async ({ msg_type }) => {
      try {
        const result = await apiGet(`/ros/message_details`, { type:msg_type });
        
        if (!result) {
          throw new Error(`Message type '${msg_type}' not found`);
        }
        if (Array.isArray(result) && result.length === 0) {
          throw new Error(`Message type '${msg_type}' doesn't exist`);
        }
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        if (error.response?.status === 500) {
          throw new Error(`Server error: ${error.response?.data?.message  || error.response?.data?.error || 'Internal server error occurred'}`);
        }
        // Re-throw other errors
        throw error;
      }
    }
  );

  server.tool(
    "subscribe_ros_topic_once",
    "Subscribe to a ROS topic once",
    { topic: z.string().min(1).max(100).describe("Topic name") },
    async ({ topic }) => {
      try {
        const result = await apiGet(`/ros/subscribe_once`, { topic });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        if (error.response?.status === 500) {
          throw new Error(`Server error: ${error.response?.data?.message  || error.response?.data?.error || 'Internal server error occurred'}`);
        }
        // Re-throw other errors
        throw error;
      }
    }
  );

  server.tool(
    "get_ros_services_list",
    "Get the current ROS services of devices are connecting to the server",
    {},
    async ({}) => {
      try {
        const result = await apiGet(`/ros/services`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.services, null, 2),
            },
          ],
        };
      } catch (error: any) {
        if (error.response?.status === 500) {
          throw new Error(`Server error: ${error.response?.data?.message  || error.response?.data?.error || 'Internal server error occurred'}`);
        }
        // Re-throw other errors
        throw error;
      }
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
      try {
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
      } catch (error: any) {
        if (error.response?.status === 500) {
          throw new Error(`Server error: ${error.response?.data?.message  || error.response?.data?.error || 'Internal server error occurred'}`);
        }
        // Re-throw other errors
        throw error;
      }
    }
  );
}
