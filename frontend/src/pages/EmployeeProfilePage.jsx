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
        color:brand,
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
  const pct = Math.max(0, Math.min(100, Math.round((value / total) * 100)));
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

function ActionList() {
  const items = [
    { icon: '⏺️', text: 'Check-in / Check-out' },
    { icon: '📝', text: 'Request Leave' },
    { icon: '💳', text: 'Submit Expense' },
    { icon: '📄', text: 'View Documents' },
  ];
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {items.map((i) => (
        <button
          key={i.text}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            background: '#fff', color: '#111827', border: '1px solid #D1D5DB',
            borderRadius: 8, padding: '10px 12px', fontWeight: 800, cursor: 'pointer',
          }}
          onClick={() => alert(`${i.text} (UI only)`)}
        >
          <span
            style={{
              width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: '#F3F4F6', borderRadius: 6,
            }}
          >
            {i.icon}
          </span>
          {i.text}
        </button>
      ))}
    </div>
  );
}

/* ----------------------------- Edit Form (modal) ----------------------------- */
function EmployeeEditForm({ initial, onCancel, onSubmit, companyId }) {
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
      end_date: initial?.end_date ?? '',
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

  const qs = useMemo(() => (companyId ? `?companyId=${companyId}` : ''), [companyId]);

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
          style={{ border: 'none', background: 'transparent', color: 'brand', cursor: 'pointer', fontWeight: 700 }}
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
          <Tile icon="🗓️" title="Start Date" body={emp?.start_date || '—'} />
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
            <TwoCol labelL="Date of Birth" valueL={emp?.date_of_birth || '—'} labelR="Emergency Contact" valueR="—" />
          </Section>

          <Section title="Attendance — This Month">
            <KpiRow items={[
              { label: 'Days Present', value: 18 },
              { label: 'Days Leave', value: 2 },
              { label: 'Days Absent', value: 0 },
            ]} />
            <div style={{ marginTop: 10, fontSize: 13, color: '#6B7280' }}>Recent check-ins</div>
            <div style={{ marginTop: 6, color: '#111827' }}>—</div>
          </Section>

          <Section title="Leave Balance">
            <Progress label="Annual Leave" value={12} total={20} />
            <Progress label="Sick Leave" value={8} total={10} />
            <Progress label="Personal Leave" value={5} total={10} />
            <div style={{ marginTop: 10 }}>
            <button
              style={{
                background: brand,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 14px',
                fontWeight: 800,
                cursor: 'pointer',
                width: '100%',
              }}
              onClick={() => alert('Request Leave (UI only)')}
            >
              Request Leave
            </button>
            </div>
          </Section>

          <Section title="Recent Expense Claims">
            <div style={{ color: '#6B7280' }}>(no data)</div>
          </Section>
        </div>

        {/* Right column */}
        <div style={{ display: 'grid', gap: 12 }}>
          <Section title="Quick Actions">
            <ActionList />
          </Section>

          <Section title="Employment Details">
            <ListRow label="Department" value={emp?.department || '—'} />
            <ListRow label="Job Role" value={emp?.role || '—'} />
            <ListRow label="Reports to" value="—" />
          </Section>

          <Section title="This Month">
            <KeyValue label="Leads Converted" value="12" />
            <KeyValue label="Revenue Generated" value="$189K" />
            <KeyValue label="Customer Satisfaction" value="4.8/5.0" />
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
              <div style={{ color: '#6B7280', fontSize: 13 }}>(no documents)</div>
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
