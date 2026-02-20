// What this does: wraps backend auth endpoints for login and password change
import { api } from "./http";

export const loginApi = (payload) => api.post("/api/auth/login", payload);

export const changePasswordApi = (payload) =>
  api.post("/api/auth/change-password", payload);
