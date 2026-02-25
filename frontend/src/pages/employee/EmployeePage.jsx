// src/pages/employee/EmployeePage.jsx
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import EmployeeSidebar from '../../components/employee/EmployeeSidebar.jsx';
import EmployeeHeader from '../../components/employee/EmployeeHeader.jsx';

export default function EmployeePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F9FAFB' }}>
      <EmployeeSidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <EmployeeHeader user={user} onLogout={handleLogout} />

        <main style={{ flex: 1, padding: 16 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}