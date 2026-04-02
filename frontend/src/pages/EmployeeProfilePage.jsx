// src/pages/EmployeeProfilePage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  getEmployee,
  updateEmployee,
  getEmploymentTypeOptions,
  getJobRoleOptions,
  previewRoleModules,
  listEmployeeDocuments,
  uploadEmployeeDocument,
  downloadEmployeeDocument,
  deleteEmployeeDocument,
} from '../services/api';

const brand = '#146b6b';

const dateFormatter = new Intl.DateTimeFormat('en-AU', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('en-AU', {
  hour: '2-digit',
  minute: '2-digit',
});

function parseDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const normalized = typeof value === 'string' && value.includes(' ') && !value.includes('T')
    ? value.replace(' ', 'T')
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  if (!value) return '—';
  const date = parseDateValue(value);
  return date ? dateFormatter.format(date) : '—';
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = parseDateValue(value);
  return date ? `${dateFormatter.format(date)} ${timeFormatter.format(date)}` : '—';
}

function getLeaveLabel(leaveType) {
  const labels = {
    annual: 'Annual Leave',
    sick: 'Sick Leave',
    personal: 'Personal Leave',
    unpaid: 'Unpaid Leave',
  };
  return labels[leaveType] ?? leaveType ?? 'Leave';
}

function formatMoney(amount, currency = 'AUD') {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency || 'AUD',
    maximumFractionDigits: 2,
  }).format(value);
}

function expenseStatusStyle(status) {
  if (status === 'approved') return { bg: '#DCFCE7', fg: '#166534' };
  if (status === 'pending') return { bg: '#FEF3C7', fg: '#92400E' };
  if (status === 'rejected') return { bg: '#FEE2E2', fg: '#991B1B' };
  if (status === 'cancelled') return { bg: '#F3F4F6', fg: '#4B5563' };
  return { bg: '#F3F4F6', fg: '#111827' };
}

function Pill({ children, tone = 'success' }) {
  const map = {
    success: { bg: '#DCFCE7', fg: '#28A745' },
    gray:    { bg: '#E5E7EB', fg: '#374151' },
    neutral: { bg: '#F3F4F6', fg: '#111827' },
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
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  );
}

function Tile({ icon, title, body }) {
  return (
    <div
      style={{
        border: '1px solid #E5E7EB', borderRadius: 12, padding: 12,
        display: 'grid', gap: 6, background: '#fff'
      }}
    >
      <div style={{ color: '#6B7280', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{icon}</span> {title}
      </div>
      <div style={{ color: '#111827' }}>{body}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, background: '#fff' }}>
      <div
        style={{ padding: 14, borderBottom: '1px solid #E5E7EB', fontSize: 16, fontWeight: 800, color: '#111827' }}
      >
        {title}
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div
      style={{
        border: '1px dashed #D1D5DB',
        borderRadius: 10,
        background: '#F9FAFB',
        padding: '12px 14px',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{title}</div>
      <div style={{ marginTop: 4, fontSize: 12, color: '#6B7280' }}>{description}</div>
    </div>
  );
}

function TwoCol({ labelL, valueL, labelR, valueR }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <KeyValue label={labelL} value={valueL} />
      <KeyValue label={labelR} value={valueR} />
    </div>
  );
}

function KeyValue({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#111827' }}>{value}</div>
    </div>
  );
}

function Progress({ label, value, total }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((value / total) * 100))) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#111827', marginBottom: 6 }}>
        <span>{label}</span>
        <span>{value} days remaining</span>
      </div>
      <div style={{ height: 8, background: '#F3F4F6', borderRadius: 999 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: brand, borderRadius: 999 }} />
      </div>
    </div>
  );
}

function ListRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
      <div style={{ color: '#6B7280', fontSize: 13 }}>{label}</div>
      <div style={{ color: '#111827', fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function KpiRow({ items = [] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      {items.map((i) => (
        <div
          key={i.label}
          style={{ border: '1px solid #E5E7EB', borderRadius: 12, background: '#fff', padding: 14 }}
        >
          <div style={{ color: '#6B7280', fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>{i.label}</div>
          <div style={{ marginTop: 4, fontSize: 22, fontWeight: 900, color: '#111827' }}>{i.value}</div>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------- Edit Form (modal) ----------------------------- */
function EmployeeEditForm({ initial, onCancel, onSubmit, companyId }) {
  // Helper to extract YYYY-MM-DD from ISO string
  const getDateValue = (dateStr) => {
    if (!dateStr) return '';
    return String(dateStr).split('T')[0]; // Extract YYYY-MM-DD from ISO
  };

  const [form, setForm] = useState(() => ({
    employee_code: initial?.employee_code ?? '',
    personal: {
      first_name: initial?.first_name ?? '',
      last_name: initial?.last_name ?? '',
      date_of_birth: getDateValue(initial?.date_of_birth),
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
      start_date: getDateValue(initial?.start_date),
      end_date: getDateValue(initial?.end_date),
      rate_type: initial?.rate_type ?? 'monthly',
      rate_amount: initial?.rate_amount ?? 0,
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
      await onSubmit(form);
    } catch (err) {
      setErrText(err?.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', border: '1px solid #D1D5DB', borderRadius: 10, padding: '8px 10px',
  };
  const labelStyle = { fontSize: 13, fontWeight: 700, color: '#374151' };

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
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
              handleChange(['employment', 'department_id'], e.target.value ? Number(e.target.value) : '')
            }
          />
        </div>

        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>Job role</label>
          <select
            style={inputStyle}
            value={form.employment.job_role_id}
            onChange={(e) =>
              handleChange(['employment', 'job_role_id'], e.target.value ? Number(e.target.value) : '')
            }
          >
            <option value="">-- Select job role --</option>
            {roleOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {`${r.code} — ${r.name}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>Employment type</label>
          <select
            style={inputStyle}
            value={form.employment.employment_type_id}
            onChange={(e) =>
              handleChange(['employment', 'employment_type_id'], e.target.value ? Number(e.target.value) : '')
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

      {errText && (
        <div style={{ color: '#B91C1C', fontWeight: 600, fontSize: 13 }}>{errText}</div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '8px 14px', background: '#fff', color: '#111827',
            border: '1px solid #D1D5DB', borderRadius: 10, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          style={{
            padding: '8px 14px', background: brand, color: '#fff', border: 'none',
            borderRadius: 10, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(20,107,107,0.25)',
          }}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

/* ----------------------------- Profile page ----------------------------- */
export default function EmployeeProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const companyId = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const c = sp.get('companyId');
    return c ? Number(c) : null;
  }, [location.search]);

  const [emp, setEmp] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [openEdit, setOpenEdit] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [docs, setDocs] = useState([]);
  const [docLoading, setDocLoading] = useState(false);
  const [docUploading, setDocUploading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const detail = await getEmployee(id, companyId ? { companyId } : {});
        const data = detail?.data ?? detail;
        if (alive) setEmp(data || null);
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, companyId]);

  // Load documents
  useEffect(() => {
    let alive = true;
    async function loadDocs() {
      if (!emp?.id) return;
      setDocLoading(true);
      try {
        const arr = await listEmployeeDocuments(emp.id, companyId ? { companyId } : {});
        if (alive) setDocs(arr ?? []);
      } catch (e) {
        if (alive) alert(e?.message ?? 'Failed to load documents');
      } finally {
        if (alive) setDocLoading(false);
      }
    }
    loadDocs();
    return () => { alive = false; };
  }, [emp?.id, companyId]);

  async function onUploadDoc(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setDocUploading(true);
      await uploadEmployeeDocument(emp.id, file, companyId ? { companyId } : {});
      const arr = await listEmployeeDocuments(emp.id, companyId ? { companyId } : {});
      setDocs(arr ?? []);
    } catch (err) {
      alert(err?.message ?? 'Upload failed');
    } finally {
      setDocUploading(false);
      e.target.value = '';
    }
  }

  async function onDownload(doc) {
    try {
      const blob = await downloadEmployeeDocument(emp.id, doc.id, companyId ? { companyId } : {});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = doc.filename || `document-${doc.id}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err?.message ?? 'Download failed');
    }
  }

  async function onDelete(doc) {
    if (!confirm(`Delete "${doc.filename}"?`)) return;
    try {
      await deleteEmployeeDocument(emp.id, doc.id, companyId ? { companyId } : {});
      setDocs(prev => prev.filter(d => d.id !== doc.id));
    } catch (err) {
      alert(err?.message ?? 'Delete failed');
    }
  }

  const fullName = useMemo(() => {
    if (!emp) return '';
    const n = `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim();
    return n || emp.email || `#${emp.id}`;
  }, [emp]);

  const attendanceSummary = emp?.attendance_summary ?? {
    working_days: 0,
    days_present: 0,
    approved_leave_days: 0,
    days_absent: 0,
    recent_check_ins: [],
  };

  const leaveSummary = emp?.leave_summary ?? {
    year: new Date().getFullYear(),
    approved_days_this_month: 0,
    balances: [],
  };

  const performanceSummary = emp?.performance_summary ?? {
    leads_converted: 0,
    revenue_generated: 0,
  };

  const recentExpenseClaims = Array.isArray(emp?.recent_expense_claims) ? emp.recent_expense_claims : [];

  const handleSubmitEdit = async (payload) => {
    try {
      setSavingEdit(true);
      await updateEmployee(Number(id), payload, companyId ? { companyId } : {});
      const detail = await getEmployee(id, companyId ? { companyId } : {});
      setEmp(detail?.data ?? detail ?? emp);
      setOpenEdit(false);
    } catch (e) {
      alert(e?.message ?? 'Failed to update employee');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* Back + Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ border: 'none', background: 'transparent', color: brand, cursor: 'pointer', fontWeight: 700 }}
        >
          ← Back to Employees
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
       <button
  style={{
    padding: '8px 12px',
    borderRadius: 10,
    background: brand,
    color: '#fff',
    border: 'none',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(20,107,107,0.25)',
  }}
  onClick={() => setOpenEdit(true)}
>
  Edit Profile
</button>
          <button
            style={{
              padding: '8px 12px', borderRadius: 10,
              background: '#fff', color: '#111827',
              border: '1px solid #D1D5DB', fontWeight: 800, cursor: 'pointer',
            }}
            onClick={() => alert('View Performance (UI only)')}
          >
            View Performance
          </button>
        </div>
      </div>

      {/* Header card */}
      <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, background: '#fff' }}>
        <div style={{ display: 'flex', gap: 16, padding: 18, alignItems: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 999, background: '#E5E7EB' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#111827' }}>{fullName}</div>
            <div style={{ fontSize: 13, color: '#6B7280' }}>{emp?.role ?? '—'}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <Pill tone={emp?.status === 'active' ? 'success' : 'gray'}>{emp?.status ?? '—'}</Pill>
              <Pill tone="neutral">{'Full-time'}</Pill>
            </div>
          </div>
          <div />
        </div>

        {/* Info tiles */}
        <div
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12, padding: 12, borderTop: '1px solid #E5E7EB',
          }}
        >
          <Tile icon="✉️" title="Email" body={emp?.email || '—'} />
          <Tile icon="📞" title="Phone" body={emp?.phone || '—'} />
          <Tile icon="📍" title="Location" body={emp?.city || '—'} />
          <Tile icon="🗓️" title="Start Date" body={formatDate(emp?.start_date)} />
        </div>
      </div>

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        {/* Left column */}
        <div style={{ display: 'grid', gap: 12 }}>
          <Section title="Personal Information">
            <TwoCol
              labelL="Full Name"
              valueL={fullName}
              labelR="Employee Code"
              valueR={emp?.employee_code || '—'}
            />
            <TwoCol labelL="Date of Birth" valueL={formatDate(emp?.date_of_birth)} labelR="Emergency Contact" valueR="—" />
          </Section>

          <Section title="Attendance — This Month">
            <KpiRow
              items={[
                { label: 'Days Present', value: attendanceSummary.days_present },
                { label: 'Days Leave', value: attendanceSummary.approved_leave_days },
                { label: 'Days Absent', value: attendanceSummary.days_absent },
              ]}
            />
            <div style={{ marginTop: 12, fontSize: 13, color: '#6B7280', fontWeight: 700 }}>
              Recent check-ins
            </div>
            <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
              {attendanceSummary.recent_check_ins.length > 0 ? (
                attendanceSummary.recent_check_ins.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 1fr 1fr',
                      gap: 10,
                      alignItems: 'center',
                      padding: '10px 12px',
                      border: '1px solid #E5E7EB',
                      borderRadius: 10,
                      background: '#FAFAFA',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{formatDate(entry.date)}</div>
                    <div style={{ fontSize: 13, color: '#374151' }}>
                      Check in: <strong>{formatDateTime(entry.check_in_time)}</strong>
                    </div>
                    <div style={{ fontSize: 13, color: '#374151' }}>
                      Check out: <strong>{formatDateTime(entry.check_out_time)}</strong>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No check-ins this month"
                  description="Attendance logs will appear here after check-in/check-out records are created."
                />
              )}
            </div>
          </Section>

          <Section title="Leave Balance">
            {leaveSummary.balances.length > 0 ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {leaveSummary.balances.map((balance) => (
                  <Progress
                    key={balance.leave_type}
                    label={getLeaveLabel(balance.leave_type)}
                    value={balance.remaining}
                    total={balance.total_days}
                  />
                ))}
                <div style={{ fontSize: 13, color: '#6B7280' }}>
                  Approved leave this month: {leaveSummary.approved_days_this_month} day(s)
                </div>
              </div>
            ) : (
              <EmptyState
                title="No leave balances"
                description="Leave allocations have not been generated for this employee yet."
              />
            )}
          </Section>

          <Section title="Recent Expense Claims">
            {recentExpenseClaims.length === 0 ? (
              <EmptyState
                title="No expense claims"
                description="Recent claims will appear here once this employee submits expenses."
              />
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {recentExpenseClaims.map((item) => {
                  const tone = expenseStatusStyle(item.status);
                  return (
                    <div
                      key={item.id}
                      style={{
                        border: '1px solid #E5E7EB',
                        borderRadius: 10,
                        padding: '10px 12px',
                        background: '#fff',
                        display: 'grid',
                        gap: 6,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ color: '#111827', fontWeight: 700, fontSize: 13 }}>
                          {item.project_name || 'Expense claim'}
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: tone.bg,
                            color: tone.fg,
                            textTransform: 'uppercase',
                          }}
                        >
                          {item.status || 'unknown'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
                        <span style={{ color: '#6B7280' }}>{formatDate(item.expense_date)}</span>
                        <span style={{ color: '#111827', fontWeight: 700 }}>
                          {formatMoney(item.amount, item.currency)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>

        {/* Right column */}
        <div style={{ display: 'grid', gap: 12 }}>
          <Section title="Employment Details">
            <ListRow label="Department" value={emp?.department || '—'} />
            <ListRow label="Job Role" value={emp?.role || '—'} />
          </Section>

          <Section title="This Month">
            <KeyValue label="Leads Converted" value={performanceSummary.leads_converted} />
            <KeyValue label="Revenue Generated" value={formatMoney(performanceSummary.revenue_generated, 'AUD')} />
          </Section>

          {/* Documents */}
          <Section title="Documents">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: brand,
                  color: '#fff',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Upload Document
                <input type="file" onChange={onUploadDoc} style={{ display: 'none' }} />
              </label>
              {docUploading && <span style={{ fontSize: 12, color: '#6B7280' }}>Uploading…</span>}
            </div>

            {docLoading ? (
              <div>Loading…</div>
            ) : docs.length === 0 ? (
              <EmptyState
                title="No documents uploaded"
                description="Use Upload Document to attach employee files such as contracts, IDs, or certificates."
              />
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {docs.map((d) => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 10px', color: '#111827' }}>
                      {d.filename}
                    </div>
                    <button
                      onClick={() => onDownload(d)}
                      style={{ border: '1px solid #D1D5DB', background: '#fff', borderRadius: 8, padding: '8px 10px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Download
                    </button>
                    <button
                      onClick={() => onDelete(d)}
                      style={{ border: '1px solid #FCA5A5', background: '#fff', color: '#B91C1C', borderRadius: 8, padding: '8px 10px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {openEdit && (
        <div
          onClick={() => !savingEdit && setOpenEdit(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)',
            display: 'grid', placeItems: 'center', zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 12, padding: 18, width: 760, maxWidth: '98%' }}
          >
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#111827' }}>
              Edit Profile
            </h4>
            <div style={{ marginTop: 10 }}>
              {loading || !emp ? (
                <div>Loading…</div>
              ) : (
                <EmployeeEditForm
                  initial={emp}
                  companyId={companyId ?? null}
                  onCancel={() => !savingEdit && setOpenEdit(false)}
                  onSubmit={handleSubmitEdit}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
