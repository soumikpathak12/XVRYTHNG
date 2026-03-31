// components/admin/SuperAdminSidebar.jsx
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  UsersRound,
  Boxes,
  HardHat,
  Factory,
  Clock3,
  MessageSquare,
  MessageCircle,
  Settings,
  Building2,
  ChevronLeft,
  ChevronRight,
  UserCog,
  Wrench,
  Calculator,
  TrendingUp,
  Cog,
} from 'lucide-react';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getApprovalsPendingCount } from '../../services/api.js';
import { navItemMatchesLocation } from '../../utils/navLinkMatch.js';

/**
 * Top-level nav items.
 * NOTE: Project Manager module uses 3 direct items (no nested Projects dropdown).
 */
const RAW_NAV = [
  { to: '/admin/overview', label: 'Dashboard', icon: LayoutDashboard, permission: { resource: 'overview', action: 'view' } },
  { to: '/admin/companies', label: 'Companies', icon: Building2, permission: { resource: 'companies', action: 'view' } },
  { to: '/admin/leads', label: 'Leads Kanban', icon: TrendingUp, permission: { resource: 'leads', action: 'view' } },
  { to: '/admin/employees', label: 'Employees', icon: UserCog, permission: { resource: 'employees', action: 'view' } },

  { to: '/admin/projects/dashboard', label: 'Dashboard', icon: Boxes, permission: { resource: 'projects', action: 'view' } },
  { to: '/admin/projects', label: 'In-house Project', icon: Boxes, permission: { resource: 'projects', action: 'view' } },
  { to: '/admin/projects/retailer', label: 'Retailer Project', icon: Boxes, permission: { resource: 'projects', action: 'view' } },

  { to: '/admin/installation', label: 'Installation Day', icon: Wrench, permission: { resource: 'installation', action: 'view' } },
  { to: '/admin/on-field', label: 'On-Field', icon: HardHat, permission: { resource: 'on_field', action: 'view' } },
  { to: '/admin/operations', label: 'Operations', icon: Factory, permission: { resource: 'operations', action: 'view' } },
  { to: '/admin/payroll', label: 'Payroll', icon: Calculator, permission: { resource: 'payroll', action: 'view' } },
  { to: '/admin/attendance', label: 'Attendance', icon: Clock3, permission: { resource: 'attendance', action: 'view' } },
  // Referrals is now accessible inside Settings → Referral Program tab
  { to: '/admin/messages', label: 'Messages', icon: MessageSquare, permission: { resource: 'messages', action: 'view' } },
  { to: '/admin/support-tickets', label: 'Support Tickets', icon: MessageCircle, permission: { resource: 'support', action: 'view' } },
  { to: '/admin/trial-users', label: 'Trial Users', icon: UsersRound, permission: { resource: 'users', action: 'view' } },
  
  // --- SETTINGS (flatten - no nested children) ---
  { to: '/admin/settings', label: 'General', icon: Settings, permission: { resource: 'settings', action: 'view' } },
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
  const brandLogoSrc = logoSrc || '/logo.jpeg';
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

  const sections = useMemo(() => {
    const findByTo = (to) => navItems.find((i) => i.to === to);
    const pick = (arr) => arr.filter(Boolean);

    const salesItems = pick([
      findByTo('/admin/overview'),
      findByTo('/admin/leads'),
    ]);

    const projectManagerItems = pick([
      findByTo('/admin/projects/dashboard'),
      findByTo('/admin/projects'),
      findByTo('/admin/projects/retailer'),
    ]);

    const attendanceItems = pick([
      findByTo('/admin/attendance'),
    ]);

    const onFieldItems = pick([
      findByTo('/admin/on-field'),
      findByTo('/admin/installation'),
    ]);

    const communicationsItems = pick([
      findByTo('/admin/messages'),
      findByTo('/admin/support-tickets'),
    ]);

    const operationsItems = pick([
      findByTo('/admin/operations'),
      findByTo('/admin/payroll'),
      findByTo('/admin/trial-users'),
      findByTo('/admin/employees'),
      findByTo('/admin/companies'),
      // findByTo('/admin/profile'),
    ]);

    const settingsItems = pick([
      findByTo('/admin/settings'),
      findByTo('/admin/settings/inspection-templates'),
      findByTo('/admin/settings/checklist-templates'),
    ]);

    return [
      { key: 'sales', title: 'Sales Management', icon: TrendingUp, items: salesItems },
      { key: 'project_manager', title: 'Project Manager Module', icon: Boxes, items: projectManagerItems },
      { key: 'attendance', title: 'Attendance', icon: Clock3, items: attendanceItems },
      { key: 'on_field', title: 'On-Field Module', icon: HardHat, items: onFieldItems },
      { key: 'communications', title: 'Communications', icon: MessageSquare, items: communicationsItems },
      { key: 'operations', title: 'Operation', icon: Cog, items: operationsItems },
      { key: 'settings', title: 'Settings', icon: Settings, items: settingsItems },
    ].filter((s) => s.items.length > 0);
  }, [navItems]);

  /**
   * Track which parent menus are expanded (e.g. sales, operations, projects submenu).
   * By default, open the submenu if the current path is inside it.
   */
  const [openKeys, setOpenKeys] = useState(() => {
    const pathname = location.pathname || '';
    return {
      sales: pathname.startsWith('/admin/overview') || pathname.startsWith('/admin/leads'),
      project_manager: pathname.startsWith('/admin/projects'),
      attendance: pathname.startsWith('/admin/attendance'),
      on_field: pathname.startsWith('/admin/on-field') || pathname.startsWith('/admin/installation'),
      communications: pathname.startsWith('/admin/messages') || pathname.startsWith('/admin/support-tickets'),
      operations:
        pathname.startsWith('/admin/operations') ||
        pathname.startsWith('/admin/payroll') ||
        pathname.startsWith('/admin/trial-users') ||
        pathname.startsWith('/admin/employees') ||
        pathname.startsWith('/admin/companies') ||
        false,
      // pathname.startsWith('/admin/profile'),
      settings: pathname.startsWith('/admin/settings'),
    };
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
    const matchesLocation = (candidate) => {
      if (!candidate?.to) return false;
      if (String(candidate.to).includes('?')) {
        return navItemMatchesLocation(candidate, location.pathname, location.search);
      }
      return location.pathname.startsWith(candidate.to);
    };

    // --- Parent with children: render as a collapsible section ---
    if (item.children?.length) {
      const anyChildActive = item.children.some(matchesLocation);
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
    const exactEnd =
      (typeof item.to === 'string' && item.to.includes('?')) ||
      item.to === '/admin/settings' ||
      item.to === '/admin/settings/inspection-templates' ||
      item.to === '/admin/settings/checklist-templates' ||
      // Avoid prefix-match highlighting for project subroutes:
      // "/admin/projects" should not appear active on "/admin/projects/retailer".
      item.to === '/admin/projects';
    const queryAware =
      typeof item.to === 'string' && item.to.includes('?');
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={exactEnd}
        style={({ isActive }) => {
          const active = queryAware
            ? navItemMatchesLocation(item, location.pathname, location.search)
            : isActive;
          return {
            ...linkBase,
            ...(active ? activeStyle : {}),
          };
        }}
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
          <img src={brandLogoSrc} alt="Company logo" style={{ width: 44, height: 44, objectFit: 'cover' }} />
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
            {sections.flatMap((sec) => sec.items).map(renderNavItem)}
          </>
        ) : (
          <>
            {sections.map((sec, idx) => {
              const isPathActive = sec.items.some((item) => {
                if (item.children?.length) return item.children.some((child) => {
                  if (String(child.to).includes('?')) {
                    return navItemMatchesLocation(child, location.pathname, location.search);
                  }
                  return location.pathname.startsWith(child.to);
                });
                return item.to
                  ? navItemMatchesLocation(item, location.pathname, location.search)
                  : false;
              });
              // Use openKeys as the source of truth so a user can collapse even when the current route is inside the module.
              const isOpen = openKeys[sec.key] ?? false;
              const SectionIcon = sec.icon;
              return (
                <div key={sec.key}>
                  {idx > 0 && <div style={{ height: 1, background: '#F3F4F6', margin: '8px 0' }} />}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleOpen(sec.key)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') toggleOpen(sec.key);
                    }}
                    aria-expanded={!!isOpen}
                    style={{
                      ...linkBase,
                      ...moduleHeader,
                      cursor: 'pointer',
                      justifyContent: 'space-between',
                      ...(isPathActive ? moduleHeaderActiveStyle : {}),
                      userSelect: 'none',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                      <SectionIcon size={18} />
                      <span style={{ color: isPathActive ? '#0f1a2b' : moduleHeader.color }}>{sec.title}</span>
                    </span>
                    <ChevronRight
                      size={18}
                      style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s ease' }}
                    />
                  </div>
                  {isOpen && (
                    <div style={moduleItemsWrapper}>
                      {sec.items.map(renderNavItem)}
                    </div>
                  )}
                </div>
              );
            })}
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
