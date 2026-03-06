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
  MessageCircle,
  Settings,
  Building2,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserPlus,
  UserCog
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

const ALL_NAV_ITEMS = [
  { to: '/admin/overview', label: 'Dashboard', icon: LayoutDashboard, permission: { resource: 'overview', action: 'view' } },
  { to: '/admin/profile', label: 'My Profile', icon: UserCircle, permission: { resource: 'profile', action: 'view' } },
  { to: '/admin/companies', label: 'Companies', icon: Building2, permission: { resource: 'companies', action: 'view' } },
  { to: '/admin/leads', label: 'Lead Pipeline', icon: UsersRound, permission: { resource: 'leads', action: 'view' } },
  { to: '/admin/employees', label: 'Employees', icon: UserCog, permission: { resource: 'employees', action: 'view' } },
  { to: '/admin/projects', label: 'Projects', icon: Boxes, permission: { resource: 'projects', action: 'view' } },
  { to: '/admin/on-field', label: 'On-Field', icon: HardHat, permission: { resource: 'on_field', action: 'view' } },
  { to: '/admin/operations', label: 'Operations', icon: Factory, permission: { resource: 'operations', action: 'view' } },
  { to: '/admin/attendance', label: 'Attendance', icon: Clock3, permission: { resource: 'attendance', action: 'view' } },
  { to: '/admin/referrals', label: 'Referrals', icon: Share2, permission: { resource: 'referrals', action: 'view' } },
  { to: '/admin/messages', label: 'Messages', icon: MessageSquare, permission: { resource: 'messages', action: 'view' } },
  { to: '/admin/support-tickets', label: 'Support Tickets', icon: MessageCircle, permission: { resource: 'support', action: 'view' } },
  { to: '/admin/trial-users', label: 'Trial Users', icon: UsersRound, permission: { resource: 'users', action: 'view' } },
  { to: '/admin/settings', label: 'Settings', icon: Settings, permission: { resource: 'settings', action: 'view' } },
  { to: '/admin/users/create', label: 'Add User', icon: UserPlus, permission: { resource: 'users', action: 'create' } },
  
];

export default function SuperAdminSidebar({ onLogout, user, logoSrc, collapsed: controlledCollapsed, onCollapsedChange }) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = onCollapsedChange != null ? controlledCollapsed : internalCollapsed;
  const setCollapsed = onCollapsedChange != null
    ? (v) => onCollapsedChange(typeof v === 'function' ? v(controlledCollapsed) : v)
    : setInternalCollapsed;
  const { can } = useAuth();
  const navItems = useMemo(() => {
    return ALL_NAV_ITEMS.filter((item) => can(item.permission.resource, item.permission.action));
  }, [can]);

  const rootStyle = {
    width: collapsed ? 80 : 280,
    transition: 'width .2s ease',
    background: '#ffffff',
    borderRight: '1px solid #E5E7EB',
    height: '100vh',
    position: 'fixed',
    left: 0,
    top: 0,
    zIndex: 40,
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
    minHeight: 0,
    overflowY: 'auto',
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
      </div>
    </aside>
  );
}
