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
  ChevronDown,
  LogOut,
  UserPlus,
  UserCog,
  Wrench,
  Calculator,
  TrendingUp,
  Cog,
} from 'lucide-react';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getApprovalsPendingCount } from '../../services/api.js';

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
  { to: '/admin/messages', label: 'Messages', icon: MessageSquare, permission: { resource: 'messages', action: 'view' } },
  { to: '/admin/support-tickets', label: 'Support Tickets', icon: MessageCircle, permission: { resource: 'support', action: 'view' } },
  { to: '/admin/trial-users', label: 'Trial Users', icon: UsersRound, permission: { resource: 'users', action: 'view' } },
  { to: '/admin/settings', label: 'Settings', icon: Settings, permission: { resource: 'settings', action: 'view' } },
  
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

  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    let alive = true;
    const fetchCount = async () => {
      try {
        const res = await getApprovalsPendingCount();
        if (alive) setPendingCount(res?.pending ?? 0);
      } catch (_) {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => { alive = false; clearInterval(interval); };
  }, []);

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

  // Partition into 2 modules (Sales first, then Operation)
  const salesRoutes = useMemo(() => new Set(['/admin/overview', '/admin/leads']), []);
  const salesItems = useMemo(() => navItems.filter((i) => i.to && salesRoutes.has(i.to)), [navItems, salesRoutes]);
  const operationItems = useMemo(
    () => navItems.filter((i) => !(i.to && salesRoutes.has(i.to))),
    [navItems, salesRoutes]
  );

  // Use route prefix directly (not permission-filtered items) so modules auto-open correctly.
  const isSalesPath = location.pathname.startsWith('/admin/overview') || location.pathname.startsWith('/admin/leads');
  const isOperationsPath = !isSalesPath;

  /**
   * Track which parent menus are expanded (e.g. sales, operations, projects submenu).
   * By default, open the submenu if the current path is inside it.
   */
  const [openKeys, setOpenKeys] = useState(() => {
    const isSales = location.pathname.startsWith('/admin/overview') || location.pathname.startsWith('/admin/leads');
    const isOperations = !isSales; // Default to operations if not sales
    const isProjects = location.pathname.startsWith('/admin/projects');
    return { sales: isSales, operations: isOperations, projects: isProjects };
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
    gap: 10,
    // Tighter spacing so items look more "inside" the sidebar.
    padding: '8px 10px',
    borderRadius: 14,
    fontWeight: 600,
    color: '#556070',
    textDecoration: 'none',
    fontSize: 13,
  };

  const activeStyle = {
    background: '#146b6b',
    color: '#fff',
    boxShadow: '0 4px 14px rgba(20,107,107,.25)',
  };

  const moduleHeaderActiveStyle = {
    background: 'rgba(20,107,107,0.10)',
    color: '#0f1a2b',
    boxShadow: 'inset 4px 0 0 #146b6b',
    // Keep the header feeling light; avoid the heavy "card" shadow.
    textDecoration: 'none',
  };

  const submenuActiveStyle = {
    background: 'rgba(20,107,107,0.10)',
    color: '#0f1a2b',
    boxShadow: 'inset 3px 0 0 #146b6b',
  };

  const textHide = { display: collapsed ? 'none' : 'inline' };

  const childLink = {
    ...linkBase,
    padding: '8px 12px',
    borderRadius: 12,
    // Reduce left indentation so the submenu visually sits "inside" the parent.
    marginLeft: 14,
    fontWeight: 600,
    fontSize: 11,
  };

  const moduleHeader = {
    padding: '10px 10px',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.06,
    color: '#6B7280',
    textTransform: 'uppercase',
  };

  const moduleItemsWrapper = {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    // Indent items so they visually sit "inside" the module header.
    paddingLeft: 8,
    marginTop: 4,
  };

  const sectionLabel = {
    ...linkBase,
    cursor: 'pointer',
    userSelect: 'none',
  };

  const renderNavItem = (item) => {
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
                ...(anyChildActive ? moduleHeaderActiveStyle : {}),
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
            <div
              role="group"
              aria-label={`${item.label} submenu`}
              style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}
            >
              {item.children.map((child) => {
                // Match NavLink's `end` behavior to keep submenu highlight accurate.
                const isChildActive = child.to === '/admin/projects'
                  ? location.pathname === child.to
                  : location.pathname.startsWith(child.to);

                return (
                  <NavLink
                    key={child.to}
                    to={child.to}
                    end={child.to === '/admin/projects'}
                    style={{
                      ...childLink,
                      ...(isChildActive ? submenuActiveStyle : {}),
                    }}
                  >
                    {/* Simple dot as child bullet; active uses the brand accent */}
                    <span
                      aria-hidden
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        background: isChildActive ? '#146b6b' : '#94a3b8',
                        display: 'inline-block',
                      }}
                    />
                    <span>{child.label}</span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // --- Normal single link ---
    const showBadge = item.to === '/admin/attendance' && pendingCount > 0;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        style={({ isActive }) => ({
          ...linkBase,
          ...(isActive ? activeStyle : {}),
        })}
      >
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Icon size={20} />
          {showBadge && (
            <span
              style={{
                position: 'absolute',
                top: -6,
                right: -7,
                background: '#EF4444',
                color: '#fff',
                borderRadius: 999,
                minWidth: 16,
                height: 16,
                fontSize: 10,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 3px',
                lineHeight: 1,
                border: '1.5px solid #fff',
              }}
            >
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
        </div>
        <span style={textHide}>{item.label}</span>
      </NavLink>
    );
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
        {/* When sidebar is collapsed, show all items without module toggling */}
        {collapsed ? (
          <>
            {salesItems.map(renderNavItem)}
            {operationItems.map(renderNavItem)}
          </>
        ) : (
          <>
            {salesItems.length > 0 && (
              <>
                {(() => {
                  const isSalesOpen = (openKeys.sales ?? false) || isSalesPath;
                  return (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleOpen('sales')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') toggleOpen('sales');
                      }}
                      aria-expanded={!!isSalesOpen}
                      style={{
                        ...linkBase,
                        ...moduleHeader,
                        cursor: 'pointer',
                        justifyContent: 'space-between',
                        ...(isSalesPath ? moduleHeaderActiveStyle : {}),
                        userSelect: 'none',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                        <TrendingUp size={18} />
                        <span style={{ color: isSalesPath ? '#0f1a2b' : moduleHeader.color }}>Sales Module</span>
                      </span>
                      <ChevronRight
                        size={18}
                        style={{ transform: isSalesOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s ease' }}
                      />
                    </div>
                  );
                })()}
                {(() => {
                  const isSalesOpen = (openKeys.sales ?? false) || isSalesPath;
                  return isSalesOpen ? (
                    <div style={moduleItemsWrapper}>
                      {salesItems.map(renderNavItem)}
                    </div>
                  ) : null;
                })()}
              </>
            )}

            {operationItems.length > 0 && (
              <>
                {salesItems.length > 0 && <div style={{ height: 1, background: '#F3F4F6', margin: '8px 0' }} />}
                {(() => {
                  const isOpsOpen = (openKeys.operations ?? false) || isOperationsPath;
                  return (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleOpen('operations')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') toggleOpen('operations');
                      }}
                      aria-expanded={!!isOpsOpen}
                      style={{
                        ...linkBase,
                        ...moduleHeader,
                        cursor: 'pointer',
                        justifyContent: 'space-between',
                        ...(isOperationsPath ? moduleHeaderActiveStyle : {}),
                        userSelect: 'none',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                        <Cog size={18} />
                        <span style={{ color: isOperationsPath ? '#0f1a2b' : moduleHeader.color }}>Operation</span>
                      </span>
                      <ChevronRight
                        size={18}
                        style={{ transform: isOpsOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s ease' }}
                      />
                    </div>
                  );
                })()}
                {(() => {
                  const isOpsOpen = (openKeys.operations ?? false) || isOperationsPath;
                  return isOpsOpen ? (
                    <div style={moduleItemsWrapper}>
                      {operationItems.map(renderNavItem)}
                    </div>
                  ) : null;
                })()}
              </>
            )}
          </>
        )}
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