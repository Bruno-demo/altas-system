// What this does: shows low-stock items with optional aggregation
import { useEffect, useState } from "react";
import { listLocations, listLowStock } from "../../api/inventory";

export default function LowStock() {
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState("");
  const [aggregate, setAggregate] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState(null);
  const [selectedKey, setSelectedKey] = useState("");
  const [mode, setMode] = useState("PER_LOCATION");

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const res = await listLocations();
        setLocations(res.data || []);
      } catch (err) {
        setMessage(err?.response?.data?.message || "Failed to load locations.");
      }
    };
    loadLocations();
  }, []);

  const loadLowStock = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await listLowStock({
        locationId: locationId || undefined,
        aggregate: aggregate ? "true" : undefined,
      });
      setRows(res.data?.items || []);
      setMode(res.data?.mode || "PER_LOCATION");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to load low stock.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLowStock();
  }, [locationId, aggregate]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Low Stock</h2>
          <p className="muted">Items below minimum stock level.</p>
        </div>
        <button type="button" className="button-outline" onClick={loadLowStock}>
          Refresh
        </button>
      </div>

      {message ? <div className="alert">{message}</div> : null}

      <form className="filters-grid">
        <label className="field">
          Location
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            disabled={aggregate}
          >
            <option value="">All</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Aggregated view
          <select
            value={aggregate ? "true" : "false"}
            onChange={(e) => setAggregate(e.target.value === "true")}
          >
            <option value="false">Per location</option>
            <option value="true">All locations</option>
          </select>
        </label>
      </form>

      <div className="split-view">
        <section className="card list-panel">
          <div className="data-table">
            <div className="data-row data-header">
              <div>Product</div>
              {mode === "PER_LOCATION" ? <div>Location</div> : null}
              <div>Qty</div>
              <div>Min Stock</div>
            </div>
            {loading ? (
              <div className="muted">Loading...</div>
            ) : rows.length ? (
              rows.map((row, idx) => {
                const product = row.product || {};
                const qty =
                  mode === "PER_LOCATION"
                    ? row.quantity
                    : row.totalQuantity;
                const key = `${product.id || "row"}-${idx}`;
                return (
                  <button
                    type="button"
                    key={key}
                    className={`data-row data-button ${
                      selectedKey === key ? "data-selected" : ""
                    }`}
                    onClick={() => {
                      setSelected(row);
                      setSelectedKey(key);
                    }}
                  >
                    <div>
                      {product.name} ({product.sku})
                    </div>
                    {mode === "PER_LOCATION" ? (
                      <div>{row.location?.name || "-"}</div>
                    ) : null}
                    <div>{qty}</div>
                    <div>{product.minStock}</div>
                  </button>
                );
              })
            ) : (
              <div className="muted">No low stock items.</div>
            )}
          </div>
        </section>

        <section className="card preview-panel">
          <h3>Low Stock Preview</h3>
          {selected ? (
            <div className="stat-grid">
              <div>
                <div className="stat-label">Product</div>
                <div className="stat-value">{selected.product?.name}</div>
              </div>
              <div>
                <div className="stat-label">SKU</div>
                <div className="stat-value">{selected.product?.sku}</div>
              </div>
              <div>
                <div className="stat-label">Quantity</div>
                <div className="stat-value">
                  {mode === "PER_LOCATION"
                    ? selected.quantity
                    : selected.totalQuantity}
                </div>
              </div>
              <div>
                <div className="stat-label">Min Stock</div>
                <div className="stat-value">{selected.product?.minStock}</div>
              </div>
              {mode === "PER_LOCATION" ? (
                <div>
                  <div className="stat-label">Location</div>
                  <div className="stat-value">
                    {selected.location?.name || "-"}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="muted">Select an item to preview.</div>
          )}
        </section>
      </div>
    </div>
  );
}
