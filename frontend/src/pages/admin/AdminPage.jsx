// pages/admin/AdminPage.jsx
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

import SuperAdminSidebar from '../../components/admin/SuperAdminSidebar.jsx';
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6' }}>
      <SuperAdminSidebar onLogout={handleLogout} user={user} />

      {/* Content area */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          padding: '24px',
        }}
      >
        {/* Header trong content (optional) */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: 16,
            padding: '16px 20px',
            marginBottom: 16,
          }}
        >
          <h1 style={{ margin: 0, color: '#146b6b' }}>Admin</h1>
          <p style={{ margin: '6px 0 0 0', color: '#374151' }}>
            Welcome{user?.name ? `, ${user.name}` : ''}! This is the Super Admin areaa (Phase 2+).
          </p>
        </div>

        {/* Nested routes will render here */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: 16,
            padding: 20,
          }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}