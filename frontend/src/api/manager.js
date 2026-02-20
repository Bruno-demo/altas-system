// What this does: wraps Manager/CEO advanced endpoints
import { api } from "./http";

export const getKpis = (params) => api.get("/api/manager/kpis", { params });

export const exportSalesExcel = (params) =>
  api.get("/api/manager/sales/export/excel", {
    params,
    responseType: "blob",
  });

export const getAudit = (params) => api.get("/api/manager/audit", { params });

export const getStockValuation = (params) =>
  api.get("/api/manager/stock/valuation", { params });
