/**
 * Customer portal layout: sidebar (Referrals, My Project) + main content.
 * Only shown when customer is authenticated.
 */
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Zap, Briefcase, User, LogOut } from 'lucide-react';
import '../../styles/CustomerPortal.css';

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
      <aside className={`customer-portal-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
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
        <div className="customer-portal-sidebar-footer">
          <div className="customer-portal-user">
            <User className="customer-portal-user-icon" size={20} />
            {!sidebarCollapsed && <span>{firstName}</span>}
          </div>
          <button type="button" className="customer-portal-collapse" onClick={() => setSidebarCollapsed((c) => !c)}>
            {sidebarCollapsed ? 'Expand' : 'Collapse'}
          </button>
          <button type="button" className="customer-portal-logout" onClick={handleLogout}>
            <LogOut size={18} />
            {!sidebarCollapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>
      <main className="customer-portal-main">
        <Outlet />
      </main>
    </div>
  );
}
