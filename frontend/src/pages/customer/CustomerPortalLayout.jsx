/**
 * Customer portal layout: sidebar (Referrals, My Project) + main content.
 * Collapse/expand matches main CRM (fixed sidebar, marginLeft on main, chevrons).
 */
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Zap, Briefcase, User, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import '../../styles/CustomerPortal.css';

const SIDEBAR_WIDTH = 280;
const SIDEBAR_WIDTH_COLLAPSED = 80;

export default function CustomerPortalLayout() {
  const { customerUser, customerLogout } = useAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    customerLogout();
    navigate('/portal/login');
  };

  if (!customerUser) return null;

  const firstName = customerUser.name?.split(/\s+/)[0] || 'Customer';

  return (
    <div className="customer-portal">
      <aside
        className={`customer-portal-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}
        style={{
          width: sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH,
          transition: 'width .2s ease',
        }}
      >
        <button
          type="button"
          className="customer-portal-collapse-top"
          onClick={() => setSidebarCollapsed((c) => !c)}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand' : 'Collapse'}
        >
          {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
        <div className="customer-portal-sidebar-nav">
          <NavLink to="/portal/referrals" className={({ isActive }) => 'customer-portal-nav-item' + (isActive ? ' active' : '')}>
            <Zap className="customer-portal-nav-icon" size={20} />
            {!sidebarCollapsed && <span>Referrals</span>}
          </NavLink>
          <NavLink to="/portal" end className={({ isActive }) => 'customer-portal-nav-item' + (isActive ? ' active' : '')}>
            <Briefcase className="customer-portal-nav-icon" size={20} />
            {!sidebarCollapsed && <span>My Project</span>}
          </NavLink>
        </div>
      </aside>
      <main
        className="customer-portal-main"
        style={{
          marginLeft: sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH,
          transition: 'margin-left .2s ease',
        }}
      >
        <header className="customer-portal-header">
          <div className="customer-portal-header-right">
            <div className="customer-portal-header-user">
              <User className="customer-portal-header-user-icon" size={18} />
              <span className="customer-portal-header-user-name">{firstName}</span>
            </div>
            <button type="button" className="customer-portal-header-logout" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Log out</span>
            </button>
          </div>
        </header>
        <div className="customer-portal-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
