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
  Briefcase,
  Building2,
  Gift,
  LayoutDashboard,
  PalmtreeIcon,
  Receipt,
  Wrench,
  CheckCircle2,
  Calculator,
  CreditCard,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { getCompanySidebar } from '../../services/api.js';

const EMP_MODULE_NAV = {
  // Always show Dashboard
  dashboard: { to: '/employee', label: 'Dashboard', icon: LayoutDashboard },

  // Module-driven items
  leads_pipeline: { to: '/employee/leads', label: 'Leads Pipeline', icon: UsersRound },
  site_inspection: { to: '/employee/site-inspection', label: 'Site Inspection', icon: UsersRound },
  on_field:     { to: '/employee/on-field',       label: 'On-Field',         icon: HardHat },
  installation: { to: '/employee/installation',   label: 'Installation Day', icon: Wrench },
  messages:   { to: '/employee/messages',   label: 'Messages',       icon: MessageSquare },
  settings:   { to: '/employee/settings',   label: 'Settings',       icon: Settings },
  attendance: { to: '/employee/attendance', label: 'Attendance',     icon: ClipboardList },
  leave:      { to: '/employee/leave',      label: 'Leave',          icon: PalmtreeIcon },
  expenses:   { to: '/employee/expenses',   label: 'Expenses',       icon: Receipt },
  referrals:  { to: '/employee/referrals',  label: 'Referrals',      icon: Gift },
  support:    { to: '/employee/support-tickets', label: 'Support Tickets', icon: MessageCircle },

  // Approvals and Payroll
  approvals:  { to: '/employee/approvals', label: 'Approvals', icon: CheckCircle2 },
  payroll:    { to: '/employee/payroll', label: 'Payroll', icon: Calculator },
};

export default function EmployeeSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getCompanySidebar(); // GET /api/me/sidebar
        console.log('[EmployeeSidebar] sidebar data:', data);
        console.log('[EmployeeSidebar] modules:', data?.modules);
        if (!alive) return;
        const mods = Array.isArray(data?.modules) ? data.modules : [];
        console.log('[EmployeeSidebar] setting modules:', mods);
        setModules(mods);
      } catch (err) {
        console.error('[EmployeeSidebar] Error loading sidebar:', err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const allowed = new Set(modules ?? []);

  // Track expanded/collapsed state for parent items like Projects
  const [openKeys, setOpenKeys] = useState(() => {
    const isProjectsPath = location.pathname.startsWith('/employee/projects');
    return { projects: isProjectsPath };
  });

  const toggleOpen = useCallback((key) => {
    setOpenKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Grouped nav structure
  const sections = [
    {
      key: 'sales',
      title: 'Sales Module',
      items: [
        EMP_MODULE_NAV.dashboard,
        ...(allowed.has('leads') ? [EMP_MODULE_NAV.leads_pipeline] : []),
        ...(allowed.has('projects') ? [
          {
            key: 'projects',
            label: 'Projects',
            icon: Building2,
            children: [
              { to: '/employee/projects/dashboard', label: 'Dashboard' },
              { to: '/employee/projects', label: 'In-house', end: true },
              { to: '/employee/projects/retailer', label: 'Retailer' },
            ],
          },
        ] : []),
      ],
    },
    {
      key: 'on_field',
      title: 'On-Field Module',
      items: [
        ...(allowed.has('attendance') ? [EMP_MODULE_NAV.attendance] : []),
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
      title: 'Approvals & Payroll',
      items: [
        EMP_MODULE_NAV.approvals,
        EMP_MODULE_NAV.payroll,
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

  const pathname = location.pathname || '';
  const isSalesPath = 
    pathname === '/employee' || 
    pathname.startsWith('/employee/leads') ||
    pathname.startsWith('/employee/projects');
  const isOnFieldPath =
    pathname.startsWith('/employee/attendance') ||
    pathname.startsWith('/employee/on-field') ||
    pathname.startsWith('/employee/site-inspection') ||
    pathname.startsWith('/employee/installation');
  const isCommunicationsPath =
    pathname.startsWith('/employee/messages') ||
    pathname.startsWith('/employee/referrals') ||
    pathname.startsWith('/employee/support-tickets');
  const isOperationsPath = pathname.startsWith('/employee/operations');
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
          sections.flatMap((sec, idx) => {
            const nodes = [];
            if (!collapsed) {
              if (idx > 0) nodes.push(<div key={`sep-${sec.key}`} style={{ height: 1, background: '#F3F4F6', margin: '8px 0' }} />);
              const isActiveHeader =
                (sec.key === 'sales' && isSalesPath) ||
                (sec.key === 'on_field' && isOnFieldPath) ||
                (sec.key === 'communications' && isCommunicationsPath) ||
                (sec.key === 'operations' && isOperationsPath) ||
                (sec.key === 'settings' && isSettingsPath);

              nodes.push(
                <div
                  key={`hdr-${sec.key}`}
                  style={{
                    ...moduleHeader,
                    ...(isActiveHeader ? moduleHeaderActiveStyle : {}),
                  }}
                >
                  {sec.title}
                </div>
              );
            }
            sec.items.forEach((it) => {
              // Check if this is a parent item with children (like Projects)
              if (it.children && it.children.length > 0) {
                const Icon = it.icon;
                const anyChildActive = it.children.some((c) => location.pathname.startsWith(c.to));
                const isOpen = openKeys[it.key] ?? anyChildActive;

                // When collapsed, show only the icon
                if (collapsed) {
                  nodes.push(
                    <div
                      key={it.key}
                      onClick={() => toggleOpen(it.key)}
                      style={{
                        ...linkBase,
                        justifyContent: 'center',
                        padding: 10,
                        cursor: 'pointer',
                        ...(anyChildActive ? { background: 'rgba(20,107,107,0.10)', color: '#0f1a2b', boxShadow: 'inset 4px 0 0 #146b6b', borderRadius: 12 } : {}),
                      }}
                      aria-expanded={!!isOpen}
                    >
                      <Icon size={20} />
                    </div>
                  );
                } else {
                  // When expanded, show the parent with expand/collapse arrow
                  nodes.push(
                    <div key={it.key}>
                      <div
                        onClick={() => toggleOpen(it.key)}
                        style={{
                          ...linkBase,
                          cursor: 'pointer',
                          justifyContent: 'space-between',
                          ...(anyChildActive ? activeStyle : {}),
                        }}
                        aria-expanded={!!isOpen}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                          <Icon size={20} />
                          <span>{it.label}</span>
                        </span>
                        <ChevronRight
                          size={18}
                          style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s ease' }}
                        />
                      </div>

                      {isOpen && (
                        <div
                          role="group"
                          aria-label={`${it.label} submenu`}
                          style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}
                        >
                          {it.children.map((child) => {
                            const isChildActive = child.end
                              ? location.pathname === child.to
                              : location.pathname.startsWith(child.to);

                            return (
                              <NavLink
                                key={child.to}
                                to={child.to}
                                end={child.end}
                                style={{
                                  ...linkBase,
                                  padding: '8px 12px',
                                  borderRadius: 12,
                                  marginLeft: 14,
                                  fontWeight: 600,
                                  fontSize: 11,
                                  ...(isChildActive ? { background: 'rgba(20,107,107,0.10)', color: '#0f1a2b', boxShadow: 'inset 3px 0 0 #146b6b' } : {}),
                                }}
                              >
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
              } else {
                // Regular single link item
                const Icon = it.icon;
                const isDashboard = it.to === '/employee';
                nodes.push(
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={isDashboard}
                    style={({ isActive }) => ({
                      ...linkBase,
                      ...(isActive ? activeStyle : {}),
                    })}
                  >
                    <Icon size={20} />
                    <span style={{ display: collapsed ? 'none' : 'inline', fontSize: 13 }}>{it.label}</span>
                  </NavLink>
                );
              }
            });
            return nodes;
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
