// src/pages/employee/EmployeeSidebar.jsx
import { NavLink, useLocation } from 'react-router-dom';
import {
  UsersRound,
  HardHat,
  MessageSquare,
  MessageCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Gift,
  LayoutDashboard,
  PalmtreeIcon,
  Receipt,
  Wrench,
  CheckCircle2,
  Calculator,
  TrendingUp,
  Briefcase,
  Building2,
  CalendarRange,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { getCompanySidebar } from '../../services/api.js';
import { useSidebar } from '../../context/AuthContext.jsx';
import { navItemMatchesLocation } from '../../utils/navLinkMatch.js';

const EMP_MODULE_NAV = {
  // Dashboard appears only when Sales module is enabled.
  dashboard: { to: '/employee', label: 'Dashboard', icon: LayoutDashboard },

  // Module-driven items (segment-specific pipelines)
  leads: { to: '/employee/leads', label: 'Leads Kanban', icon: TrendingUp },
  site_inspection: { to: '/employee/site-inspection', label: 'Site Inspection', icon: UsersRound },
  on_field: { to: '/employee/on-field', label: 'On-Field', icon: HardHat },
  installation: { to: '/employee/installation', label: 'Installation Day', icon: Wrench },
  messages: { to: '/employee/messages', label: 'Messages', icon: MessageSquare },
  settings: { to: '/employee/settings', label: 'Settings', icon: Settings },
  attendance: { to: '/employee/attendance', label: 'Attendance', icon: ClipboardList },
  attendance_history: { to: '/employee/attendance-history', label: 'Team attendance', icon: CalendarRange },
  leave: { to: '/employee/leave', label: 'Leave', icon: PalmtreeIcon },
  expenses: { to: '/employee/expenses', label: 'Expenses', icon: Receipt },
  operations: { to: '/employee/operations', label: 'Operations', icon: Briefcase },
  projects: { to: '/employee/projects', label: 'Projects', icon: Building2 },
  referrals: { to: '/employee/referrals', label: 'Referrals', icon: Gift },
  support: { to: '/employee/support-tickets', label: 'Support Tickets', icon: MessageCircle },

  // Approvals and Payroll
  approvals: { to: '/employee/approvals', label: 'Approvals', icon: CheckCircle2 },
  payroll: { to: '/employee/payroll', label: 'Payroll', icon: Calculator },
};

export default function EmployeeSidebar() {
  const location = useLocation();
  const { sidebarVersion } = useSidebar();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getCompanySidebar(); // GET /api/me/sidebar
        if (!alive) return;
        const mods = Array.isArray(data?.modules) ? data.modules : [];
        setModules(mods);
      } catch (err) {
        console.error('[EmployeeSidebar] Error loading sidebar:', err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [sidebarVersion]);

  const allowed = new Set(modules ?? []);

  // Track expanded/collapsed state for parent items like Projects
  const [openKeys, setOpenKeys] = useState(() => {
    const pathname = location.pathname || '';
    return {
      sales: pathname === '/employee' || pathname.startsWith('/employee/leads'),
      project_manager: pathname.startsWith('/employee/projects'),
      attendance:
        pathname.startsWith('/employee/attendance-history') ||
        /^\/employee\/attendance(\/|$)/.test(pathname) ||
        pathname.startsWith('/employee/leave'),
      on_field:
        pathname.startsWith('/employee/on-field') ||
        pathname.startsWith('/employee/site-inspection') ||
        pathname.startsWith('/employee/installation'),
      communications:
        pathname.startsWith('/employee/messages') ||
        pathname.startsWith('/employee/referrals') ||
        pathname.startsWith('/employee/support-tickets'),
      operations:
        pathname.startsWith('/employee/approvals') ||
        pathname.startsWith('/employee/payroll'),
      settings: pathname.startsWith('/employee/settings'),
    };
  });

  const toggleOpen = useCallback((key) => {
    setOpenKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const hasOps = allowed.has('operations');
  const hasPayroll = allowed.has('payroll');
  // Leave is a core HR flow and should remain visible even when role module keys vary.
  const hasLeave = true;
  const operationsTitle =
    hasOps && hasPayroll ? 'Approvals & Payroll' : hasOps ? 'Approvals' : 'Payroll';

  // Grouped nav structure (DB: approvals → module `operations`, payroll → module `payroll`)
  const sections = [
    {
      key: 'sales',
      title: 'Sales Management',
      items: [
        ...(allowed.has('leads')
          ? [EMP_MODULE_NAV.dashboard, EMP_MODULE_NAV.leads]
          : []),
      ],
    },
    {
      key: 'project_manager',
      title: 'Project Manager Module',
      items: [
        ...(allowed.has('projects')
          ? [
              { to: '/employee/projects/dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { to: '/employee/projects', label: 'In-house Project', icon: Wrench, end: true },
              { to: '/employee/projects/retailer', label: 'Retailer Project', icon: Wrench },
            ]
          : []),
      ],
    },
    {
      key: 'attendance',
      title: 'Attendance',
      items: [
        ...(allowed.has('attendance') ? [EMP_MODULE_NAV.attendance] : []),
        ...(allowed.has('attendance_history') ? [EMP_MODULE_NAV.attendance_history] : []),
        ...(hasLeave ? [EMP_MODULE_NAV.leave] : []),
      ],
    },
    {
      key: 'on_field',
      title: 'On-Field Module',
      items: [
        ...(allowed.has('on_field') ? [EMP_MODULE_NAV.on_field] : []),
        ...(allowed.has('site_inspection') ? [EMP_MODULE_NAV.site_inspection] : []),
        ...(allowed.has('installation') ? [EMP_MODULE_NAV.installation] : []),
      ],
    },
    {
      key: 'communications',
      title: 'Communications',
      items: [
        ...(allowed.has('messages') ? [EMP_MODULE_NAV.messages] : []),
        ...(allowed.has('referrals') ? [EMP_MODULE_NAV.referrals] : []),
        ...(allowed.has('support') ? [EMP_MODULE_NAV.support] : []),
      ],
    },
    {
      key: 'operations',
      title: operationsTitle,
      items: [
        ...(hasOps ? [EMP_MODULE_NAV.approvals] : []),
        ...(hasPayroll ? [EMP_MODULE_NAV.payroll] : []),
      ],
    },
    {
      key: 'settings',
      title: 'Settings',
      items: [
        ...(allowed.has('settings') ? [EMP_MODULE_NAV.settings] : []),
      ],
    },
  ].map((s) => ({
    ...s,
    items: s.items.filter(Boolean),
  })).filter((s) => s.items.length > 0);

  const linkBase = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    // Tighten horizontal padding so labels sit more "inside" the sidebar.
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

  const moduleHeader = {
    padding: '10px 10px',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.06,
    color: '#6B7280',
    textTransform: 'uppercase',
  };

  const moduleHeaderActiveStyle = {
    background: 'rgba(20,107,107,0.10)',
    color: '#0f1a2b',
    boxShadow: 'inset 4px 0 0 #146b6b',
    borderRadius: 12,
  };
  const moduleItemsWrapper = {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    paddingLeft: 8,
    marginTop: 4,
  };

  const pathname = location.pathname || '';
  const isSalesPath =
    pathname === '/employee' ||
    pathname.startsWith('/employee/leads');
  const isProjectManagerPath = pathname.startsWith('/employee/projects');
  const isAttendancePath =
    pathname.startsWith('/employee/attendance-history') ||
    /^\/employee\/attendance(\/|$)/.test(pathname) ||
    pathname.startsWith('/employee/leave');
  const isOnFieldPath =
    pathname.startsWith('/employee/on-field') ||
    pathname.startsWith('/employee/site-inspection') ||
    pathname.startsWith('/employee/installation');
  const isCommunicationsPath =
    pathname.startsWith('/employee/messages') ||
    pathname.startsWith('/employee/referrals') ||
    pathname.startsWith('/employee/support-tickets');
  const isOperationsPath =
    pathname.startsWith('/employee/approvals') ||
    pathname.startsWith('/employee/payroll');
  const isSettingsPath = pathname.startsWith('/employee/settings');

  return (
    <aside
      style={{
        width: collapsed ? 80 : 280,
        transition: 'width .2s ease',
        background: '#fff',
        borderRight: '1px solid #E5E7EB',
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 12px',
      }}
    >
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ color: '#6B7280', fontSize: 13, padding: '4px 10px' }}>Loading menu…</div>
        ) : sections.length === 0 ? (
          <div style={{ color: '#6B7280', fontSize: 13, padding: '4px 10px' }}>No items.</div>
        ) : (
          sections.map((sec, idx) => {
            const isActiveHeader =
              (sec.key === 'sales' && isSalesPath) ||
              (sec.key === 'project_manager' && isProjectManagerPath) ||
              (sec.key === 'attendance' && isAttendancePath) ||
              (sec.key === 'on_field' && isOnFieldPath) ||
              (sec.key === 'communications' && isCommunicationsPath) ||
              (sec.key === 'operations' && isOperationsPath) ||
              (sec.key === 'settings' && isSettingsPath);
            // Use openKeys as the source of truth so user can collapse even while inside the module route.
            const isOpen = openKeys[sec.key] ?? false;

            return (
              <div key={sec.key}>
                {!collapsed && idx > 0 && <div style={{ height: 1, background: '#F3F4F6', margin: '8px 0' }} />}
                {!collapsed && (
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
                      ...(isActiveHeader ? moduleHeaderActiveStyle : {}),
                      userSelect: 'none',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                      {sec.key === 'sales' ? <TrendingUp size={18} /> : null}
                      <span style={{ color: isActiveHeader ? '#0f1a2b' : moduleHeader.color }}>{sec.title}</span>
                    </span>
                    <ChevronRight
                      size={18}
                      style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s ease' }}
                    />
                  </div>
                )}

                {(collapsed || isOpen) && (
                  <div style={collapsed ? { display: 'flex', flexDirection: 'column', gap: 4 } : moduleItemsWrapper}>
                    {sec.items.map((it) => {
                      const Icon = it.icon;
                      const isDashboard = it.to === '/employee';
                      const exactQuery = typeof it.to === 'string' && it.to.includes('?');
                      return (
                        <NavLink
                          key={it.to}
                          to={it.to}
                          // Ensure items like "/employee/projects" do not stay active on nested routes
                          // (e.g. "/employee/projects/retailer").
                          end={it.end ?? (exactQuery || isDashboard)}
                          style={({ isActive }) => {
                            const active = exactQuery
                              ? navItemMatchesLocation(it, pathname, location.search)
                              : isActive;
                            return {
                              ...linkBase,
                              ...(active ? activeStyle : {}),
                            };
                          }}
                        >
                          <Icon size={20} />
                          <span style={{ display: collapsed ? 'none' : 'inline', fontSize: 13 }}>{it.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
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
          <span style={{ display: collapsed ? 'none' : 'inline' }}>
            {collapsed ? 'Expand' : 'Collapse'}
          </span>
        </button>
      </div>
    </aside>
  );
}
