// What this does: creates an Axios client that automatically attaches the JWT token (if available)
import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_URL || "";

export const api = axios.create({
  baseURL: apiBaseUrl,
});

// What this does: adds Authorization header to every request if token exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken") || localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
