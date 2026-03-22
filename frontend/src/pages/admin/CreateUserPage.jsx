// src/pages/admin/users/CreateUserPage.jsx
import React, { useState } from 'react';
import { apiCreateUser } from '../../services/api'; // <-- chỉnh lại nếu cấu trúc thư mục khác
const ORG_ROLES = [
  { code: 'ELE-LEAD', name: 'Lead Electrician' },
  { code: 'APP',      name: 'Apprentice' },
  { code: 'SAL-MGR',  name: 'Sales Manager' },
  { code: 'SAL-EXE',  name: 'Sales Executive' },
  { code: 'OPS-MGR',  name: 'Operations Manager' },
  { code: 'PM-MGR',   name: 'Project Manager' },
  { code: 'DIR',      name: 'Director' },
];

const UI = {
  border: '#e5e7eb',
  green: '#146b6b',
  navy: '#0f172a',
  muted: '#64748b',
};

const input = {
  border: `1px solid ${UI.border}`,
  borderRadius: 10,
  padding: '10px 12px',
  width: '100%',
};

const btn = (primary = false) => ({
  padding: '10px 14px',
  borderRadius: 12,
  border: `1px solid ${primary ? UI.green : UI.border}`,
  background: primary ? UI.green : '#fff',
  color: primary ? '#fff' : UI.navy,
  fontWeight: 700,
  cursor: 'pointer',
});

export default function CreateUserPage() {
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    org_role_code: '', // optional; chọn đúng mã (DIR, ELE-LEAD, ...) để sinh employee_code
    name: '',
    email: '',
    phone: '',
    department: '',
    status: 'active',
    password: '',
    confirm: '',
  });

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function onSubmit(e) {
    e.preventDefault();
    setMsg('');

    // Basic validations
    if (!form.name || !form.email || !form.password) {
      setMsg('Please fill required fields: name, email, password');
      return;
    }
    if (form.password.length < 8) {
      setMsg('Password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirm) {
      setMsg('Passwords do not match');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        org_role_code: form.org_role_code || null,
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        phone: form.phone || null,
        department: form.department || null,
        status: form.status,
        notify_email: 1,
        notify_sms: 0,
      };

      // DEBUG logs để theo dõi luồng gọi
      console.log('[CreateUser] will POST /api/users payload =', payload);

      const res = await apiCreateUser(payload);

      console.log('[CreateUser] response =', res);

      // Hỗ trợ cả 2 shape: { success, data: user } hoặc trả trực tiếp user
      const user = res?.data ?? res;
      if (!user?.id) {
        throw new Error('Create succeeded but server did not return the created user');
      }

      setMsg(
        `✅ Created: ${user.name} (${user.employee_code || 'no employee code'}). Login details were sent to ${form.email.trim()}.`
      );

      // Clear password fields, giữ lại các field khác để tạo liên tiếp
      setForm((f) => ({ ...f, password: '', confirm: '' }));
    } catch (err) {
      console.error('[CreateUser] error:', err);
      setMsg(err.message || 'Create user failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: UI.navy, marginBottom: 8 }}>
        Create User
      </h2>

      {msg && (
        <div
          style={{
            border: `1px solid ${UI.border}`,
            background: '#f8fafc',
            padding: 10,
            borderRadius: 10,
            color: msg.startsWith('✅') ? '#065f46' : '#b91c1c',
          }}
        >
          {msg}
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        {/* Name & Email */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontWeight: 700 }}>Name *</label>
            <input
              style={input}
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <label style={{ fontWeight: 700 }}>Email *</label>
            <input
              style={input}
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        {/* Password & Confirm */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontWeight: 700 }}>Password *</label>
            <input
              style={input}
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <label style={{ fontWeight: 700 }}>Confirm *</label>
            <input
              style={input}
              type="password"
              value={form.confirm}
              onChange={(e) => update('confirm', e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        {/* Org role, Department, Phone */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontWeight: 700 }}>Org Role (optional)</label>
            <select
              style={input}
              value={form.org_role_code}
              onChange={(e) => update('org_role_code', e.target.value)}
              disabled={saving}
            >
              <option value="">Select…</option>
              {ORG_ROLES.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.code} — {r.name}
                </option>
              ))}
            </select>
            <div style={{ color: UI.muted, fontSize: 12, marginTop: 4 }}>
              Will generate <b>XTR-{form.org_role_code || 'DIR'}-001</b> if provided
            </div>
          </div>

          <div>
            <label style={{ fontWeight: 700 }}>Department</label>
            <input
              style={input}
              value={form.department}
              onChange={(e) => update('department', e.target.value)}
              disabled={saving}
            />
          </div>

          <div>
            <label style={{ fontWeight: 700 }}>Phone</label>
            <input
              style={input}
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        {/* Status */}
        <div style={{ maxWidth: 320 }}>
          <label style={{ fontWeight: 700 }}>Status</label>
          <select
            style={input}
            value={form.status}
            onChange={(e) => update('status', e.target.value)}
            disabled={saving}
          >
            <option value="active">active</option>
            <option value="inactive">inactive</option>
            <option value="pending">pending</option>
          </select>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="reset"
            style={btn(false)}
            onClick={() =>
              setForm({
                org_role_code: '',
                name: '',
                email: '',
                phone: '',
                department: '',
                status: 'active',
                password: '',
                confirm: '',
              })
            }
            disabled={saving}
          >
            Reset
          </button>

          <button type="submit" style={btn(true)} disabled={saving}>
            {saving ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  );
}