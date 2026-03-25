import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, UsersRound, Boxes, HardHat, Factory,
  Clock3, MessageSquare, MessageCircle, Settings, ChevronLeft, ChevronRight, Wrench
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { getCompanySidebar, getApprovalsPendingCount } from '../../services/api.js';
import { useSidebar } from '../../context/AuthContext.jsx';

const MODULE_NAV = {
  leads:      { to: '/dashboard/leads',      label: 'Lead Pipeline', icon: UsersRound },
  projects:   { to: '/dashboard/projects',   label: 'Projects',      icon: Boxes },
  on_field:   { to: '/dashboard/on-field',   label: 'On-Field',      icon: HardHat },
  operations: { to: '/dashboard/operations', label: 'Operations',    icon: Factory },
  attendance: { to: '/dashboard/attendance', label: 'Attendance',    icon: Clock3 },
  payroll:    { to: '/dashboard/payroll',    label: 'Payroll',       icon: Clock3 },
  // Referrals is now accessible inside Settings → Referral Program tab
  messages:   { to: '/dashboard/messages',   label: 'Messages',      icon: MessageSquare },
  support:       { to: '/dashboard/support-tickets',    label: 'Support Tickets',  icon: MessageCircle },
  installation:  { to: '/dashboard/installation',       label: 'Installation Day', icon: Wrench },
};

function getRoleFixedItems(role) {
  const items = [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }];
  const r = (role || '').toLowerCase();
  if (r === 'company_admin' || r === 'manager') {
    items.push({ to: '/dashboard/settings', label: 'Settings', icon: Settings });
  }
  return items;
}

export default function CompanySidebar({ apiBase = '/api', logoSrc }) {
  const { sidebarVersion } = useSidebar();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [modules, setModules] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getCompanySidebar();
        if (!alive) return;
        setRole(data?.role ?? null);
        setModules(Array.isArray(data?.modules) ? data.modules : []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [apiBase, sidebarVersion]);

  // Poll pending approvals count for badge
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

  const fixedItems = getRoleFixedItems(role);
  const moduleItems = (modules || []).map(k => MODULE_NAV[k]).filter(Boolean);
  const navItems = [...fixedItems, ...moduleItems];

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
  const brandRow = { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 8px 16px 8px' };
  const brandText = { display: collapsed ? 'none' : 'block' };
  const navStyle = { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, flex: 1, minHeight: 0, overflowY: 'auto' };
  const linkBase = {
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
    borderRadius: 14, fontWeight: 600, color: '#556070', textDecoration: 'none',
  };
  // Light, brand-consistent active state (matches module header styling).
  const activeStyle = {
    background: 'rgba(20,107,107,0.10)',
    color: '#0f1a2b',
    boxShadow: 'inset 4px 0 0 #146b6b',
  };
  const textHide = { display: collapsed ? 'none' : 'inline' };

  return (
    <aside style={rootStyle} aria-label="Company Sidebar">
      <div style={brandRow}>
        <div style={{
          width: 44, height: 44, borderRadius: 16, overflow: 'hidden',
          border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: '#fff'
        }}>
          {logoSrc ? <img src={logoSrc} alt="Logo" style={{ width: 44, height: 44, objectFit: 'cover' }} />
                   : <span style={{ fontWeight: 800, color: '#146b6b' }}>⚡</span>}
        </div>
        <div style={brandText}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: '#6B7280' }}>XVRYTHNG</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0f1a2b' }}>COMPANY</div>
        </div>
      </div>

      <nav style={navStyle}>
        {loading ? (
          <div style={{ color: '#6B7280', fontSize: 13, padding: '4px 10px' }}>Đang tải menu…</div>
        ) : navItems.length === 0 ? (
          <div style={{ color: '#6B7280', fontSize: 13, padding: '4px 10px' }}>Không có phần nào cho quyền hiện tại.</div>
        ) : (
          navItems.map(item => {
            const Icon = item.icon;
            const showBadge = item.to === '/dashboard/attendance' && pendingCount > 0;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({ ...linkBase, ...(isActive ? activeStyle : {}) })}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Icon size={20} />
                  {showBadge && (
                    <span style={{
                      position: 'absolute', top: -6, right: -7,
                      background: '#EF4444', color: '#fff',
                      borderRadius: 999, minWidth: 16, height: 16, fontSize: 10,
                      fontWeight: 800, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', padding: '0 3px', lineHeight: 1,
                      border: '1.5px solid #fff',
                    }}>
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </div>
                <span style={textHide}>{item.label}</span>
              </NavLink>
            );
          })
        )}
      </nav>

      <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            width: '100%', background: 'transparent', border: 'none',
            cursor: 'pointer', color: '#4B5563', display: 'flex',
            alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 12,
          }}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          <span style={textHide}>{collapsed ? 'Expand' : 'Collapse'}</span>
        </button>
      </div>
    </aside>
  );
}