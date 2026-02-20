// What this does: lets cashier search products and immediately see availability + top bin suggestions
import { useState } from "react";
import { api } from "../../api/http";

const receiptBaseUrl = import.meta.env.VITE_API_URL || "";

export default function PosSearch() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");

  const search = async (e) => {
    e.preventDefault();
    setMsg("");

    try {
      const res = await api.get(
        `/api/products/search?q=${encodeURIComponent(q)}`
      );
      const items = Array.isArray(res.data?.rows)
        ? res.data.rows
        : Array.isArray(res.data?.items)
          ? res.data.items
          : [];
      setRows(items);
    } catch (err) {
      setMsg(err?.response?.data?.message || "Search failed");
    }
  };

  const openReceipt = (saleId) => {
    // What this does: opens the thermal receipt HTML in a new tab and triggers print dialog
    window.open(
      `${receiptBaseUrl}/api/sales/${saleId}/receipt-html?autoprint=1`,
      "_blank"
    );
  };

  return (
    <div className="page pos-search-page">
      <h2>POS Product Search</h2>
      <p className="muted">
        Search name, part number, brand, or category.
      </p>

      {msg ? <div className="alert pos-search-alert">{msg}</div> : null}

      <form onSubmit={search} className="pos-search-form">
        <input
          className="pos-search-input"
          placeholder="Search name / partNumber / brand / category..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      <div className="pos-search-results">
        {rows.map((r, index) => {
          const product = r.product || {};
          const isMotorbike =
            product.category === "Motorbike" || Boolean(product.chassisNumber);
          const availability = r.availability || {};
          const totalQty =
            availability.totalQty ??
            r.totalQuantity ??
            availability.totalQuantity ??
            0;
          const status = isMotorbike
            ? "Available"
            : availability.status || (r.available ? "Available" : "Out of stock");
          const qtyLabel = isMotorbike ? "N/A" : totalQty;

          const rawBins = Array.isArray(r.topBins)
            ? r.topBins
            : r.topBinSuggestion
              ? [r.topBinSuggestion]
              : Array.isArray(r.pickFrom)
                ? r.pickFrom
                : [];

          const topBins = rawBins.map((b) => ({
            locationName: b.location?.name || b.locationName || "-",
            binCode: b.bin?.code || b.binCode || "-",
            qty: b.qty ?? b.quantity ?? 0,
          }));

          return (
            <div
              key={product.id || `${product.sku || "row"}-${index}`}
              className="card pos-search-item"
            >
              <div className="pos-search-row">
                <div>
                  <div className="pos-search-title">{product.name || "-"}</div>
                  <div className="muted pos-search-meta">
                    SKU: {product.sku || "-"} - Part:{" "}
                    {product.partNumber || "-"} - Brand:{" "}
                    {product.brand || "-"} - Cat: {product.category || "-"}
                  </div>
                </div>

                <div className="pos-search-qty">
                  <div className="pos-search-qty-value">{qtyLabel} pcs</div>
                  <div className="muted pos-search-qty-status">{status}</div>
                </div>
              </div>

              <div className="pos-search-suggestions">
                <div className="pos-search-suggestions-title">
                  Top bin suggestions
                </div>
                {isMotorbike ? (
                  <div className="muted">No bin needed for motorbikes.</div>
                ) : topBins.length ? (
                  <ul className="pos-search-suggestions-list">
                    {topBins.map((b, idx) => (
                      <li key={`${b.binCode}-${idx}`}>
                        {b.locationName} - BIN {b.binCode} - Qty {b.qty}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="muted">No bin record</div>
                )}
              </div>

              {/* NOTE: when you have a saleId from createSale, call openReceipt(saleId) */}
            </div>
          );
        })}
      </div>
    </div>
  );
}

