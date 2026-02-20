import { api } from "./http";

export const createUser = (payload) => api.post("/api/admin/users", payload);

export const listUsers = (params) =>
  api.get("/api/admin/users", { params });

export const getUserById = (id) => api.get(`/api/admin/users/${id}`);

export const updateUser = (id, payload) =>
  api.put(`/api/admin/users/${id}`, payload);

export const disableUser = (id) =>
  api.post(`/api/admin/users/${id}/disable`);

export const enableUser = (id) =>
  api.post(`/api/admin/users/${id}/enable`);

export const resetUserPassword = (id, payload) =>
  api.post(`/api/admin/users/${id}/reset-password`, payload);
