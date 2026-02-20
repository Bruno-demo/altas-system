import { Link } from "react-router-dom";

export default function StoreKeeperDashboard() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Store Keeper Dashboard</h2>
          <p className="muted">Inventory, bins, and stock operations.</p>
        </div>
      </div>

      <div className="cards-grid">
        <section className="card action-card">
          <h3>Inventory</h3>
          <p className="muted">Review stock levels across locations.</p>
          <Link className="button-outline" to="/stock/inventory">
            Open Inventory
          </Link>
        </section>
        <section className="card action-card">
          <h3>Stock Adjustments</h3>
          <p className="muted">Record stock in, out, or damage.</p>
          <Link className="button-outline" to="/stock/adjustments">
            Adjust Stock
          </Link>
        </section>
        <section className="card action-card">
          <h3>Low Stock</h3>
          <p className="muted">Monitor items below minimum.</p>
          <Link className="button-outline" to="/stock/low-stock">
            View Low Stock
          </Link>
        </section>
        <section className="card action-card">
          <h3>Products</h3>
          <p className="muted">Add or review product catalog.</p>
          <Link className="button-outline" to="/products">
            Manage Products
          </Link>
        </section>
        <section className="card action-card">
          <h3>Bins</h3>
          <p className="muted">Manage storage bins by location.</p>
          <Link className="button-outline" to="/bins">
            Manage Bins
          </Link>
        </section>
        <section className="card action-card">
          <h3>Transactions</h3>
          <p className="muted">Audit stock movement history.</p>
          <Link className="button-outline" to="/stock/transactions">
            View Transactions
          </Link>
        </section>
      </div>
    </div>
  );
}
