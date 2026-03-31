import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, LogOut, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { deleteMyAccount } from '../../services/api.js';

const palette = {
  brand: '#146b6b',
  text: '#0f1a2b',
  subtext: '#6B7280',
  border: '#E5E7EB',
  white: '#ffffff',
  danger: '#B42318',
  dangerBg: '#FEF3F2',
  dangerBorder: '#FECACA',
};

function ActionCard({ title, description, children, danger = false }) {
  return (
    <div
      style={{
        background: danger ? palette.dangerBg : palette.white,
        border: `1px solid ${danger ? palette.dangerBorder : palette.border}`,
        borderRadius: 12,
        padding: 14,
        display: 'grid',
        gap: 10,
      }}
    >
      <div>
        <div style={{ fontWeight: 800, color: danger ? palette.danger : palette.text }}>{title}</div>
        <div style={{ color: palette.subtext, fontSize: 13, marginTop: 4 }}>{description}</div>
      </div>
      {children}
    </div>
  );
}

export default function AccountSessionDangerSection() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [busyLogout, setBusyLogout] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleLogout() {
    try {
      setBusyLogout(true);
      setError('');
      setMessage('');
      await Promise.resolve(logout());
      navigate('/login', { replace: true });
    } catch (e) {
      setError(e?.message || 'Log out failed. Please try again.');
    } finally {
      setBusyLogout(false);
    }
  }

  async function handleDeleteAccount() {
    setError('');
    setMessage('');

    if (deleteConfirm.trim().toUpperCase() !== 'DELETE') {
      setError('Please type DELETE to confirm account deletion.');
      return;
    }

    const approved = window.confirm('This will permanently delete your account. This action cannot be undone. Continue?');
    if (!approved) return;

    try {
      setBusyDelete(true);
      await deleteMyAccount();
      await Promise.resolve(logout());
      navigate('/login', { replace: true });
    } catch (e) {
      setError(e?.message || 'Failed to delete account.');
    } finally {
      setBusyDelete(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gap: 4 }}>
        <h2 style={{ margin: 0, color: palette.text }}>Log Out / Delete Account</h2>
        <p style={{ margin: 0, color: palette.subtext, fontSize: 13 }}>
          Manage your current session and account lifecycle.
        </p>
      </div>

      {message && (
        <div
          role="status"
          style={{
            border: `1px solid ${palette.border}`,
            borderRadius: 10,
            background: '#ECFDF3',
            color: '#067647',
            padding: '10px 12px',
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            border: `1px solid ${palette.dangerBorder}`,
            borderRadius: 10,
            background: '#FFF1F2',
            color: palette.danger,
            padding: '10px 12px',
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <ActionCard
        title="Log Out"
        description="End your current session on this device."
      >
        <div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={busyLogout || busyDelete}
            style={{
              border: `1px solid ${palette.border}`,
              borderRadius: 10,
              background: '#fff',
              color: palette.text,
              fontWeight: 700,
              padding: '9px 14px',
              cursor: busyLogout || busyDelete ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <LogOut size={16} />
            {busyLogout ? 'Logging out…' : 'Log out now'}
          </button>
        </div>
      </ActionCard>

      <ActionCard
        danger
        title="Delete Account"
        description="Permanently remove your account and all associated access. This cannot be undone."
      >
        <div style={{
          border: `1px dashed ${palette.dangerBorder}`,
          borderRadius: 10,
          padding: '9px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: palette.danger,
          fontSize: 12,
          fontWeight: 700,
        }}>
          <AlertTriangle size={15} />
          This action is destructive and irreversible.
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ fontWeight: 700, color: palette.text, fontSize: 13 }}>
            Type DELETE to confirm
          </label>
          <input
            type="text"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="DELETE"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: `1px solid ${palette.border}`,
              background: '#fff',
              outline: 'none',
              fontSize: 14,
              color: palette.text,
            }}
          />
        </div>

        <div>
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={busyDelete || busyLogout}
            style={{
              border: '1px solid #F04438',
              borderRadius: 10,
              background: '#F04438',
              color: '#fff',
              fontWeight: 800,
              padding: '9px 14px',
              cursor: busyDelete || busyLogout ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              opacity: busyDelete || busyLogout ? 0.75 : 1,
            }}
          >
            <Trash2 size={16} />
            {busyDelete ? 'Deleting account…' : 'Delete account permanently'}
          </button>
        </div>
      </ActionCard>
    </div>
  );
}
