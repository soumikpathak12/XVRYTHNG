// components/admin/SuperAdminSidebar.jsx
import { NavLink, useLocation } from 'react-router-dom';
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
  UserCog,
  Wrench,
  Calculator,
} from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * Top-level nav items.
 * NOTE: Projects is now a parent with 3 children (Dashboard, In-house, Retailer).
 */
const RAW_NAV = [
  { to: '/admin/overview', label: 'Dashboard', icon: LayoutDashboard, permission: { resource: 'overview', action: 'view' } },
  { to: '/admin/profile', label: 'My Profile', icon: UserCircle, permission: { resource: 'profile', action: 'view' } },
  { to: '/admin/companies', label: 'Companies', icon: Building2, permission: { resource: 'companies', action: 'view' } },
  { to: '/admin/leads', label: 'Lead Pipeline', icon: UsersRound, permission: { resource: 'leads', action: 'view' } },
  { to: '/admin/employees', label: 'Employees', icon: UserCog, permission: { resource: 'employees', action: 'view' } },

  // --- PROJECTS (parent) ---
  {
    key: 'projects',
    label: 'Projects',
    icon: Boxes,
    permission: { resource: 'projects', action: 'view' },
    // Children use the same 'projects:view' permission by default (can be customized per item if needed)
    children: [
      { to: '/admin/projects/dashboard', label: 'Dashboard', permission: { resource: 'projects', action: 'view' } },
      // "In-house" goes to the existing ProjectsPage (your current route)
      { to: '/admin/projects', label: 'In-house', permission: { resource: 'projects', action: 'view' } },
      { to: '/admin/projects/retailer', label: 'Retailer', permission: { resource: 'projects', action: 'view' } },
    ],
  },

  { to: '/admin/installation', label: 'Installation Day', icon: Wrench, permission: { resource: 'installation', action: 'view' } },
  { to: '/admin/on-field', label: 'On-Field', icon: HardHat, permission: { resource: 'on_field', action: 'view' } },
  { to: '/admin/operations', label: 'Operations', icon: Factory, permission: { resource: 'operations', action: 'view' } },
  { to: '/admin/payroll', label: 'Payroll', icon: Calculator, permission: { resource: 'payroll', action: 'view' } },
  { to: '/admin/attendance', label: 'Attendance', icon: Clock3, permission: { resource: 'attendance', action: 'view' } },
  { to: '/admin/referrals', label: 'Referrals', icon: Share2, permission: { resource: 'referrals', action: 'view' } },
  { to: '/admin/messages', label: 'Messages', icon: MessageSquare, permission: { resource: 'messages', action: 'view' } },
  { to: '/admin/support-tickets', label: 'Support Tickets', icon: MessageCircle, permission: { resource: 'support', action: 'view' } },
  { to: '/admin/trial-users', label: 'Trial Users', icon: UsersRound, permission: { resource: 'users', action: 'view' } },
  { to: '/admin/settings', label: 'Settings', icon: Settings, permission: { resource: 'settings', action: 'view' } },
  { to: '/admin/users/create', label: 'Add User', icon: UserPlus, permission: { resource: 'users', action: 'create' } },
];

export default function SuperAdminSidebar({
  onLogout,
  user,
  logoSrc,
  collapsed: controlledCollapsed,
  onCollapsedChange,
}) {
  const location = useLocation();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = onCollapsedChange != null ? controlledCollapsed : internalCollapsed;
  const setCollapsed = onCollapsedChange != null
    ? (v) => onCollapsedChange(typeof v === 'function' ? v(controlledCollapsed) : v)
    : setInternalCollapsed;

  const { can } = useAuth();

  /**
   * Filter nav based on permission; also filter children (Projects submenu).
   * If a parent has no permitted children, it won't render as expandable.
   */
  const navItems = useMemo(() => {
    return RAW_NAV
      .map((item) => {
        if (item.children?.length) {
          const allowedChildren = item.children.filter((c) => can(c.permission.resource, c.permission.action));
          if (!can(item.permission.resource, item.permission.action) && allowedChildren.length === 0) {
            return null;
          }
          return { ...item, children: allowedChildren };
        }
        return can(item.permission.resource, item.permission.action) ? item : null;
      })
      .filter(Boolean);
  }, [can]);

  /**
   * Track which parent menus are expanded (e.g. projects submenu).
   * By default, open the submenu if the current path is inside it.
   */
  const [openKeys, setOpenKeys] = useState(() => {
    const isProjects = location.pathname.startsWith('/admin/projects');
    return { projects: isProjects };
  });

  const toggleOpen = useCallback((key) => {
    setOpenKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ---- Inline styles (same tone as your current sidebar) ----
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

  const brandText = { display: collapsed ? 'none' : 'block' };

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

  const childLink = {
    ...linkBase,
    padding: '8px 12px',
    borderRadius: 12,
    marginLeft: 36,          
    fontWeight: 600,
    fontSize: 13,
  };

  const sectionLabel = {
    ...linkBase,
    cursor: 'pointer',
    userSelect: 'none',
  };

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

          // --- Parent with children: render as a collapsible section ---
          if (item.children?.length) {
            const anyChildActive = item.children.some((c) => location.pathname.startsWith(c.to));
            const isOpen = openKeys[item.key ?? 'projects'] ?? anyChildActive;

            // When sidebar is collapsed, we render only a single icon button (no children list)
            if (collapsed) {
              return (
                <div key={item.key ?? 'projects'}>
                  <div
                    style={{
                      ...sectionLabel,
                      justifyContent: 'center',
                      padding: 10,
                      ...(anyChildActive ? activeStyle : {}),
                    }}
                    onClick={() => toggleOpen(item.key ?? 'projects')}
                    aria-expanded={!!isOpen}
                  >
                    <Icon size={20} />
                  </div>
                </div>
              );
            }

            return (
              <div key={item.key ?? 'projects'}>
                <div
                  style={{
                    ...sectionLabel,
                    ...(anyChildActive ? activeStyle : {}),
                    justifyContent: 'space-between',
                  }}
                  onClick={() => toggleOpen(item.key ?? 'projects')}
                  aria-expanded={!!isOpen}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </span>
                  <ChevronRight
                    size={18}
                    style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s ease' }}
                  />
                </div>

                {isOpen && (
                  <div role="group" aria-label={`${item.label} submenu`} style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        end={child.to === '/admin/projects'}
                        style={({ isActive }) => ({
                          ...childLink,
                          ...(isActive ? activeStyle : {}),
                        })}
                      >
                        {/* Simple dot as child bullet; you can swap for an icon if you want */}
                        <span
                          aria-hidden
                          style={{
                            width: 6, height: 6, borderRadius: 999, background: '#94a3b8', display: 'inline-block',
                          }}
                        />
                        <span>{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // --- Normal single link ---
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

      {/* Collapse / Expand */}
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