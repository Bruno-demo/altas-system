// What this does: shows sales-focused reports and exports
import { useEffect, useRef, useState } from "react";
import { exportSalesExcel } from "../../api/manager";
import {
  exportReportsExcel,
  getBestSellers,
  getProfit,
  getSalesByPayment,
  importSalesSdc,
} from "../../api/reports";
import { downloadBlob, getFilenameFromDisposition } from "../../utils/download";

const periods = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "this_year", label: "This year" },
  { value: "custom", label: "Custom range" },
];

function money(n) {
  const value = Number(n || 0);
  if (Number.isNaN(value)) return "0.00";
  return value.toFixed(2);
}

export default function SalesReports() {
  const [period, setPeriod] = useState("today");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState({ period: "today", limit: 10 });

  const [salesByPayment, setSalesByPayment] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [profit, setProfit] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState("");
  const fileRef = useRef(null);

  const applyFilters = (event) => {
    event.preventDefault();
    setMessage("");
    if (period === "custom") {
      if (!from || !to) {
        setMessage("Select both From and To dates.");
        return;
      }
      setFilters({ from, to, limit });
    } else {
      setFilters({ period, limit });
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMessage("");
      try {
        const [paymentRes, bestRes, profitRes] = await Promise.all([
          getSalesByPayment(filters),
          getBestSellers(filters),
          getProfit(filters),
        ]);
        setSalesByPayment(paymentRes.data?.byPayment || []);
        setBestSellers(bestRes.data?.items || []);
        setProfit(profitRes.data || null);
      } catch (err) {
        setMessage(err?.response?.data?.message || "Failed to load reports.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filters]);

  const downloadSales = async () => {
    setMessage("");
    try {
      const res = await exportSalesExcel(filters);
      const filename = getFilenameFromDisposition(
        res.headers?.["content-disposition"],
        "sales-export.xlsx"
      );
      downloadBlob(res.data, filename);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to download sales.");
    }
  };

  const downloadFullReport = async () => {
    setMessage("");
    try {
      const res = await exportReportsExcel(filters);
      const filename = getFilenameFromDisposition(
        res.headers?.["content-disposition"],
        "report-export.xlsx"
      );
      downloadBlob(res.data, filename);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to download report.");
    }
  };

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  const handleImport = async () => {
    if (!importFile) {
      setImportFeedback("Select an Excel (.xlsx) file first.");
      return;
    }
    setImportFeedback("");
    setImporting(true);
    try {
      const fileBase64 = await toBase64(importFile);
      const res = await importSalesSdc({ fileBase64 });
      const inserted = res.data?.inserted ?? 0;
      const updated = res.data?.updated ?? 0;
      setImportFeedback(`Imported: ${inserted} inserted, ${updated} updated.`);
      setImportFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setImportFeedback(err?.response?.data?.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Sales Reports</h2>
          <p className="muted">Sales by payment, best sellers, and profit.</p>
        </div>
        <div className="button-row">
          <button type="button" className="button-outline" onClick={downloadSales}>
            Download Sales Excel
          </button>
          <button type="button" className="button-outline" onClick={downloadFullReport}>
            Download Full Report
          </button>
        </div>
      </div>

      <div className="stack">
        <div>
          <h3>Import Sales Excel</h3>
          <p className="muted">
            Upload the Excel sheet so the Sales SDC report matches the same columns as Promotions.
          </p>
        </div>
        {importFeedback ? (
          <div className={importFeedback.startsWith("Imported") ? "success" : "alert"}>
            {importFeedback}
          </div>
        ) : null}
        <div className="form form-wide">
          <label className="field">
            Sales SDC Excel (.xlsx)
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
          </label>
          <button type="button" onClick={handleImport} disabled={importing}>
            {importing ? "Importing..." : "Import Sales Excel"}
          </button>
        </div>
      </div>

      {message ? <div className="alert">{message}</div> : null}

      <form className="filters-grid" onSubmit={applyFilters}>
        <label className="field">
          Period
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            {periods.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            disabled={period !== "custom"}
          />
        </label>
        <label className="field">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            disabled={period !== "custom"}
          />
        </label>
        <label className="field">
          Best sellers limit
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </label>
        <div className="filter-actions">
          <button type="submit" disabled={loading}>
            {loading ? "Loading..." : "Apply Filters"}
          </button>
        </div>
      </form>

      <div className="split-view">
        <section className="card list-panel">
          <h3>Sales by Payment</h3>
          {salesByPayment.length ? (
            <div className="table-compact">
              {salesByPayment.map((row) => (
                <div key={row.paymentMethod} className="table-row">
                  <span>{row.paymentMethod}</span>
                  <span>{row.invoices} invoices</span>
                  <span>{money(row.total)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="muted">No payment data.</div>
          )}
        </section>

        <section className="card preview-panel">
          <h3>Profit Snapshot</h3>
          {profit ? (
            <div className="stat-grid">
              <div>
                <div className="stat-label">Revenue</div>
                <div className="stat-value">{money(profit.revenue)}</div>
              </div>
              <div>
                <div className="stat-label">COGS (Est.)</div>
                <div className="stat-value">{money(profit.cogsEstimated)}</div>
              </div>
              <div>
                <div className="stat-label">Gross Profit</div>
                <div className="stat-value">{money(profit.grossProfit)}</div>
              </div>
              <div>
                <div className="stat-label">Margin %</div>
                <div className="stat-value">
                  {profit.marginPct == null ? "-" : `${profit.marginPct}%`}
                </div>
              </div>
            </div>
          ) : (
            <div className="muted">No profit data.</div>
          )}
        </section>
      </div>

      <section className="card">
        <h3>Best Sellers</h3>
        {bestSellers.length ? (
          <div className="data-table">
            <div className="data-row data-header">
              <div>Product</div>
              <div>SKU</div>
              <div>Qty</div>
              <div>Revenue</div>
            </div>
            {bestSellers.map((row, idx) => (
              <div key={row.product?.id || idx} className="data-row">
                <div>{row.product?.name}</div>
                <div>{row.product?.sku}</div>
                <div>{row.quantitySold}</div>
                <div>{money(row.revenue)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="muted">No best sellers found.</div>
        )}
      </section>

      {profit?.items?.length ? (
        <section className="card">
          <h3>Profit Detail</h3>
          <div className="data-table">
            <div className="data-row data-header">
              <div>Product</div>
              <div>Qty</div>
              <div>Sales</div>
              <div>COGS</div>
              <div>Gross Profit</div>
            </div>
            {profit.items.slice(0, 30).map((row, idx) => (
              <div key={row.product?.id || idx} className="data-row">
                <div>{row.product?.name}</div>
                <div>{row.qtySold}</div>
                <div>{money(row.salesAmount)}</div>
                <div>{money(row.cogsEstimated)}</div>
                <div>{money(row.grossProfit)}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
