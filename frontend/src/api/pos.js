// What this does: wraps POS-specific endpoints (shift, invoices, EBM, returns, reports)
import { api } from "./http";

export const getOpenShift = () => api.get("/api/pos/shift/open");
export const openShift = (payload) => api.post("/api/pos/shift/open", payload);
export const closeShift = (payload) => api.post("/api/pos/shift/close", payload);
export const exportShiftExcel = (shiftId) =>
  api.get(`/api/pos/shift/${shiftId}/export/excel`, { responseType: "blob" });

export const getDailyReport = (date) =>
  api.get("/api/pos/reports/daily", { params: { date } });

export const getInvoiceJson = (saleId) =>
  api.get(`/api/pos/sales/${saleId}/invoice.json`);

export const downloadInvoicePdf = (saleId, format) =>
  api.get(`/api/pos/sales/${saleId}/invoice.pdf`, {
    params: { format },
    responseType: "blob",
  });

export const createReturn = (saleId, payload) =>
  api.post(`/api/pos/sales/${saleId}/return`, payload);

export const getEbmInput = (saleId) =>
  api.get(`/api/pos/sales/${saleId}/ebm-input`);

export const confirmEbm = (saleId, payload) =>
  api.post(`/api/pos/sales/${saleId}/ebm-confirm`, payload);
