// What this does: wraps reports endpoints for Manager/CEO
import { api } from "./http";

export const getSummary = (params) => api.get("/api/reports/summary", { params });
export const getSalesByPayment = (params) =>
  api.get("/api/reports/sales-by-payment", { params });
export const getBestSellers = (params) =>
  api.get("/api/reports/best-sellers", { params });
export const getStockMovement = (params) =>
  api.get("/api/reports/stock-movement", { params });
export const getCashflow = (params) => api.get("/api/reports/cashflow", { params });
export const getProfit = (params) => api.get("/api/reports/profit", { params });
export const getAuditLogs = (params) => api.get("/api/reports/audit", { params });
export const getStockTransactions = (params) =>
  api.get("/api/reports/stock-transactions", { params });
export const exportReportsExcel = (params) =>
  api.get("/api/reports/export/excel", { params, responseType: "blob" });

export const getEbmSummary = (params) =>
  api.get("/api/reports/ebm/summary", { params });
export const getEbmPending = (params) =>
  api.get("/api/reports/ebm/pending", { params });
export const getEbmPendingByCashier = (params) =>
  api.get("/api/reports/ebm/pending-by-cashier", { params });
export const markEbmFailed = (saleId, payload) =>
  api.post(`/api/reports/ebm/${saleId}/mark-failed`, payload);
export const markEbmPending = (saleId, payload) =>
  api.post(`/api/reports/ebm/${saleId}/mark-pending`, payload);
export const importSalesSdc = (payload) =>
  api.post("/api/reports/sales-sdc/import", payload);
export const getImportedSalesSdc = (params) =>
  api.get("/api/reports/sales-sdc/imported", { params });
export const getSalesSdc = (params) =>
  api.get("/api/reports/sales-sdc", { params });
