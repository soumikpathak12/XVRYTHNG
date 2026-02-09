// src/components/settings/ChangePasswordCard.jsx
import { useState } from 'react';
import { changePassword } from '../../services/api.js';

const palette = {
  brand: '#146b6b',
  brandHover: '#0f5858',
  text: '#0f1a2b',
  subtext: '#6B7280',
  border: '#E5E7EB',
  white: '#ffffff',
  success: '#2BB673',
  danger: '#D14343',
};

const card = {
  background: palette.white,
  border: `1px solid ${palette.border}`,
  borderRadius: 16,
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: `1px solid ${palette.border}`,
  background: '#F9FAFB',
  outline: 'none',
  fontSize: 14,
  color: palette.text,
};

const labelStyle = {
  display: 'block',
  fontWeight: 700,
  color: palette.text,
  marginBottom: 8,
  fontSize: 13,
};

const helpStyle = {
  fontSize: 12,
  color: palette.subtext,
  marginTop: 6,
};


export default function ChangePasswordCard({
  title = 'Security',
  description = 'Change your password. For security reasons, other sessions will be signed out.',
  onSuccess,
}) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [serverMessage, setServerMessage] = useState(null);
  const [serverErrors, setServerErrors] = useState({});

  const onChangeField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setServerErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerErrors({});
    setServerMessage(null);

    if (form.newPassword !== form.confirmPassword) {
      setServerErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }
    if ((form.newPassword || '').length < 8) {
      setServerErrors({ newPassword: 'New password must be at least 8 characters' });
      return;
    }

    try {
      setSaving(true);
      const res = await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      const msg = res.message || 'Password updated successfully';
      setServerMessage(msg);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      onSuccess?.(msg);
    } catch (err) {
      if (err?.status === 422 && err.body?.errors) {
        setServerErrors(err.body.errors);
        setServerMessage('Please fix the errors and try again.');
      } else {
        setServerMessage(err.message || 'Failed to change password');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} style={{ ...card, padding: 16 }}>
      <div style={{ marginBottom: 6 }}>
        <h2 style={{ margin: 0, color: palette.text }}>{title}</h2>
        <div style={{ ...helpStyle, marginTop: 6 }}>{description}</div>
      </div>

      {serverMessage && (
        <div
          role="status"
          style={{
            marginTop: 10,
            marginBottom: 10,
            padding: '10px 12px',
            borderRadius: 10,
            background: serverErrors && Object.keys(serverErrors).length ? '#FFF2F2' : '#E9F7F1',
            color: serverErrors && Object.keys(serverErrors).length ? palette.danger : palette.success,
            border: `1px solid ${
              serverErrors && Object.keys(serverErrors).length ? '#FAD1D1' : '#CDEFD9'
            }`,
            fontWeight: 700,
          }}
        >
          {serverMessage}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={labelStyle}>Current Password</label>
          <input
            type="password"
            value={form.currentPassword}
            onChange={onChangeField('currentPassword')}
            style={inputStyle}
            aria-invalid={!!serverErrors.currentPassword}
          />
          {serverErrors.currentPassword && (
            <div style={{ ...helpStyle, color: palette.danger }}>{serverErrors.currentPassword}</div>
          )}
        </div>

        <div>
          <label style={labelStyle}>New Password</label>
          <input
            type="password"
            value={form.newPassword}
            onChange={onChangeField('newPassword')}
            style={inputStyle}
            aria-invalid={!!serverErrors.newPassword}
          />
          {serverErrors.newPassword && (
            <div style={{ ...helpStyle, color: palette.danger }}>{serverErrors.newPassword}</div>
          )}
        </div>

        <div>
          <label style={labelStyle}>Confirm New Password</label>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={onChangeField('confirmPassword')}
            style={inputStyle}
            aria-invalid={!!serverErrors.confirmPassword}
          />
          {serverErrors.confirmPassword && (
            <div style={{ ...helpStyle, color: palette.danger }}>{serverErrors.confirmPassword}</div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            background: saving ? '#9EC9C9' : palette.brand,
            border: 'none',
            color: '#fff',
            fontWeight: 800,
            padding: '10px 16px',
            borderRadius: 10,
            cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(20,107,107,.2)',
          }}
          onMouseOver={(e) => { if (!saving) e.currentTarget.style.background = palette.brandHover; }}
          onMouseOut={(e)  => { if (!saving) e.currentTarget.style.background = palette.brand; }}
          aria-busy={saving}
        >
          {saving ? 'Changing…' : 'Change Password'}
        </button>
      </div>
    </form>
  );
}