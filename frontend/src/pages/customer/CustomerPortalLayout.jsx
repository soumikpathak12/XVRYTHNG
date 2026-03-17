/**
 * Customer portal layout: sidebar (Referrals, My Project) + main content.
 * Collapse/expand matches main CRM (fixed sidebar, marginLeft on main, chevrons).
 */
import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Zap, Briefcase, User, LogOut, ChevronLeft, ChevronRight, Menu, X, MessageCircle } from 'lucide-react';
import '../../styles/CustomerPortal.css';

const SIDEBAR_WIDTH = 280;
const SIDEBAR_WIDTH_COLLAPSED = 80;

export default function CustomerPortalLayout() {
  const { customerUser, customerLogout } = useAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = () => {
    customerLogout();
    navigate('/portal/login');
  };

  if (!customerUser) return null;

  const firstName = customerUser.name?.split(/\s+/)[0] || 'Customer';

  const handleNavClick = () => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="customer-portal">
      {/* Mobile menu overlay */}
      {isMobile && mobileMenuOpen && (
        <div 
          className="customer-portal-mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      <aside
        className={`customer-portal-sidebar ${sidebarCollapsed && !isMobile ? 'collapsed' : ''} ${isMobile && mobileMenuOpen ? 'mobile-open' : ''}`}
        style={{
          width: isMobile ? SIDEBAR_WIDTH : (sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH),
          transition: isMobile ? 'transform 0.3s ease' : 'width .2s ease',
        }}
      >
        <button
          type="button"
          className="customer-portal-collapse-top"
          onClick={() => {
            if (isMobile) {
              setMobileMenuOpen(false);
            } else {
              setSidebarCollapsed((c) => !c);
            }
          }}
          aria-label={isMobile ? 'Close menu' : (sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar')}
          title={isMobile ? 'Close' : (sidebarCollapsed ? 'Expand' : 'Collapse')}
        >
          {isMobile ? <X size={20} /> : (sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />)}
        </button>
        <div className="customer-portal-sidebar-nav">
          <NavLink 
            to="/portal" 
            end 
            className={({ isActive }) => 'customer-portal-nav-item' + (isActive ? ' active' : '')}
            onClick={handleNavClick}
          >
            <Briefcase className="customer-portal-nav-icon" size={20} />
            {(!sidebarCollapsed || isMobile) && <span>My Project</span>}
          </NavLink>
          <NavLink 
            to="/portal/referrals" 
            className={({ isActive }) => 'customer-portal-nav-item' + (isActive ? ' active' : '')}
            onClick={handleNavClick}
          >
            <Zap className="customer-portal-nav-icon" size={20} />
            {(!sidebarCollapsed || isMobile) && <span>Referrals</span>}
          </NavLink>
          <NavLink 
            to="/portal/support" 
            className={({ isActive }) => 'customer-portal-nav-item' + (isActive ? ' active' : '')}
            onClick={handleNavClick}
          >
            <MessageCircle className="customer-portal-nav-icon" size={20} />
            {(!sidebarCollapsed || isMobile) && <span>Support</span>}
          </NavLink>
        </div>
      </aside>
      <main
        className="customer-portal-main"
        style={{
          marginLeft: isMobile ? 0 : (sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH),
          transition: 'margin-left .2s ease',
        }}
      >
        <header className="customer-portal-header">
          {isMobile && (
            <button
              type="button"
              className="customer-portal-mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
          )}
          <div className="customer-portal-header-right">
            <div className="customer-portal-header-user">
              <User className="customer-portal-header-user-icon" size={18} />
              {!isMobile && <span className="customer-portal-header-user-name">{firstName}</span>}
            </div>
            <button type="button" className="customer-portal-header-logout" onClick={handleLogout}>
              <LogOut size={18} />
              {!isMobile && <span>Log out</span>}
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
