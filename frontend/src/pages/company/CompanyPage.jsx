// src/pages/company/CompanyPage.jsx
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import CompanySidebar from '../../components/company/CompanySidebar.jsx';
import CompanyHeader from '../../components/company/CompanyHeader.jsx';

export default function CompanyPage() {
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F7F8FA' }}>
      {/* Left: Sidebar */}
      <CompanySidebar apiBase="/api" prefix="/dashboard" />

      {/* Right: Header + Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <CompanyHeader user={user} onLogout={handleLogout} />
        <main style={{ flex: 1, padding: '16px 20px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}