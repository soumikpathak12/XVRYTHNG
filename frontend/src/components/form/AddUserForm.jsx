import { useState } from "react";
import { Eye, EyeOff } from "lucide-react"; // <-- add this

export default function AddUserForm({
  onSubmit,
  loading = false,
  error,
  success,
  roles = [],
  companies = [],
  defaultValues = {},
  showCompany = true,
}) {
  const [values, setValues] = useState({
    name: defaultValues.name || "",
    email: defaultValues.email || "",
    password: "",
    confirm: "",
    roleId: defaultValues.roleId || "",
    companyId: defaultValues.companyId || "",
    status: defaultValues.status || "active",
  });

  const [showPwd, setShowPwd] = useState(false);

  const update = (field) => (e) =>
    setValues((v) => ({ ...v, [field]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!values.name.trim()) return;
    if (!/^\S+@\S+\.\S+$/.test(values.email)) return;
    if (values.password.length < 8) return;
    if (values.password !== values.confirm) return;

    const payload = {
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      password: values.password,
      roleId: Number(values.roleId) || null,
      companyId: showCompany
        ? values.companyId
          ? Number(values.companyId)
          : null
        : null,
      status: values.status,
    };
    onSubmit?.(payload);
  };

  return (
    <form
      onSubmit={submit}
      style={{
        maxWidth: 640,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 22,
      }}
    >
      {/* Header */}
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 800,
            color: "#0f1a2b",
          }}
        >
          Add New User
        </h2>
        <p style={{ margin: "6px 0 0", color: "#6B7280", fontSize: 15 }}>
          Create a user with role, company assignment, and initial password.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div
          style={{
            padding: "14px 16px",
            background: "#FEE2E2",
            color: "#7F1D1D",
            borderRadius: 12,
            border: "1px solid #FCA5A5",
            fontSize: 15,
          }}
        >
          {typeof error === "string" ? error : "Unable to create user."}
        </div>
      )}

      {success && (
        <div
          style={{
            padding: "14px 16px",
            background: "#DCFCE7",
            color: "#065F46",
            borderRadius: 12,
            border: "1px solid #86EFAC",
            fontSize: 15,
          }}
        >
          {success}
        </div>
      )}

      {/* Card */}
      <div
        style={{
          background: "#fff",
          padding: 24,
          borderRadius: 16,
          border: "1px solid #E5E7EB",
          boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Name */}
        <Field label="Full Name">
          <input
            value={values.name}
            onChange={update("name")}
            placeholder="Jane Doe"
            required
            style={input}
          />
        </Field>

        {/* Email */}
        <Field label="Email">
          <input
            type="email"
            value={values.email}
            onChange={update("email")}
            placeholder="jane@company.com"
            required
            style={input}
          />
        </Field>

        {/* Password + Confirm */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <Field label="Password (min 8 chars)">
            <div style={{ position: "relative" }}>
              <input
                type={showPwd ? "text" : "password"}
                value={values.password}
                onChange={update("password")}
                placeholder="••••••••"
                required
                minLength={8}
                style={{ ...input, paddingRight: 44 }}
                aria-label="Password"
              />
              <IconToggleButton
                pressed={showPwd}
                onClick={() => setShowPwd((v) => !v)}
                label={showPwd ? "Hide password" : "Show password"}
              />
            </div>
          </Field>

          <Field label="Confirm Password">
            <div style={{ position: "relative" }}>
              <input
                type={showPwd ? "text" : "password"}
                value={values.confirm}
                onChange={update("confirm")}
                placeholder="••••••••"
                required
                minLength={8}
                style={{ ...input, paddingRight: 44 }}
                aria-label="Confirm password"
              />
              {/* Use the same toggle to mirror the visibility state */}
              <IconToggleButton
                pressed={showPwd}
                onClick={() => setShowPwd((v) => !v)}
                label={showPwd ? "Hide password" : "Show password"}
              />
            </div>
          </Field>
        </div>

        {/* Role & Company */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: showCompany ? "1fr 1fr" : "1fr",
            gap: 20,
          }}
        >
          <Field label="Role">
            <select
              value={values.roleId}
              onChange={update("roleId")}
              required
              style={input}
            >
              <option value="" disabled>
                Select role
              </option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>

          {showCompany && (
            <Field label="Company">
              <select
                value={values.companyId}
                onChange={update("companyId")}
                style={input}
              >
                <option value="">— None —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        {/* Status */}
        <Field label="Status">
          <select value={values.status} onChange={update("status")} style={input}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12 }}>
        <button type="submit" disabled={loading} style={primaryBtn}>
          {loading ? "Creating…" : "Create User"}
        </button>

        <button
          type="button"
          disabled={loading}
          style={secondaryBtn}
          onClick={() => window.history.back()}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/* Reusable Field wrapper */
function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>{label}</span>
      {children}
    </label>
  );
}

/* Small, accessible icon toggle button placed inside inputs (right side) */
function IconToggleButton({ pressed, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      style={iconBtn}
    >
      {pressed ? <EyeOff size={18} color="#374151" /> : <Eye size={18} color="#374151" />}
    </button>
  );
}

/* Styles */
const input = {
  height: 44,
  border: "1px solid #D1D5DB",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  background: "#fff",
};

const iconBtn = {
  position: "absolute",
  right: 10,
  top: 8,
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "1px solid #E5E7EB",
  background: "#F3F4F6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const primaryBtn = {
  background: "#146b6b",
  color: "#fff",
  borderRadius: 12,
  padding: "12px 20px",
  border: "none",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 4px 14px rgba(20,107,107,.25)",
};

const secondaryBtn = {
  background: "#fff",
  color: "#374151",
  borderRadius: 12,
  padding: "12px 20px",
  border: "1px solid #D1D5DB",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};