// src/pages/EmployeesPage.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import { useLocation } from 'react-router-dom';
import {
  listEmployees,
  createEmployee,
  deactivateEmployee,
  previewRoleModules,
  getJobRoleOptions,
  getEmploymentTypeOptions,
  createEmployeeLogin,
} from '../services/api.js';

/* ----------------------------- Small UI bits ----------------------------- */

function Badge({ children, tone = 'success' }) {
  const map = {
    success: { bg: '#DCFCE7', fg: '#166534' },   // green
    danger: { bg: '#FEE2E2', fg: '#991B1B' },    // red
    warning: { bg: '#FEF3C7', fg: '#92400E' },   // amber
    gray: { bg: '#E5E7EB', fg: '#374151' },
    info: { bg: '#DBEAFE', fg: '#1D4ED8' },
  };
  const c = map[tone] ?? map.gray;
  return (
    <span
      style={{
        padding: '3px 8px',
        borderRadius: 8,
        background: c.bg,
        color: c.fg,
        fontSize: 12,
        fontWeight: 600,
        display: 'inline-block',
        lineHeight: 1.2,
        textTransform: 'lowercase',
      }}
    >
      {String(children).toLowerCase()}
    </span>
  );
}

function SectionCard({ title, subtitle, children, action }) {
  return (
    <section style={{ padding: '20px 0' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0, color: '#155E63', fontSize: 24, fontWeight: 800 }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ margin: '6px 0 0', color: '#6B7280' }}>{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function PrimaryButton({ children, onClick, type = 'button', color = '#146b6b', disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '10px 14px',
        background: disabled ? '#94a3b8' : color,
        color: '#fff',
        border: 'none',
        borderRadius: 10,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: '0 3px 10px rgba(20,107,107,.20)',
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 12px',
        background: '#fff',
        color: '#374151',
        border: '1px solid #D1D5DB',
        borderRadius: 10,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

/* ----------------------------- Employee Form ----------------------------- */

function EmployeeForm({ onCancel, onSubmit, initial, companyId }) {
  const [form, setForm] = useState(() => ({
    employee_code: initial?.employee_code ?? '',
    personal: {
      first_name: initial?.first_name ?? '',
      last_name: initial?.last_name ?? '',
      date_of_birth: initial?.date_of_birth ?? '',
      gender: initial?.gender ?? '',
      avatar_url: initial?.avatar_url ?? '',
    },
    contact: {
      email: initial?.email ?? '',
      phone: initial?.phone ?? '',
      address_line1: initial?.address_line1 ?? '',
      address_line2: initial?.address_line2 ?? '',
      city: initial?.city ?? '',
      state: initial?.state ?? '',
      postal_code: initial?.postal_code ?? '',
      country: initial?.country ?? '',
    },
    employment: {
      department_id: initial?.department_id ?? '',
      job_role_id: initial?.job_role_id ?? '',
      employment_type_id: initial?.employment_type_id ?? '',
      start_date: initial?.start_date ?? '',
      rate_type: initial?.rate_type ?? 'monthly',
      rate_amount: initial?.rate_amount ?? 0,
    },
    qualifications: initial?.qualifications ?? [],
    emergency_contacts: initial?.emergency_contacts ?? [],
    account: {
      enable_login: false,
      password: '',
      password_confirm: '',
    },
  }));

  const [roleModules, setRoleModules] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [empTypeOptions, setEmpTypeOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errText, setErrText] = useState('');

  const handleChange = (path, value) => {
    setForm((prev) => {
      const next = structuredClone(prev);
      let node = next;
      for (let i = 0; i < path.length - 1; i++) node = node[path[i]];
      node[path[path.length - 1]] = value;
      return next;
    });
  };

  // Load dropdown options
  useEffect(() => {
    let alive = true;

    getEmploymentTypeOptions()
      .then((rows) => alive && setEmpTypeOptions(rows ?? []))
      .catch(() => alive && setEmpTypeOptions([]));

    getJobRoleOptions(companyId ? { companyId } : {})
      .then((rows) => alive && setRoleOptions(rows ?? []))
      .catch(() => alive && setRoleOptions([]));

    return () => { alive = false; };
  }, [companyId]);

  // Preview modules when role changes
  useEffect(() => {
    const jobRoleId = form.employment.job_role_id;
    if (!jobRoleId) {
      setRoleModules([]);
      return;
    }
    let alive = true;
    previewRoleModules(jobRoleId)
      .then((rows) => alive && setRoleModules(rows))
      .catch(() => alive && setRoleModules([]));
    return () => { alive = false; };
  }, [form.employment.job_role_id]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErrText('');
      // Validate account if enable_login
      if (form.account.enable_login) {
        if (!form.account.password || form.account.password.length < 8) {
          throw new Error('Password must be at least 8 characters');
        }
        if (form.account.password !== form.account.password_confirm) {
          throw new Error('Password does not match');
        }
        if (!form.contact.email) {
          throw new Error('Email is required when enabling login');
        }
      }
      await onSubmit(form);
    } catch (err) {
      setErrText(err?.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%',
    border: '1px solid #D1D5DB',
    borderRadius: 10,
    padding: '8px 10px',
  };
  const labelStyle = { fontSize: 13, fontWeight: 700, color: '#374151' };

  const canSubmit =
    !form.account.enable_login ||
    (form.account.password &&
      form.account.password.length >= 8 &&
      form.account.password === form.account.password_confirm);

  return (
    <form onSubmit={submit} className="emp-form">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <label>
          <div style={labelStyle}>First name</div>
          <input
            style={inputStyle}
            value={form.personal.first_name}
            onChange={(e) => handleChange(['personal', 'first_name'], e.target.value)}
            required
          />
        </label>
        <label>
          <div style={labelStyle}>Last name</div>
          <input
            style={inputStyle}
            value={form.personal.last_name}
            onChange={(e) => handleChange(['personal', 'last_name'], e.target.value)}
            required
          />
        </label>
        <label>
          <div style={labelStyle}>Email</div>
          <input
            style={inputStyle}
            type="email"
            value={form.contact.email}
            onChange={(e) => handleChange(['contact', 'email'], e.target.value)}
            required
          />
        </label>

        <label>
          <div style={labelStyle}>Phone</div>
          <input
            style={inputStyle}
            value={form.contact.phone}
            onChange={(e) => handleChange(['contact', 'phone'], e.target.value)}
          />
        </label>
        <label>
          <div style={labelStyle}>Department ID</div>
          <input
            style={inputStyle}
            type="number"
            value={form.employment.department_id}
            onChange={(e) =>
              handleChange(
                ['employment', 'department_id'],
                e.target.value ? Number(e.target.value) : ''
              )
            }
          />
        </label>

        {/* Job role SELECT */}
        <label>
          <div style={labelStyle}>Job role</div>
          <select
            style={inputStyle}
            value={form.employment.job_role_id}
            onChange={(e) =>
              handleChange(
                ['employment', 'job_role_id'],
                e.target.value ? Number(e.target.value) : ''
              )
            }
          >
            <option value="">-- Select job role --</option>
            {roleOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {`${r.code} — ${r.name}`}
              </option>
            ))}
          </select>
        </label>

        {/* Employment type SELECT */}
        <label>
          <div style={labelStyle}>Employment type</div>
          <select
            style={inputStyle}
            value={form.employment.employment_type_id}
            onChange={(e) =>
              handleChange(
                ['employment', 'employment_type_id'],
                e.target.value ? Number(e.target.value) : ''
              )
            }
          >
            <option value="">-- Select employment type --</option>
            {empTypeOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <div style={labelStyle}>Start date</div>
          <input
            style={inputStyle}
            type="date"
            value={form.employment.start_date ?? ''}
            onChange={(e) => handleChange(['employment', 'start_date'], e.target.value)}
          />
        </label>

        <label>
          <div style={labelStyle}>Rate type</div>
          <select
            style={inputStyle}
            value={form.employment.rate_type}
            onChange={(e) => handleChange(['employment', 'rate_type'], e.target.value)}
          >
            <option value="hourly">hourly</option>
            <option value="daily">daily</option>
            <option value="monthly">monthly</option>
            <option value="annual">annual</option>
          </select>
        </label>
        <label>
          <div style={labelStyle}>Rate amount</div>
          <input
            style={inputStyle}
            type="number"
            value={form.employment.rate_amount}
            onChange={(e) =>
              handleChange(['employment', 'rate_amount'], Number(e.target.value))
            }
          />
        </label>
      </div>

      {/* Preview modules */}
      <div style={{ margin: '12px 0 6px', fontWeight: 700, color: '#374151' }}>
        Module access preview:
      </div>
      <ul style={{ marginTop: 4 }}>
        {roleModules.map((m) => (
          <li key={m.module_key}>{m.display_name}</li>
        ))}
        {roleModules.length === 0 && <li>(no modules)</li>}
      </ul>

      {/* Enable Login */}
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #E5E7EB' }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={form.account.enable_login}
            onChange={(e) => handleChange(['account', 'enable_login'], e.target.checked)}
          />
          <span style={{ fontWeight: 700, color: '#374151' }}>Enable login for this employee</span>
        </label>
        {form.account.enable_login && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12 }}>
            <label>
              <div style={labelStyle}>Password</div>
              <input
                style={inputStyle}
                type="password"
                value={form.account.password}
                onChange={(e) => handleChange(['account', 'password'], e.target.value)}
                placeholder="At least 8 characters"
                required
              />
            </label>
            <label>
              <div style={labelStyle}>Confirm password</div>
              <input
                style={inputStyle}
                type="password"
                value={form.account.password_confirm}
                onChange={(e) => handleChange(['account', 'password_confirm'], e.target.value)}
                required
              />
            </label>

          </div>
        )}
      </div>

      {errText && (
        <div style={{ color: '#B91C1C', marginTop: 6, fontSize: 13 }}>{errText}</div>
      )}

      <div
        className="form-actions"
        style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}
      >
        <GhostButton onClick={onCancel}>Cancel</GhostButton>
        <PrimaryButton type="submit" disabled={!canSubmit}>
          {saving ? 'Saving…' : 'Save'}
        </PrimaryButton>
      </div>
    </form>
  );
}

/* ----------------------------- Page ----------------------------- */

export default function EmployeesPage() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [error, setError] = useState('');
  const [loginForId, setLoginForId] = useState(null);
  const [loginPw, setLoginPw] = useState('');
  const [loginPw2, setLoginPw2] = useState('');
  const [loginSaving, setLoginSaving] = useState(false);
  const searchRef = useRef(null);

  // For super admin: read ?companyId= from URL (optional)
  const location = useLocation();
  const companyId = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const c = sp.get('companyId');
    return c ? Number(c) : null;
  }, [location.search]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { ...(q ? { q } : {}), ...(companyId ? { companyId } : {}) };
      const resp = await listEmployees(params);
      const arr = Array.isArray(resp?.data) ? resp.data : [];
      setRows(arr);
    } catch (e) {
      setError(e.message ?? 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [q, companyId]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const fullName = ((r.first_name ?? '') + ' ' + (r.last_name ?? '')).trim();
      return (
        fullName.toLowerCase().includes(s) ||
        (r.email ?? '').toLowerCase().includes(s) ||
        (r.department ?? '').toLowerCase().includes(s) ||
        (r.role ?? '').toLowerCase().includes(s)
      );
    });
  }, [rows, q]);

  const handleCreate = async (payload) => {
    const created = await createEmployee(payload);
    if (created?.id) {
      await refresh();
    }
    setOpenAdd(false);
  };

  const handleDeactivate = async (id) => {
    const r = await deactivateEmployee(id);
    setRows((prev) => prev.map((x) => (x.id === id ? { ...x, status: r.status } : x)));
  };

  const openCreateLogin = (id) => {
    setLoginForId(id);
    setLoginPw('');
    setLoginPw2('');
  };
  const closeCreateLogin = () => {
    setLoginForId(null);
    setLoginPw('');
    setLoginPw2('');
  };
  const doCreateLogin = async () => {
    try {
      if (!loginPw || loginPw.length < 8) throw new Error('Password must be at least 8 characters');
      if (loginPw !== loginPw2) throw new Error('Password does not match');
      setLoginSaving(true);
      const resp = await createEmployeeLogin(loginForId, { password: loginPw, ...(companyId ? { companyId } : {}) });
      const userId = resp?.user_id ?? resp?.data?.user_id;
      setRows((prev) => prev.map((x) => (x.id === loginForId ? { ...x, user_id: userId ?? x.user_id } : x)));
      closeCreateLogin();
    } catch (err) {
      alert(err?.message ?? 'Failed to create login');
    } finally {
      setLoginSaving(false);
    }
  };

  /* ----------------------------- Render ----------------------------- */

  const tableHeadStyle = {
    textAlign: 'left',
    fontSize: 12,
    color: '#6B7280',
    fontWeight: 800,
    padding: '10px 12px',
    borderBottom: '1px solid #E5E7EB',
  };
  const cellStyle = {
    padding: '12px',
    borderBottom: '1px solid #F3F4F6',
    fontSize: 14,
    color: '#111827',
    verticalAlign: 'middle',
  };

  return (
    <div style={{ padding: '20px 24px' }}>
      <SectionCard
        title="Employees"
        subtitle="Add, view, and manage your staff."
        action={<PrimaryButton onClick={() => setOpenAdd(true)}>Add Employee</PrimaryButton>}
      >
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <input
            ref={searchRef}
            type="search"
            placeholder="Search name / email / department / role..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{
              flex: '0 0 360px',
              border: '1px solid #D1D5DB',
              borderRadius: 12,
              padding: '10px 12px',
            }}
            aria-label="Search employees"
          />

          {/* (optional) companyId hint for Super Admin */}
          {companyId && (
            <span style={{ fontSize: 12, color: '#6B7280' }}>
              Company ID: <strong>{companyId}</strong>
            </span>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ padding: '16px 0', color: '#6B7280' }}>Loading…</div>
        ) : error ? (
          <div style={{ padding: '12px', background: '#FEF2F2', color: '#991B1B', borderRadius: 10 }}>
            {error}
          </div>
        ) : (
          <div className="emp-table-wrap" style={{ background: '#fff', borderRadius: 14 }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th style={tableHeadStyle}>Name</th>
                  <th style={tableHeadStyle}>Role</th>
                  <th style={tableHeadStyle}>Department</th>
                  <th style={tableHeadStyle}>Email</th>
                  <th style={tableHeadStyle}>Status</th>
                  <th style={tableHeadStyle}>Login</th>
                  <th style={{ ...tableHeadStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td style={cellStyle}>
                      <strong style={{ color: '#0F172A' }}>
                        {(r.first_name ?? '') + ' ' + (r.last_name ?? '')}
                      </strong>
                    </td>
                    <td style={cellStyle}>{r.role ?? '-'}</td>
                    <td style={cellStyle}>{r.department ?? '-'}</td>
                    <td style={cellStyle}>{r.email}</td>
                    <td style={cellStyle}>
                      <Badge tone={r.status === 'active' ? 'success' : 'gray'}>{r.status}</Badge>
                    </td>
                    <td style={cellStyle}>
                      {r.user_id ? (
                        <Badge tone="info">has login</Badge>
                      ) : (
                        <button
                          onClick={() => openCreateLogin(r.id)}
                          style={{
                            padding: '6px 10px',
                            height: 32,
                            lineHeight: '20px',
                            background: '#fff',
                            color: '#1D4ED8',
                            border: '1px solid #93C5FD',
                            borderRadius: 8,
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: 'pointer',
                          }}
                          title="Create Login"
                        >
                          Create Login
                        </button>
                      )}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right' }}>
                      {r.status === 'active' ? (
                        <button
                          onClick={() => handleDeactivate(r.id)}
                          style={{
                            padding: '6px 10px',
                            height: 32,
                            lineHeight: '20px',
                            background: '#fff',
                            color: '#B91C1C',
                            border: '1px solid #FCA5A5',
                            borderRadius: 8,
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: 'pointer',
                            transition: 'all .15s ease',
                          }}
                          title="Deactivate"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#FEF2F2';
                            e.currentTarget.style.borderColor = '#F87171';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#fff';
                            e.currentTarget.style.borderColor = '#FCA5A5';
                          }}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <span style={{ color: '#6B7280', fontSize: 12 }}>(inactive)</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} style={{ ...cellStyle, color: '#6B7280' }}>
                      (no data)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Modal Add */}
      {openAdd && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setOpenAdd(false)}
        >
          <div
            className="modal"
            style={{
              width: 'min(900px, 92vw)',
              background: '#fff',
              borderRadius: 16,
              padding: 18,
              boxShadow: '0 20px 60px rgba(0,0,0,.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 6,
              }}
            >
              <h3 style={{ margin: 0, color: '#0F172A' }}>Add New Employee</h3>
              <GhostButton onClick={() => setOpenAdd(false)}>Close</GhostButton>
            </div>

            <EmployeeForm
              companyId={companyId ?? undefined}
              onCancel={() => setOpenAdd(false)}
              onSubmit={handleCreate}
            />
          </div>
        </div>
      )}

      {/* Modal Create Login */}
      {loginForId && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
          }}
          onClick={closeCreateLogin}
        >
          <div
            className="modal"
            style={{
              width: 'min(520px, 92vw)',
              background: '#fff',
              borderRadius: 16,
              padding: 18,
              boxShadow: '0 20px 60px rgba(0,0,0,.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px', color: '#0F172A' }}>Create Login</h3>
            <p style={{ marginTop: 0, color: '#6B7280', fontSize: 13 }}>
              Set a password for this employee (min 8 chars). The login email is their employee email.
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              <input
                type="password"
                placeholder="Password"
                value={loginPw}
                onChange={(e) => setLoginPw(e.target.value)}
                style={{
                  border: '1px solid #D1D5DB',
                  borderRadius: 10,
                  padding: '8px 10px',
                }}
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={loginPw2}
                onChange={(e) => setLoginPw2(e.target.value)}
                style={{
                  border: '1px solid #D1D5DB',
                  borderRadius: 10,
                  padding: '8px 10px',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
              <GhostButton onClick={closeCreateLogin}>Cancel</GhostButton>
              <PrimaryButton onClick={doCreateLogin} disabled={loginSaving || !loginPw || loginPw !== loginPw2}>
                {loginSaving ? 'Creating…' : 'Create'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}