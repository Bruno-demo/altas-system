import { api } from "./http";

export const listEmployees = (params) =>
  api.get("/api/hr/employees", { params });

export const createEmployee = (payload) =>
  api.post("/api/hr/employees", payload);

export const updateEmployee = (id, payload) =>
  api.put(`/api/hr/employees/${id}`, payload);

export const getEmployeeById = (id) => api.get(`/api/hr/employees/${id}`);

export const markAttendance = (payload) =>
  api.post("/api/hr/attendance/mark", payload);

export const getAttendanceByDate = (params) =>
  api.get("/api/hr/attendance", { params });

export const getAttendanceRange = (params) =>
  api.get("/api/hr/attendance/range", { params });

export const getAttendanceSummary = (params) =>
  api.get("/api/hr/attendance/summary", { params });

export const createAdvance = (payload) =>
  api.post("/api/hr/advances", payload);

export const listAdvances = (params) =>
  api.get("/api/hr/advances", { params });

export const cancelAdvance = (id, payload) =>
  api.post(`/api/hr/advances/${id}/cancel`, payload);

export const advancesSummary = (params) =>
  api.get("/api/hr/advances/summary", { params });

export const generatePayroll = ({ year, month, employeeIds } = {}) => {
  const params = { year, month };
  const payload =
    Array.isArray(employeeIds) && employeeIds.length
      ? { employeeIds }
      : null;
  return api.post("/api/hr/payroll/generate", payload, { params });
};

export const getPayrollRun = (runId) =>
  api.get(`/api/hr/payroll/${runId}`);

export const listPayrollRuns = (params) =>
  api.get("/api/hr/payroll", { params });

export const finalizePayroll = (runId) =>
  api.post(`/api/hr/payroll/${runId}/finalize`);

export const exportPayrollBankExcel = (runId) =>
  api.get(`/api/hr/payroll/${runId}/export/bank-excel`, {
    responseType: "blob",
  });
