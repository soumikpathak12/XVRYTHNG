// src/pages/EmployeeCreatePage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  createEmployee,
  previewRoleModules,
  getJobRoleOptions,
  getEmploymentTypeOptions,getDepartmentOptions
} from '../services/api.js';

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
function GhostButton({ children, onClick, type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
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
function Step({ index, label, active, done, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px',
        background: active ? '#146b6b' : '#fff',
        color: active ? '#fff' : done ? '#146b6b' : '#374151',
        border: `1px solid ${active ? '#146b6b' : '#D1D5DB'}`,
        borderRadius: 20,
        fontWeight: 700, fontSize: 13,
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          width: 22, height: 22, display: 'inline-grid', placeItems: 'center',
          borderRadius: 999, background: active ? '#0f5555' : done ? '#E6F4F1' : '#F3F4F6',
          color: active ? '#fff' : done ? '#146b6b' : '#6B7280',
          fontSize: 12, fontWeight: 900,
        }}
      >
        {done ? '✓' : index + 1}
      </span>
      <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  );
}

/* ---------- Step Bodies (stable identity) ---------- */
function PersonalStep({ form, onChange, inputStyle, labelStyle }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>First name</label>
          <input
            style={inputStyle}
            value={form.personal.first_name}
            onChange={e => onChange(['personal', 'first_name'], e.target.value)}
            required
          />
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>Last name</label>
          <input
            style={inputStyle}
            value={form.personal.last_name}
            onChange={e => onChange(['personal', 'last_name'], e.target.value)}
            required
          />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>Date of birth</label>
          <input
            type="date"
            style={inputStyle}
            value={form.personal.date_of_birth}
            onChange={e => onChange(['personal', 'date_of_birth'], e.target.value)}
          />
        </div>
      <div style={{ display: 'grid', gap: 6 }}>
        <label style={labelStyle}>Gender</label>
        <select
          style={inputStyle}
          value={form.personal.gender}
          onChange={e => onChange(['personal', 'gender'], e.target.value)}
        >
          <option value="">-- Select gender --</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>
      </div>
    </div>
  );
}

function ContactAddrStep({ form, onChange, inputStyle, labelStyle }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            style={inputStyle}
            value={form.contact.email}
            onChange={e => onChange(['contact', 'email'], e.target.value)}
            required
          />
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>Phone</label>
          <input
            style={inputStyle}
            value={form.contact.phone}
            onChange={e => onChange(['contact', 'phone'], e.target.value)}
          />
        </div>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>Address line 1</label>
          <input
            style={inputStyle}
            value={form.contact.address_line1}
            onChange={e => onChange(['contact', 'address_line1'], e.target.value)}
          />
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>Address line 2</label>
          <input
            style={inputStyle}
            value={form.contact.address_line2}
            onChange={e => onChange(['contact', 'address_line2'], e.target.value)}
          />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>City</label>
          <input
            style={inputStyle}
            value={form.contact.city}
            onChange={e => onChange(['contact', 'city'], e.target.value)}
          />
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>State</label>
          <input
            style={inputStyle}
            value={form.contact.state}
            onChange={e => onChange(['contact', 'state'], e.target.value)}
          />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>Postal code</label>
          <input
            style={inputStyle}
            value={form.contact.postal_code}
            onChange={e => onChange(['contact', 'postal_code'], e.target.value)}
          />
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>Country</label>
          <input
            style={inputStyle}
            value={form.contact.country}
            onChange={e => onChange(['contact', 'country'], e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function EmploymentStep({ form, onChange, inputStyle, labelStyle, roleOptions, empTypeOptions, roleModules,deptOptions }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>Department </label>
          
          <select
            style={inputStyle}
            value={form.employment.department_id}
            onChange={(e) =>
              onChange(['employment', 'department_id'], e.target.value ? Number(e.target.value) : '')
            }
          >
            <option value="">-- Select department --</option>
            {deptOptions.map(d => (
              <option key={d.id} value={d.id}>
                {d.code ? `${d.code} — ${d.name}` : d.name}
              </option>
            ))}
          </select>

        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>Job role</label>
          <select
            style={inputStyle}
            value={form.employment.job_role_id}
            onChange={e => onChange(['employment', 'job_role_id'], e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">-- Select job role --</option>
            {roleOptions.map(r => (
              <option key={r.id} value={r.id}>{`${r.code} — ${r.name}`}</option>
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
            onChange={e => onChange(['employment', 'employment_type_id'], e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">-- Select employment type --</option>
            {empTypeOptions.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>Start date</label>
          <input
            type="date"
            style={inputStyle}
            value={form.employment.start_date}
            onChange={e => onChange(['employment', 'start_date'], e.target.value)}
          />
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>Rate type</label>
          <select
            style={inputStyle}
            value={form.employment.rate_type}
            onChange={e => onChange(['employment', 'rate_type'], e.target.value)}
          >
            <option value="hourly">hourly</option>
            <option value="daily">daily</option>
            <option value="monthly">monthly</option>
            <option value="annual">annual</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <label style={labelStyle}>Rate amount</label>
        <input
          type="number"
          step="0.01"
          style={inputStyle}
          value={form.employment.rate_amount}
          onChange={e => onChange(['employment', 'rate_amount'], Number(e.target.value) || 0)}
        />
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>Module access preview:</div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {roleModules.map(m => (
            <li key={m.module_key} style={{ fontSize: 13 }}>{m.display_name}</li>
          ))}
          {roleModules.length === 0 && (
            <li style={{ fontSize: 13, color: '#6B7280' }}>(no modules)</li>
          )}
        </ul>
      </div>
    </div>
  );
}

/** Generate a random password (12 chars: letters + numbers + symbols). */
function generatePassword() {
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const num = '23456789';
  const sym = '!@#$%&*';
  const all = lower + upper + num + sym;
  let out = '';
  out += lower[Math.floor(Math.random() * lower.length)];
  out += upper[Math.floor(Math.random() * upper.length)];
  out += num[Math.floor(Math.random() * num.length)];
  out += sym[Math.floor(Math.random() * sym.length)];
  for (let i = 0; i < 8; i++) out += all[Math.floor(Math.random() * all.length)];
  return out.split('').sort(() => Math.random() - 0.5).join('');
}

/** Clipboard API often fails on HTTP / some browsers; fall back to execCommand. */
async function copyToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function AccountStep({ form, onChange, inputStyle, labelStyle }) {
  useEffect(() => {
    // Always generate a password for the employee onboarding flow.
    if (!form.account.password) {
      const pwd = generatePassword();
      onChange(['account', 'password'], pwd);
      onChange(['account', 'password_confirm'], pwd);
      onChange(['account', 'enable_login'], true);
    }
  }, [form.account.password, onChange]);

  const handleRegenerate = () => {
    const pwd = generatePassword();
    onChange(['account', 'password'], pwd);
    onChange(['account', 'password_confirm'], pwd);
  };

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const pwd = form.account.password;
    if (!pwd) return;
    const ok = await copyToClipboard(pwd);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>Generated password</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              readOnly
              style={{ ...inputStyle, flex: '1 1 200px', fontFamily: 'monospace' }}
              value={form.account.password}
              aria-label="Generated password"
            />
            <button type="button" onClick={handleRegenerate} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>
              Regenerate
            </button>
            <button type="button" onClick={handleCopy} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', background: copied ? '#ECFDF5' : '#fff', cursor: 'pointer', fontWeight: 600 }}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
            This password will be sent to the employee by email. They must change it on first login.
          </p>
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#6B7280', marginTop: -6 }}>
        On save, an onboarding email will be sent to the employee.
      </div>
    </div>
  );
}

function EmergencyStep({ form, onChange, inputStyle, labelStyle, addEmergency, removeEmergency }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>Emergency contacts</div>
        <GhostButton onClick={addEmergency}>+ Add contact</GhostButton>
      </div>
      {(form.emergency_contacts ?? []).length === 0 && (
        <div style={{ fontSize: 13, color: '#6B7280' }}>(none)</div>
      )}
      {(form.emergency_contacts ?? []).map((c, idx) => (
        <div key={idx} style={{ display: 'grid', gap: 10, border: '1px dashed #D1D5DB', borderRadius: 12, padding: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={labelStyle}>Contact name</label>
              <input
                style={inputStyle}
                value={c.contact_name}
                onChange={e => onChange(['emergency_contacts', idx, 'contact_name'], e.target.value)}
              />
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={labelStyle}>Relationship</label>
              <input
                style={inputStyle}
                value={c.relationship}
                onChange={e => onChange(['emergency_contacts', idx, 'relationship'], e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={labelStyle}>Phone</label>
              <input
                style={inputStyle}
                value={c.phone}
                onChange={e => onChange(['emergency_contacts', idx, 'phone'], e.target.value)}
              />
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                style={inputStyle}
                value={c.email}
                onChange={e => onChange(['emergency_contacts', idx, 'email'], e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <label style={labelStyle}>Address</label>
            <input
              style={inputStyle}
              value={c.address}
              onChange={e => onChange(['emergency_contacts', idx, 'address'], e.target.value)}
            />
          </div>
          <div>
            <GhostButton onClick={() => removeEmergency(idx)}>Remove</GhostButton>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Page ---------- */
export default function EmployeeCreatePage() {
  const brand = '#146b6b';
  const navigate = useNavigate();

  const location = useLocation();
  const companyId = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const c = sp.get('companyId');
    return c ? Number(c) : null;
  }, [location.search]);
  const qs = useMemo(() => (companyId ? `?companyId=${companyId}` : ''), [companyId]);

  const steps = [
    { key: 'personal', label: 'Personal' },
    { key: 'contactAddr', label: 'Contact & Address' },
    { key: 'employment', label: 'Employment' },
    { key: 'account', label: 'Account' },
    { key: 'emergency', label: 'Emergency' },
    { key: 'review', label: 'Review & Submit' },
  ];
  const [stepIdx, setStepIdx] = useState(0);
  const [showErrors, setShowErrors] = useState(false);

  // Success modal (after create)
  const [createdInfo, setCreatedInfo] = useState(null); // { id, code, name }
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  // Employee create is mounted under /admin; employees list is the management “dashboard”.
  const employeesDashboardPath = useMemo(() => `/admin/employees${qs}`, [qs]);

  const [form, setForm] = useState(() => ({
    employee_code: '',
    personal: { first_name: '', last_name: '', date_of_birth: '', gender: '', avatar_url: '' },
    contact: {
      email: '', phone: '',
      address_line1: '', address_line2: '',
      city: '', state: '', postal_code: '', country: ''
    },
    employment: {
      department_id: '', job_role_id: '', employment_type_id: '',
      start_date: '', rate_type: 'monthly', rate_amount: 0
    },
    qualifications: [],
    emergency_contacts: [],
    account: { enable_login: true, password: '', password_confirm: '' },
  }));

  const validateStep = (idx, f = form) => {
    const fail = (msg) => msg;
    switch (steps[idx].key) {
      case 'personal':
        if (!f.personal.first_name?.trim()) return fail('First name is required');
        if (!f.personal.last_name?.trim()) return fail('Last name is required');
        return null;
      case 'contactAddr':
        if (!f.contact.email?.trim()) return fail('Email is required');
        return null;
      case 'employment':
        return null;
      case 'account':
        if (!f.account.password || f.account.password.length < 8)
          return fail('Password must be at least 8 characters');
        if (f.account.password !== f.account.password_confirm)
          return fail('Password does not match');
        if (!f.contact.email?.trim())
          return fail('Email is required');
        return null;
      case 'emergency':
        return null;
      case 'review':
        return null;
      default:
        return null;
    }
  };
  const currentError = validateStep(stepIdx);
  const canNext = !currentError;

  const handleChange = (path, value) => {
    setForm(prev => {
      const next = structuredClone(prev);
      let node = next;
      for (let i = 0; i < path.length - 1; i++) node = node[path[i]];
      node[path[path.length - 1]] = value;
      if (showErrors) {
        const err = validateStep(stepIdx, next);
        if (!err) setShowErrors(false);
      }
      return next;
    });
  };

  const addEmergency = () => {
    setForm(prev => ({
      ...prev,
      emergency_contacts: [
        ...(prev.emergency_contacts ?? []),
        { contact_name: '', relationship: '', phone: '', email: '', address: '' },
      ],
    }));
  };
  const removeEmergency = (idx) => {
    setForm(prev => {
      const arr = [...(prev.emergency_contacts ?? [])];
      arr.splice(idx, 1);
      return { ...prev, emergency_contacts: arr };
    });
  };

  const [roleOptions, setRoleOptions] = useState([]);
  const [empTypeOptions, setEmpTypeOptions] = useState([]);
  const [deptOptions, setDeptOptions] = useState([]);
  const [roleModules, setRoleModules] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errText, setErrText] = useState('');

  useEffect(() => {
    let alive = true;
    getEmploymentTypeOptions()
      .then(rows => alive && setEmpTypeOptions(rows ?? []))
      .catch(() => alive && setEmpTypeOptions([]));
    getJobRoleOptions(companyId ? { companyId } : {})
      .then(rows => alive && setRoleOptions(rows ?? []))
      .catch(() => alive && setRoleOptions([]));
    
    getDepartmentOptions(companyId ? { companyId } : {})
        .then(rows => alive && setDeptOptions(rows ?? []))
        .catch(() => alive && setDeptOptions([]));

    return () => { alive = false; };
  }, [companyId]);

  useEffect(() => {
    const jobRoleId = form.employment.job_role_id;
    if (!jobRoleId) { setRoleModules([]); return; }
    let alive = true;
    previewRoleModules(jobRoleId)
      .then(rows => alive && setRoleModules(rows ?? []))
      .catch(() => alive && setRoleModules([]));
    return () => { alive = false; };
  }, [form.employment.job_role_id]);

  useEffect(() => { setShowErrors(false); }, [stepIdx]);

  const emptyForm = useMemo(
    () => ({
      employee_code: '',
      personal: { first_name: '', last_name: '', date_of_birth: '', gender: '', avatar_url: '' },
      contact: {
        email: '', phone: '',
        address_line1: '', address_line2: '',
        city: '', state: '', postal_code: '', country: '',
      },
      employment: {
        department_id: '', job_role_id: '', employment_type_id: '',
        start_date: '', rate_type: 'monthly', rate_amount: 0,
      },
      qualifications: [],
      emergency_contacts: [],
      account: { enable_login: true, password: '', password_confirm: '' },
    }),
    []
  );

  const resetWizardForm = () => {
    setForm(structuredClone(emptyForm));
    setCreatedInfo(null);
    setSuccessModalOpen(false);
    setStepIdx(0);
    setShowErrors(false);
    setErrText('');
  };

  const handleSuccessModalOk = () => {
    setSuccessModalOpen(false);
    setCreatedInfo(null);
    navigate(employeesDashboardPath);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErrText('');

      if (!form.account.password || form.account.password.length < 8)
        throw new Error('Password must be at least 8 characters');
      if (form.account.password !== form.account.password_confirm)
        throw new Error('Password does not match');
      if (!form.contact.email)
        throw new Error('Email is required');

      const payload = { ...form };
      if (!payload.employment.department_id) payload.employment.department_id = '';
      if (!payload.employment.job_role_id) payload.employment.job_role_id = '';
      if (!payload.employment.employment_type_id) payload.employment.employment_type_id = '';

      const res = await createEmployee(payload, companyId ? { companyId } : {});
      const fullName = `${form.personal.first_name ?? ''} ${form.personal.last_name ?? ''}`.trim();
      setCreatedInfo({
        id: res?.id ?? null,
        code: form.employee_code || '',
        name: fullName || '(no name)',
      });
      setSuccessModalOpen(true);
      setStepIdx(steps.findIndex(s => s.key === 'review'));
      setShowErrors(false);
    } catch (err) {
      setErrText(err?.message ?? 'Failed to create employee.');
      for (let i = 0; i < steps.length; i++) {
        if (validateStep(i)) { setStepIdx(i); break; }
      }
      setShowErrors(true);
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

  const renderStepBody = () => {
    switch (steps[stepIdx].key) {
      case 'personal':
        return <PersonalStep form={form} onChange={handleChange} inputStyle={inputStyle} labelStyle={labelStyle} />;
      case 'contactAddr':
        return <ContactAddrStep form={form} onChange={handleChange} inputStyle={inputStyle} labelStyle={labelStyle} />;
      case 'employment':
        return (
          <EmploymentStep
            form={form}
            onChange={handleChange}
            inputStyle={inputStyle}
            labelStyle={labelStyle}
            roleOptions={roleOptions}
            empTypeOptions={empTypeOptions}
            roleModules={roleModules}
             deptOptions={deptOptions}
          />
        );
      case 'account':
        return <AccountStep form={form} onChange={handleChange} inputStyle={inputStyle} labelStyle={labelStyle} />;
      case 'emergency':
        return (
          <EmergencyStep
            form={form}
            onChange={handleChange}
            inputStyle={inputStyle}
            labelStyle={labelStyle}
            addEmergency={addEmergency}
            removeEmergency={removeEmergency}
          />
        );
      case 'review':
        const fullName = `${form.personal.first_name ?? ''} ${form.personal.last_name ?? ''}`.trim();
        return (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Review</div>

            <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: 12 }}>
              <div style={{ fontWeight: 700 }}>Personal</div>
              <div style={{ fontSize: 13, color: '#374151' }}>
                {fullName || '(no name)'}
                {form.personal.date_of_birth ? ` — DOB: ${form.personal.date_of_birth}` : ''}
                {form.personal.gender ? ` — Gender: ${form.personal.gender}` : ''}
              </div>
            </div>

            <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: 12 }}>
              <div style={{ fontWeight: 700 }}>Contact & Address</div>
              <div style={{ fontSize: 13, color: '#374151' }}>
                {form.contact.email} {form.contact.phone ? `• ${form.contact.phone}` : ''}
              </div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>
                {[form.contact.address_line1, form.contact.address_line2, form.contact.city, form.contact.state, form.contact.postal_code, form.contact.country]
                  .filter(Boolean).join(', ') || '(no address)'}
              </div>
            </div>

            <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: 12 }}>
              <div style={{ fontWeight: 700 }}>Employment</div>
              <div style={{ fontSize: 13, color: '#374151' }}>
                Role ID: {form.employment.job_role_id || '-'} • Dept ID: {form.employment.department_id || '-'} • Type: {form.employment.employment_type_id || '-'}
              </div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>
                Start: {form.employment.start_date || '-'} • {form.employment.rate_type} rate: {form.employment.rate_amount ?? 0}
              </div>
              <div style={{ marginTop: 6 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: '#374151' }}>Module access:</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {roleModules.length ? roleModules.map(m => <li key={m.module_key} style={{ fontSize: 12 }}>{m.display_name}</li>) :
                    <li style={{ fontSize: 12, color: '#6B7280' }}>(no modules)</li>}
                </ul>
              </div>
            </div>

            <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: 12 }}>
              <div style={{ fontWeight: 700 }}>Account</div>
              <div style={{ fontSize: 13, color: '#374151' }}>
                Login: will be created
              </div>
            </div>

            <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: 12 }}>
              <div style={{ fontWeight: 700 }}>Emergency contacts</div>
              {(form.emergency_contacts ?? []).length === 0 ? (
                <div style={{ fontSize: 13, color: '#6B7280' }}>(none)</div>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {form.emergency_contacts.map((c, i) => (
                    <li key={i} style={{ fontSize: 13 }}>
                      {c.contact_name || '(no name)'}{c.relationship ? ` — ${c.relationship}` : ''}{c.phone ? ` — ${c.phone}` : ''}{c.email ? ` — ${c.email}` : ''}
                      {c.address ? ` — ${c.address}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'grid', gap: 14, padding: 14 }}>
      {/* Header */}
      <div style={{
        display: 'grid', gap: 8,
        padding: 14, border: '1px solid #E5E7EB', borderRadius: 12, background: '#F9FAFB'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#111827' }}>Add New Employee</div>
            <div style={{ fontSize: 13, color: '#6B7280' }}>
              Step {stepIdx + 1} of {steps.length} — follow the wizard to complete the details.
            </div>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {steps.map((s, i) => (
          <Step
            key={s.key}
            index={i}
            label={s.label}
            active={i === stepIdx}
            done={i < stepIdx}
            onClick={() => setStepIdx(i)}
          />
        ))}
      </div>

      {/* Card */}
      <form
        onSubmit={stepIdx === steps.length - 1 ? submit : (e) => { e.preventDefault(); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && stepIdx < steps.length - 1) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <div style={{ display: 'grid', gap: 16, border: '1px solid #E5E7EB', borderRadius: 12, padding: 14 }}>
          {renderStepBody()}

          {/* Validation banner */}
          {showErrors && currentError && (
            <div
              role="alert"
              style={{
                color: '#991B1B',
                background: '#FEE2E2',
                border: '1px solid #EF4444',
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {currentError}
            </div>
          )}

          {/* Submit-wide errors */}
          {errText && (
            <div style={{ color: '#B91C1C', fontWeight: 600, fontSize: 13 }}>{errText}</div>
          )}

          {/* Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <GhostButton onClick={() => navigate(employeesDashboardPath)}>Cancel</GhostButton>

            <div style={{ display: 'flex', gap: 10 }}>
              {stepIdx > 0 && (
                <GhostButton onClick={() => setStepIdx(i => Math.max(0, i - 1))}>
                  Back
                </GhostButton>
              )}

              {stepIdx < steps.length - 1 ? (
                <PrimaryButton
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (canNext) {
                      setTimeout(() => {
                        setStepIdx(i => Math.min(steps.length - 1, i + 1));
                      }, 0);
                    } else {
                      setShowErrors(true);
                    }
                  }}
                  color={brand}
                >
                  Next
                </PrimaryButton>
              ) : (
                <PrimaryButton type="submit" disabled={saving} color={brand}>
                  {saving ? 'Saving…' : 'Save'}
                </PrimaryButton>
              )}
            </div>
          </div>
        </div>
      </form>

      {successModalOpen && createdInfo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="emp-create-success-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              maxWidth: 440,
              width: '100%',
              padding: 24,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              border: '1px solid #E5E7EB',
            }}
          >
            <div
              id="emp-create-success-title"
              style={{ fontSize: 20, fontWeight: 900, color: '#111827', marginBottom: 10 }}
            >
              Employee Created Successfully
            </div>
            <p style={{ margin: 0, fontSize: 14, color: '#4B5563', lineHeight: 1.55 }}>
              <strong>{createdInfo.name}</strong>
              {createdInfo.id != null ? ` (ID #${createdInfo.id})` : ''} has been created.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
              <GhostButton onClick={resetWizardForm}>Create Another</GhostButton>
              <PrimaryButton onClick={handleSuccessModalOk} color={brand}>
                OK
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}