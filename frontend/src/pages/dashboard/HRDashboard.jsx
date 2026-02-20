import { Link } from "react-router-dom";

export default function HRDashboard() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>HR Dashboard</h2>
          <p className="muted">Employees, attendance, advances, and payroll.</p>
        </div>
      </div>

      <div className="cards-grid">
        <section className="card action-card">
          <h3>Employees</h3>
          <p className="muted">Create, update, and manage staff profiles.</p>
          <Link className="button-outline" to="/hr/employees">
            Manage Employees
          </Link>
        </section>
        <section className="card action-card">
          <h3>Attendance</h3>
          <p className="muted">Mark attendance and review attendance history.</p>
          <Link className="button-outline" to="/hr/attendance">
            Attendance
          </Link>
        </section>
        <section className="card action-card">
          <h3>Salary Advances</h3>
          <p className="muted">Approve and review salary advances.</p>
          <Link className="button-outline" to="/hr/advances">
            Salary Advances
          </Link>
        </section>
        <section className="card action-card">
          <h3>Payroll</h3>
          <p className="muted">Generate payroll runs and export bank sheets.</p>
          <Link className="button-outline" to="/hr/payroll">
            Payroll
          </Link>
        </section>
      </div>
    </div>
  );
}
