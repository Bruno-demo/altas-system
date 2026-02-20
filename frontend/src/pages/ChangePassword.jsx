// What this does: forces user to change password and clears mustChangePassword on success
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { changePasswordApi } from "../api/auth";
import { useAuth } from "../auth/AuthContext";

export default function ChangePassword() {
  const nav = useNavigate();
  const { user, login } = useAuth();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");

    try {
      await changePasswordApi({ oldPassword, newPassword });

      // What this does: locally clear mustChangePassword so ProtectedRoute stops redirecting
      const updatedUser = { ...user, mustChangePassword: false };
      login({ token: localStorage.getItem("token"), user: updatedUser });

      nav("/", { replace: true });
    } catch (err) {
      setMsg(err?.response?.data?.message || "Change password failed");
    }
  };

  return (
    <div className="page change-password-page">
      <div className="change-password-shell">
        <h1>Change Password</h1>
        <div className="muted change-password-note">
          You must change your password before using the system.
        </div>

        {msg ? <div className="alert change-password-alert">{msg}</div> : null}

        <form onSubmit={submit} className="card form change-password-form">
          <label className="field">
            Old password
            <input
              placeholder="Old password"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </label>
          <label className="field">
            New password
            <input
              placeholder="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </label>

          <button type="submit">Update Password</button>
        </form>
      </div>
    </div>
  );
}
