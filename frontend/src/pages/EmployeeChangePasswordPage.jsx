// src/pages/employee/EmployeeChangePasswordPage.jsx
import React, { useState } from 'react';
import { changePasswordEmp } from '../services/api.js';

export default function EmployeeChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const canSubmit = newPassword.length >= 8 && newPassword === confirm;

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    if (!canSubmit) { setMsg('New passwords do not match or too short.'); return; }
    try {
      setSaving(true);
      await changePasswordEmp({ currentPassword, newPassword });
      setMsg('Password changed successfully. You can now access your portal.');
      setCurrentPassword(''); setNewPassword(''); setConfirm('');
      // Optionally trigger a refresh token flow or soft-refresh user profile in context
      // to clear needsPasswordChange in the UI without a hard reload.
    } catch (err) {
      setMsg(err?.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 460, margin: '24px auto', padding: 18, border: '1px solid #E5E7EB', borderRadius: 12 }}>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>Change Your Password</h2>
      <p style={{ color: '#6B7280', marginTop: 6 }}>For security, please set a new password before using the portal.</p>
      <form onSubmit={submit} style={{ display: 'grid', gap: 10, marginTop: 12 }}>
        <label style={{ fontWeight: 700, fontSize: 13 }}>Current password</label>
        <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
               style={{ border: '1px solid #D1D5DB', borderRadius: 8, padding: '8px 10px' }} />

        <label style={{ fontWeight: 700, fontSize: 13, marginTop: 8 }}>New password</label>
        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
               placeholder="At least 8 characters"
               style={{ border: '1px solid #D1D5DB', borderRadius: 8, padding: '8px 10px' }} />

        <label style={{ fontWeight: 700, fontSize: 13, marginTop: 8 }}>Confirm new password</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
               style={{ border: '1px solid #D1D5DB', borderRadius: 8, padding: '8px 10px' }} />

        {msg && <div style={{ color: msg.includes('success') ? '#065F46' : '#991B1B' }}>{msg}</div>}

        <button type="submit" disabled={!canSubmit || saving}
                style={{ marginTop: 8, padding: '8px 14px', border: 'none', borderRadius: 10,
                         background: '#146b6b', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          {saving ? 'Saving…' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}