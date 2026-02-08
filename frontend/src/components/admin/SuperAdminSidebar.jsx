// components/admin/SuperAdminSidebar.jsx
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UsersRound,
  Boxes,
  HardHat,
  Factory,
  Clock3,
  Share2,
  MessageSquare,
  Settings,
  Building2,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';

export default function SuperAdminSidebar({ onLogout, user, logoSrc }) {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { to: '/admin/overview', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/companies', label: 'Companies', icon: Building2 },
    { to: '/admin/leads', label: 'Lead Pipeline', icon: UsersRound },
    { to: '/admin/projects', label: 'Projects', icon: Boxes },
    { to: '/admin/on-field', label: 'On-Field', icon: HardHat },
    { to: '/admin/operations', label: 'Operations', icon: Factory },
    { to: '/admin/attendance', label: 'Attendance', icon: Clock3 },
    { to: '/admin/referrals', label: 'Referrals', icon: Share2 },
    { to: '/admin/messages', label: 'Messages', icon: MessageSquare },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const rootStyle = {
    width: collapsed ? 80 : 280,
    transition: 'width .2s ease',
    background: '#ffffff',
    borderRight: '1px solid #E5E7EB',
    height: '100vh',
    position: 'sticky',
    top: 0,
    display: 'flex',
    flexDirection: 'column',
    padding: '16px 12px',
    boxSizing: 'border-box',
  };

  const brandRow = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 8px 16px 8px',
  };

  const brandText = {
    display: collapsed ? 'none' : 'block',
  };

  const navStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginTop: 8,
    flex: 1,
  };

  const linkBase = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 14,
    fontWeight: 600,
    color: '#556070',
    textDecoration: 'none',
  };

  const activeStyle = {
    background: '#146b6b',
    color: '#fff',
    boxShadow: '0 4px 14px rgba(20,107,107,.25)',
  };

  const textHide = { display: collapsed ? 'none' : 'inline' };

  return (
    <aside style={rootStyle} aria-label="Super Admin Sidebar">
      {/* Brand */}
      <div style={brandRow}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fff',
          }}
        >
          {logoSrc ? (
            <img src={logoSrc} alt="Logo" style={{ width: 44, height: 44, objectFit: 'cover' }} />
          ) : (
            <span style={{ fontWeight: 800, color: '#146b6b' }}>⚡</span>
          )}
        </div>
        <div style={brandText}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: '#6B7280' }}>
            XVRYTHNG
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0f1a2b' }}>
            XTECHS RENEWABLES
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={navStyle}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                ...linkBase,
                ...(isActive ? activeStyle : {}),
              })}
            >
              <Icon size={20} />
              <span style={textHide}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer: collapse + user + logout */}
      <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
        <button
          onClick={() => setCollapsed((c) => !c)}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#4B5563',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 10px',
            borderRadius: 12,
          }}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          <span style={textHide}>{collapsed ? 'Expand' : 'Collapse'}</span>
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 10,
            padding: '8px 10px',
            borderRadius: 12,
            background: collapsed ? 'transparent' : '#F9FAFB',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: '#E5F3F1',
              color: '#146b6b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
            }}
            title={user?.name || 'User'}
          >
            {(user?.name || 'A').slice(0, 1).toUpperCase()}
          </div>
          {!collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: '#0f1a2b', lineHeight: 1 }}>
                {user?.name || 'Admin'}
              </div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>Super Admin</div>
            </div>
          )}
        </div>

        <button
          onClick={onLogout}
          style={{
            marginTop: 8,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: '#146b6b',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '10px 12px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(20,107,107,.25)',
          }}
          aria-label="Logout"
        >
          <LogOut size={18} />
          <span style={textHide}>Logout</span>
        </button>
      </div>
    </aside>
  );
}
