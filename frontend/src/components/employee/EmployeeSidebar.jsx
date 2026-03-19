// src/pages/employee/EmployeeSidebar.jsx
import { NavLink } from 'react-router-dom';
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
import { useEffect, useState } from 'react';
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
  operations: { to: '/employee/operations', label: 'Operations',     icon: Briefcase },
  projects:   { to: '/employee/projects',   label: 'Projects',       icon: Building2 },
  referrals:  { to: '/employee/referrals',  label: 'Referrals',      icon: Gift },
  support:    { to: '/employee/support-tickets', label: 'Support Tickets', icon: MessageCircle },

  // Employee Operations sub-items (currently routed to the same placeholder page)
  approvals:  { to: '/employee/operations?tab=approvals', label: 'Approvals', icon: CheckCircle2 },
  payroll:    { to: '/employee/operations?tab=payroll', label: 'Payroll', icon: Calculator },
  billings:   { to: '/employee/operations?tab=billings', label: 'Billings & Payment', icon: CreditCard },
};

export default function EmployeeSidebar() {
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
        if (!alive) return;
        const mods = Array.isArray(data?.modules) ? data.modules : [];
        setModules(mods);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const allowed = new Set(modules ?? []);

  // Grouped nav structure
  const sections = [
    {
      key: 'sales',
      title: 'Sales Module',
      items: [
        EMP_MODULE_NAV.dashboard,
        ...(allowed.has('leads') ? [EMP_MODULE_NAV.leads_pipeline] : []),
      ],
    },
    {
      key: 'on_field',
      title: 'On-Field Module',
      items: [
        ...(allowed.has('attendance') ? [EMP_MODULE_NAV.attendance] : []),
        ...(allowed.has('on_field') ? [EMP_MODULE_NAV.on_field] : []),
        ...(allowed.has('site_inspection') ? [EMP_MODULE_NAV.site_inspection] : []),
      ],
    },
    {
      key: 'operations',
      title: 'Operations Module',
      items: [
        ...(allowed.has('operations') ? [EMP_MODULE_NAV.approvals, EMP_MODULE_NAV.payroll, EMP_MODULE_NAV.billings] : []),
      ],
    },
  ].map((s) => ({
    ...s,
    items: s.items.filter(Boolean),
  })).filter((s) => s.items.length > 0);

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

  const moduleHeader = {
    padding: '10px 12px',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.06,
    color: '#6B7280',
    textTransform: 'uppercase',
  };

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
              nodes.push(<div key={`hdr-${sec.key}`} style={moduleHeader}>{sec.title}</div>);
            }
            sec.items.forEach((it) => {
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
                  <span style={{ display: collapsed ? 'none' : 'inline' }}>{it.label}</span>
                </NavLink>
              );
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
