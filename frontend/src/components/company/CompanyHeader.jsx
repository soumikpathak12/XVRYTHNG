// src/components/company/CompanyHeader.jsx
import { LogOut, User } from 'lucide-react';

const BASE = import.meta.env.VITE_API_URL || '';

function resolveProfileImageUrl(imageUrl) {
  if (!imageUrl) return null;
  if (String(imageUrl).startsWith('http')) return imageUrl;
  if (!BASE) return imageUrl;
  const cleanBase = BASE.endsWith('/api') ? BASE.slice(0, -4) : BASE;
  return `${cleanBase}${imageUrl}`;
}

export default function CompanyHeader({ user, onLogout }) {
  const avatarSrc = resolveProfileImageUrl(
    user?.image_url || user?.avatar_url || user?.avatarUrl || user?.photo_url || user?.photoUrl
  );

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: 60,
        background: '#fff',
        borderBottom: '1px solid #E5E7EB',
        padding: '0 24px',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#E5F3F1',
            color: '#146b6b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 14,
            overflow: 'hidden',
          }}
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={user?.name || 'User'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : user?.name ? (
            user.name.charAt(0).toUpperCase()
          ) : (
            <User size={16} />
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1F2937' }}>
            {user?.name || 'User'}
          </span>
          <span style={{ fontSize: 11, color: '#6B7280' }}>
            {/* prettify role: 'company_admin' -> 'company admin' */}
            {user?.role ? String(user.role).replace('_', ' ') : 'company'}
          </span>
        </div>
      </div>

      <div style={{ width: 1, height: 24, background: '#E5E7EB' }} />

      <button
        onClick={onLogout}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#4B5563',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 500,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#F3F4F6')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        title="Logout"
      >
        <LogOut size={16} />
        <span>Logout</span>
      </button>
    </header>
  );
}