// pages/admin/AdminPage.jsx
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

import SuperAdminSidebar from '../../components/admin/SuperAdminSidebar.jsx';
import AdminHeader from '../../components/admin/AdminHeader.jsx';

export default function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Chỉ super_admin mới vào được layout này
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6', overflow: 'hidden' }}>
      <SuperAdminSidebar user={user} />

      {/* Main layout with Header + Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AdminHeader user={user} onLogout={handleLogout} />

        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
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