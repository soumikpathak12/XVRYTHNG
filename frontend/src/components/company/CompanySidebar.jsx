import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, UsersRound, Boxes, HardHat, Factory,
  Clock3, Share2, MessageSquare, MessageCircle, Settings, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { getCompanySidebar } from '../../services/api.js';

const MODULE_NAV = {
  leads:      { to: '/dashboard/leads',      label: 'Lead Pipeline', icon: UsersRound },
  projects:   { to: '/dashboard/projects',   label: 'Projects',      icon: Boxes },
  on_field:   { to: '/dashboard/on-field',   label: 'On-Field',      icon: HardHat },
  operations: { to: '/dashboard/operations', label: 'Operations',    icon: Factory },
  attendance: { to: '/dashboard/attendance', label: 'Attendance',    icon: Clock3 },
  referrals:  { to: '/dashboard/referrals',  label: 'Referrals',     icon: Share2 },
  messages:   { to: '/dashboard/messages',   label: 'Messages',      icon: MessageSquare },
  support:    { to: '/dashboard/support-tickets', label: 'Support Tickets', icon: MessageCircle },
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
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [modules, setModules] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        //const res = await fetch(`${apiBase}/me/sidebar`);
        //if (!res.ok) { setRole(null); setModules([]); return; }
        //const data = await res.json();
        const data = await getCompanySidebar();
        if (!alive) return;
        setRole(data?.role ?? null);
        setModules(Array.isArray(data?.modules) ? data.modules : []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [apiBase]);

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
  const navStyle = { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, flex: 1 };
  const linkBase = {
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
    borderRadius: 14, fontWeight: 600, color: '#556070', textDecoration: 'none',
  };
  const activeStyle = { background: '#146b6b', color: '#fff', boxShadow: '0 4px 14px rgba(20,107,107,.25)' };
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
            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({ ...linkBase, ...(isActive ? activeStyle : {}) })}
              >
                <Icon size={20} />
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