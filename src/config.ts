import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export const config = {
  // Base URL for multiuav_gui API
  BASE_URL: process.env.MUAV_API_URL || "https://localhost:4000/api",

  // API authentication token (if required)
  API_TOKEN: process.env.MUAV_API_TOKEN || "",

  // Server configuration
  SERVER_PORT: parseInt(process.env.SERVER_PORT || "3000"),

  // Request timeout in milliseconds
  REQUEST_TIMEOUT: parseInt(process.env.REQUEST_TIMEOUT || "5000"),

  // Enable debug logging
  DEBUG: process.env.DEBUG === "true" || process.env.DEBUG === "1",

  // SSL verification (for development)
  SSL_VERIFY: process.env.SSL_VERIFY !== "false",
};

// Log configuration on startup (without sensitive data)
if (config.DEBUG) {
  console.log("Configuration loaded:", {
    BASE_URL: config.BASE_URL,
    SERVER_PORT: config.SERVER_PORT,
    REQUEST_TIMEOUT: config.REQUEST_TIMEOUT,
    SSL_VERIFY: config.SSL_VERIFY,
    API_TOKEN: config.API_TOKEN ? "[CONFIGURED]" : "[NOT SET]",
  });
}
