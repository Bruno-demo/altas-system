import { Link } from "react-router-dom";

export default function CEODashboard() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>CEO Dashboard</h2>
          <p className="muted">Company health, alerts, and KPIs.</p>
        </div>
      </div>

      <div className="cards-grid">
        <section className="card action-card">
          <h3>Reports Overview</h3>
          <p className="muted">KPIs, summary, and cashflow.</p>
          <Link className="button-outline" to="/reports/overview">
            View Overview
          </Link>
        </section>
        <section className="card action-card">
          <h3>Sales Reports</h3>
          <p className="muted">Sales by payment, best sellers, profit.</p>
          <Link className="button-outline" to="/reports/sales">
            View Sales Reports
          </Link>
        </section>
        <section className="card action-card">
          <h3>EBM Dashboard</h3>
          <p className="muted">Pending invoices and EBM status.</p>
          <Link className="button-outline" to="/reports/ebm">
            View EBM
          </Link>
        </section>
        <section className="card action-card">
          <h3>Stock Valuation</h3>
          <p className="muted">Inventory value by cost and sell.</p>
          <Link className="button-outline" to="/reports/stock-valuation">
            View Valuation
          </Link>
        </section>
        <section className="card action-card">
          <h3>Audit Viewer</h3>
          <p className="muted">System activity and changes.</p>
          <Link className="button-outline" to="/reports/audit">
            View Audit Logs
          </Link>
        </section>
      </div>
    </div>
  );
}
