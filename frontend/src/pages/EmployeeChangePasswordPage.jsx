// src/pages/employee/EmployeeChangePasswordPage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePasswordMe } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const LOGOUT_DELAY_MS = 3000;

export default function EmployeeChangePasswordPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(null); // seconds left before logout
  const logoutTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (logoutTimeoutRef.current) clearTimeout(logoutTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const canSubmit = newPassword.length >= 8 && newPassword === confirm;

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    setSuccess(false);
    if (!canSubmit) { setMsg('New passwords do not match or too short.'); return; }
    try {
      setSaving(true);
      await changePasswordMe({ currentPassword, newPassword });
      setSuccess(true);
      setMsg('Password changed successfully. You will be logged out shortly. Please sign in again with your new password.');
      setCurrentPassword(''); setNewPassword(''); setConfirm('');
      setSaving(false);
      const seconds = Math.ceil(LOGOUT_DELAY_MS / 1000);
      setCountdown(seconds);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            return null;
          }
          return c - 1;
        });
      }, 1000);
      logoutTimeoutRef.current = setTimeout(() => {
        logoutTimeoutRef.current = null;
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        logout();
        navigate('/login', { replace: true });
      }, LOGOUT_DELAY_MS);
    } catch (err) {
      setMsg(err?.message || 'Failed to change password.');
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

        {msg && (
          <div
            role="alert"
            style={{
              padding: 12,
              borderRadius: 8,
              color: success ? '#065F46' : '#991B1B',
              background: success ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${success ? '#a7f3d0' : '#fecaca'}`,
              marginTop: 8,
            }}
          >
            <div style={{ fontWeight: 600 }}>{msg}</div>
            {success && countdown != null && (
              <div style={{ marginTop: 6, fontSize: 14 }}>
                Logging out in <strong>{countdown}</strong> second{countdown !== 1 ? 's' : ''}…
              </div>
            )}
          </div>
        )}

        <button type="submit" disabled={!canSubmit || saving}
                style={{ marginTop: 8, padding: '8px 14px', border: 'none', borderRadius: 10,
                         background: '#146b6b', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          {saving ? 'Saving…' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}