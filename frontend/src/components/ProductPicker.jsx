import { useEffect, useState } from "react";
import Modal from "./Modal";
import { listProducts } from "../api/inventory";

export default function ProductPicker({ open, onClose, onSelect }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setQ("");
    setRows([]);
    setMessage("");
  }, [open]);

  const search = async (event) => {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const res = await listProducts({ q: q.trim() || undefined });
      const items = Array.isArray(res.data) ? res.data : [];
      setRows(items);
      if (!items.length) setMessage("No products found.");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  const handlePick = (product) => {
    onSelect?.(product);
    onClose?.();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Select Product"
      footer={
        <button type="button" className="button-outline" onClick={onClose}>
          Done
        </button>
      }
    >
      <form onSubmit={search} className="filter-row">
        <input
          placeholder="Search by SKU, name, part number..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {message ? <div className="alert">{message}</div> : null}

      <div className="picker-list">
        {rows.map((p) => (
          <button
            type="button"
            key={p.id}
            className="picker-item"
            onClick={() => handlePick(p)}
          >
            <div className="picker-title">{p.name}</div>
            <div className="picker-meta">
              SKU: {p.sku} | Part: {p.partNumber || "-"} | Brand: {p.brand || "-"}
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
