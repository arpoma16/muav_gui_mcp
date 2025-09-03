import axios from "axios";
import { config } from "./config.js";
// Helper to call the multiuav_gui API
async function apiPost(path: string, data: any) {
  try {
    console.log("API POST", path, data);
    const res = await axios.post(`${config.BASE_URL}${path}`, data, {
      timeout: config.REQUEST_TIMEOUT,
      headers: config.API_TOKEN
        ? { Authorization: config.API_TOKEN }
        : { "Content-Type": "application/json" },
    });
    console.log("API POST Response:", res.status, res.statusText);
    return res.data;
  } catch (error: any) {
    console.error("API POST Error:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      path
    });
    throw error;
  }
}

async function apiGet(path: string, params: any = {}) {
  try {
    const res = await axios.get(`${config.BASE_URL}${path}`, {
      params,
      timeout: config.REQUEST_TIMEOUT,
      headers: config.API_TOKEN ? { Authorization: config.API_TOKEN } : {},
    });
    console.log("API GET Response:", res.status, res.statusText);
    return res.data;
  } catch (error: any) {
    console.error("API GET Error:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      path,
      params
    });
    throw error;
  }
}

export { apiPost, apiGet };
