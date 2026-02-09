// src/pages/company/CompanyPage.jsx
import { Outlet } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import CompanySidebar from '../../components/company/CompanySidebar.jsx';

export default function CompanyPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F7F8FA' }}>
      <CompanySidebar apiBase="/api" />
      <main style={{ flex: 1, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: '#146b6b',
              color: '#fff',
              padding: '10px 16px',
              border: 'none',
              borderRadius: 10,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(20,107,107,.25)',
            }}
          >
            Logout
          </button>
        </div>

        <Outlet />
      </main>
    </div>
  );
}