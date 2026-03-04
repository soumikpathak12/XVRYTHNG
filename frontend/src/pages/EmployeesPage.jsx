// src/pages/EmployeesPage.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  listEmployees,
  createEmployee,
  deactivateEmployee,
  previewRoleModules,
  getJobRoleOptions,
  getEmploymentTypeOptions,
  createEmployeeLogin,
  getEmployee,
  updateEmployee,
} from '../services/api.js';

// New UI components (đã gửi riêng):
import OverviewStatCards from '../components/employees/OverviewStatCards.jsx';
import FiltersBar from '../components/employees/FiltersBar.jsx';
import QuickCheckIn from '../components/employees/QuickCheckIn.jsx';
import PendingLeaveList from '../components/employees/PendingLeaveList.jsx';

/* ----------------------------- Small UI bits ----------------------------- */
function Badge({ children, tone = 'success' }) {
  const map = {
    success: { bg: '#DCFCE7', fg: '#166534' },
    danger: { bg: '#FEE2E2', fg: '#991B1B' },
    warning: { bg: '#FEF3C7', fg: '#92400E' },
    gray: { bg: '#E5E7EB', fg: '#374151' },
    info: { bg: '#DBEAFE', fg: '#1D4ED8' },
  };
  const c = map[tone] ?? map.gray;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: c.bg,
        color: c.fg,
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        textTransform: 'lowercase',
      }}
    >
      {String(children).toLowerCase()}
    </span>
  );
}

function PrimaryButton({ children, onClick, type = 'button', color = '#146b6b', disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 14px',
        background: disabled ? '#8fb3b3' : color,
        color: '#fff',
        border: 'none',
        borderRadius: 10,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: '0 2px 6px rgba(20,107,107,0.25)',
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        padding: '8px 14px',
        background: '#fff',
        color: '#111827',
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

/* ----------------------------- Employee Form (FULL) ----------------------------- */
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
    account: { enable_login: false, password: '', password_confirm: '' },
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
    <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
      {/* Employee Code (read-only on edit if present) */}
      {Boolean(initial?.employee_code) && (
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>Employee code</label>
          <input
            type="text"
            value={initial.employee_code}
            disabled
            style={{ ...inputStyle, background: '#F9FAFB', color: '#6B7280' }}
          />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>First name</label>
          <input
            style={inputStyle}
            value={form.personal.first_name}
            onChange={(e) => handleChange(['personal', 'first_name'], e.target.value)}
            required
          />
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>Last name</label>
          <input
            style={inputStyle}
            value={form.personal.last_name}
            onChange={(e) => handleChange(['personal', 'last_name'], e.target.value)}
            required
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            style={inputStyle}
            value={form.contact.email}
            onChange={(e) => handleChange(['contact', 'email'], e.target.value)}
            required
          />
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>Phone</label>
          <input
            style={inputStyle}
            value={form.contact.phone}
            onChange={(e) => handleChange(['contact', 'phone'], e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>Department ID</label>
          <input
            style={inputStyle}
            value={form.employment.department_id}
            onChange={(e) =>
              handleChange(
                ['employment', 'department_id'],
                e.target.value ? Number(e.target.value) : ''
              )
            }
          />
        </div>

        {/* Job role SELECT */}
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>Job role</label>
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
          {!initial?.employee_code && (
            <div style={{ fontSize: 12, color: '#6B7280' }}>
              The employee code will be generated automatically from the job role, e.g. <b>XTR-DIR-001</b>.
            </div>
          )}
        </div>
      </div>

      {/* Employment type SELECT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>Employment type</label>
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
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>Start date</label>
          <input
            type="date"
            style={inputStyle}
            value={form.employment.start_date}
            onChange={(e) => handleChange(['employment', 'start_date'], e.target.value)}
          />
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>Rate type</label>
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
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>Rate amount</label>
          <input
            type="number"
            step="0.01"
            style={inputStyle}
            value={form.employment.rate_amount}
            onChange={(e) => handleChange(['employment', 'rate_amount'], Number(e.target.value))}
          />
        </div>
      </div>

      {/* Module Preview */}
      <div style={{ display: 'grid', gap: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>Module access preview:</div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {roleModules.map((m) => (
            <li key={m.module_key} style={{ fontSize: 13 }}>
              {m.display_name}
            </li>
          ))}
          {roleModules.length === 0 && (
            <li style={{ fontSize: 13, color: '#6B7280' }}>(no modules)</li>
          )}
        </ul>
      </div>

      {/* Enable Login */}
      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={form.account.enable_login}
            onChange={(e) => handleChange(['account', 'enable_login'], e.target.checked)}
          />
          Enable login for this employee
        </label>
        <div style={{ fontSize: 12, color: '#6B7280', marginTop: -6, marginBottom: 6 }}>
          An onboarding email with the login credentials will be sent to the employee's email.
        </div>
        {form.account.enable_login && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                style={inputStyle}
                value={form.account.password}
                onChange={(e) => handleChange(['account', 'password'], e.target.value)}
                placeholder="At least 8 characters"
                required
              />
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={labelStyle}>Confirm password</label>
              <input
                type="password"
                style={inputStyle}
                value={form.account.password_confirm}
                onChange={(e) => handleChange(['account', 'password_confirm'], e.target.value)}
                required
              />
            </div>
          </div>
        )}
      </div>

      {/* Errors */}
      {errText && (
        <div style={{ color: '#B91C1C', fontWeight: 600, fontSize: 13 }}>{errText}</div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
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
  const brand = '#146b6b';
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editInitial, setEditInitial] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [error, setError] = useState('');

  const [loginForId, setLoginForId] = useState(null);
  const [loginPw, setLoginPw] = useState('');
  const [loginPw2, setLoginPw2] = useState('');
  const [loginSaving, setLoginSaving] = useState(false);

  const [roleOptions, setRoleOptions] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');      // job_role_id
  const [statusFilter, setStatusFilter] = useState('');  // active|on_leave|inactive|terminated

  const searchRef = useRef(null);

  // For super admin: read ?companyId= from URL (optional)
  const location = useLocation();
  const companyId = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const c = sp.get('companyId');
    return c ? Number(c) : null;
  }, [location.search]);
    const qs = useMemo(() => (companyId ? `?companyId=${companyId}` : ''), [companyId]);

  // Load role options for filter
  useEffect(() => {
    let alive = true;
    getJobRoleOptions(companyId ? { companyId } : {})
      .then((rows) => alive && setRoleOptions(rows ?? []))
      .catch(() => alive && setRoleOptions([]));
    return () => { alive = false; };
  }, [companyId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        ...(q ? { q } : {}),
        ...(companyId ? { companyId } : {}),
        ...(roleFilter ? { job_role_id: Number(roleFilter) } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      };
      const resp = await listEmployees(params);
      const arr = Array.isArray(resp?.data) ? resp.data : [];
      setRows(arr);
    } catch (e) {
      setError(e.message ?? 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [q, roleFilter, statusFilter, companyId]);

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
  const stats = useMemo(() => {
    const totalEmployees = rows.length;
    const onLeave = rows.filter(r => r.status === 'on_leave').length;
    const checkedInToday = 12;     // demo value
    const pendingExpenses = 7;     // demo value
    return { totalEmployees, onLeave, checkedInToday, pendingExpenses };
  }, [rows]);

  const employeesSelect = useMemo(() =>
    rows.map(r => ({ id: r.id, name: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || r.email })), [rows]
  );

  const openEditModal = async (id) => {
    try {
      setEditLoading(true);
      setEditId(id);
      const detail = await getEmployee(id, companyId ? { companyId } : {});
      const data = detail?.data ?? detail;
      setEditInitial(data || {});
      setOpenEdit(true);
    } catch (e) {
      alert(e?.message ?? 'Failed to load employee');
    } finally {
      setEditLoading(false);
    }
  };

  const handleCreate = async (payload) => {
    const created = await createEmployee(payload);
    if (created?.id) await refresh();
    setOpenAdd(false);
  };

  const handleUpdate = async (payload) => {
    await updateEmployee(editId, payload, companyId ? { companyId } : {});
    await refresh();
    setOpenEdit(false);
    setEditInitial(null);
    setEditId(null);
  };

  const handleDeactivate = async (id) => {
    const r = await deactivateEmployee(id);
    setRows((prev) => prev.map((x) => (x.id === id ? { ...x, status: r.status } : x)));
  };

  const openCreateLogin = (id) => {
    setLoginForId(id); setLoginPw(''); setLoginPw2('');
  };
  const closeCreateLogin = () => {
    setLoginForId(null); setLoginPw(''); setLoginPw2('');
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
    <div style={{ display: 'grid', gap: 14 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: 14, border: '1px solid #E5E7EB', borderRadius: 12, background: '#F9FAFB'
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#111827' }}>Employee Management</div>
          <div style={{ fontSize: 13, color: '#6B7280' }}>
            Manage team members, attendance, and leave
          </div>
        </div>
        
      </div>

      {/* KPI Cards */}
      <OverviewStatCards stats={stats} />

      {/* Filters */}
    
      <FiltersBar
        q={q} setQ={setQ}
        roleFilter={roleFilter} setRoleFilter={setRoleFilter} roleOptions={roleOptions}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        onAddEmployee={() => navigate(`new${qs}`, { relative: 'path' })}
        brand={brand}
      />


      {/* List */}
      {loading ? (
        <div>Loading…</div>
      ) : error ? (
        <div style={{ color: '#B91C1C', fontWeight: 600 }}>{error}</div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: 12, background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeadStyle}>Employee</th>
                <th style={tableHeadStyle}>Code</th>
                <th style={tableHeadStyle}>Role</th>
                <th style={tableHeadStyle}>Department</th>
                <th style={tableHeadStyle}>Contact</th>
                <th style={tableHeadStyle}>Status</th>
                <th style={tableHeadStyle}>Last check-in</th>
                <th style={tableHeadStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td style={cellStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 999, background: '#E5E7EB' }} />
                      <div style={{ fontWeight: 800 }}>
                        {(r.first_name ?? '') + ' ' + (r.last_name ?? '')}
                      </div>
                    </div>
                  </td>
                  <td style={cellStyle}>{r.employee_code ?? '-'}</td>
                  <td style={cellStyle}>{r.role ?? '-'}</td>
                  <td style={cellStyle}>{r.department ?? '-'}</td>
                  <td style={cellStyle}>
                    <div style={{ color: '#374151' }}>{r.email}</div>
                    {r.phone && <div style={{ color: '#6B7280', fontSize: 12 }}>{r.phone}</div>}
                  </td>
                  <td style={cellStyle}>
                    <Badge tone={r.status === 'active' ? 'success' : r.status === 'on_leave' ? 'warning' : 'gray'}>
                      {r.status}
                    </Badge>
                  </td>
                  <td style={cellStyle}>—</td>
                  <td style={cellStyle}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      
                     
                      <button
                         onClick={() => navigate(`${r.id}${qs}`, { relative: 'path' })}
                         style={{
                           padding: '6px 10px', height: 32, lineHeight: '20px',
                           background: '#fff', color: '#374151', border: '1px solid #D1D5DB',
                           borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
                         }}
                         title="View Profile"
                       >
                         View Profile
                     </button>


                      <button
                        onClick={() => openEditModal(r.id)}
                        style={{
                          padding: '6px 10px', height: 32, lineHeight: '20px',
                          background: '#fff', color: brand, border: '1px solid #8fb3b3',
                          borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>

                      {r.user_id ? (
                        <Badge tone="info">has login</Badge>
                      ) : (
                        <button
                          onClick={() => openCreateLogin(r.id)}
                          style={{
                            padding: '6px 10px', height: 32, lineHeight: '20px',
                            background: '#fff', color: '#1D4ED8', border: '1px solid #93C5FD',
                            borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
                          }}
                          title="Create Login"
                        >
                          Create Login
                        </button>
                      )}

                      {r.status === 'active' ? (
                        <button
                          onClick={() => handleDeactivate(r.id)}
                          style={{
                            padding: '6px 10px', height: 32, lineHeight: '20px',
                            background: '#fff', color: '#B91C1C', border: '1px solid #FCA5A5',
                            borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
                          }}
                          title="Deactivate"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <Badge tone="gray">(inactive)</Badge>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td style={{ ...cellStyle, color: '#6B7280' }} colSpan={8}>
                    (no data)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        <QuickCheckIn
          employees={employeesSelect}
          onRecord={({ employeeId, checkinType }) => {
            const name = employeesSelect.find(e => e.id === employeeId)?.name || `#${employeeId}`;
            alert(`Recorded: ${checkinType} for ${name} (UI only)`);
          }}
          brand={brand}
        />
        <PendingLeaveList brand={brand} />
      </div>

      
      {/* Modal Edit */}
      {openEdit && (
        <div
          onClick={() => setOpenEdit(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)',
            display: 'grid', placeItems: 'center', zIndex: 40,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 12, padding: 18, width: 760, maxWidth: '98%' }}
          >
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#111827' }}>
              Edit Employee
            </h4>
            <div style={{ marginTop: 10 }}>
              {editLoading ? (
                <div>Loading…</div>
              ) : (
                <EmployeeForm
                  initial={editInitial}
                  companyId={companyId ?? null}
                  onCancel={() => setOpenEdit(false)}
                  onSubmit={handleUpdate}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Create Login */}
      {loginForId && (
        <div
          onClick={() => closeCreateLogin()}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)',
            display: 'grid', placeItems: 'center', zIndex: 40,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 12, padding: 18, width: 520, maxWidth: '95%' }}
          >
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#111827' }}>
              Create Login
            </h4>
            <p style={{ margin: '8px 0 14px', color: '#6B7280', fontSize: 13 }}>
              Set a password for this employee (min 8 chars). The login email is their employee email.
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              <input
                type="password"
                placeholder="Password"
                value={loginPw}
                onChange={(e) => setLoginPw(e.target.value)}
                style={{ border: '1px solid #D1D5DB', borderRadius: 10, padding: '8px 10px' }}
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={loginPw2}
                onChange={(e) => setLoginPw2(e.target.value)}
                style={{ border: '1px solid #D1D5DB', borderRadius: 10, padding: '8px 10px' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <GhostButton onClick={closeCreateLogin}>Cancel</GhostButton>
                <PrimaryButton onClick={doCreateLogin} disabled={loginSaving} color={brand}>
                  {loginSaving ? 'Creating…' : 'Create'}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}