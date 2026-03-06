// pages/admin/AdminPage.jsx
import { useState } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

import SuperAdminSidebar from '../../components/admin/SuperAdminSidebar.jsx';
import AdminHeader from '../../components/admin/AdminHeader.jsx';

const SIDEBAR_WIDTH = 280;
const SIDEBAR_WIDTH_COLLAPSED = 80;

export default function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Guard: only super_admin can access this admin area
  if (user?.role?.toLowerCase() !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  const handleOpenConversation = (id, options = {}) => {
    const { scope = 'all', companyId = null } = options;

    navigate('/admin/messages', {
      state: {
        openConversationId: String(id), // keep as string for consistent comparisons
        desiredScope: scope,            // 'company' | 'all'
        desiredCompanyId: companyId,    // number | null
      },
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#F3F4F6',
        overflow: 'hidden',
      }}
    >
      <SuperAdminSidebar
        user={user}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          marginLeft: sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH,
          transition: 'margin-left .2s ease',
        }}
      >
        <AdminHeader user={user} onLogout={handleLogout} onOpenConversation={handleOpenConversation} />

        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: 16,
              padding: 20,
              minHeight: '100%',
            }}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}