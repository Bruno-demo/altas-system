import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const homeByRole = {
  CASHIER: "/cashier",
  STORE_KEEPER: "/storekeeper",
  MANAGER: "/manager",
  HR: "/hr",
  CEO: "/ceo",
  SALESPERSON: "/motorbikes",
};

export default function Forbidden() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const home = token && user ? homeByRole[user.role] || "/login" : "/login";

  return (
    <div className="page status-page">
      <div className="card status-card">
        <div className="status-badge">403</div>
        <h2 className="status-title">Access denied</h2>
        <p className="muted status-subtitle">
          You do not have permission to view this page. If you think this is a
          mistake, contact your administrator.
        </p>
        <div className="status-actions">
          <button type="button" onClick={() => navigate(-1)}>
            Go Back
          </button>
          <Link className="button-outline" to={home}>
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
