import axios from "axios";
import { config } from "./config.js";
// Helper to call the multiuav_gui API
async function apiPost(path: string, data: any) {
  console.log("API POST", path, data);
  const res = await axios.post(`${config.BASE_URL}${path}`, data, {
    timeout: config.REQUEST_TIMEOUT,
    headers: config.API_TOKEN
      ? { Authorization: config.API_TOKEN }
      : { "Content-Type": "application/json" },
  });
  return res.data;
}

async function apiGet(path: string, params: any = {}) {
  const res = await axios.get(`${config.BASE_URL}${path}`, {
    params,
    timeout: config.REQUEST_TIMEOUT,
    headers: config.API_TOKEN ? { Authorization: config.API_TOKEN } : {},
  });
  return res.data;
}

export { apiPost, apiGet };
