/**
 * App root: Router + AuthProvider. Role-based redirect after login.
 */
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import LoginForm from './components/auth/LoginForm.jsx';
import ForgotPassword from './components/auth/ForgotPassword.jsx'; 
import ResetPassword from './components/auth/ResetPassword.jsx';
import { requestPasswordReset as requestResetApi } from './services/api.js';

function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();              // clear token, user, etc.
      navigate('/login', { replace: true });
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  return (
    <div style={{
      padding: '2rem',
      color: '#1A1A2E',
      maxWidth: 960,
      margin: '0 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem'
    }}>
      <div>
        <h1 style={{ color: '#1A7B7B', margin: 0 }}>Admin</h1>
        <p style={{ marginTop: '.25rem' }}>
          Welcome{user?.name ? `, ${user.name}` : ''}! This is the Super Admin area (Phase 2+).
        </p>
      </div>

      <button
        onClick={handleLogout}
        style={{
          padding: '0.7rem 1rem',
          border: 'none',
          borderRadius: 12,
          fontWeight: 700,
          color: '#fff',
          background: '#1A7B7B',
          boxShadow: '0 2px 8px rgba(26,123,123,.25)',
          cursor: 'pointer'
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = '#4DB8A8')}
        onMouseOut={(e) => (e.currentTarget.style.background = '#1A7B7B')}
        aria-label="Logout"
      >
        Logout
      </button>
    </div>
  );
}


// Placeholder pages for role redirects (Phase 1 – auth only)
function PlaceholderPage({ title, message }) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#1A1A2E' }}>
      <h1 style={{ color: '#1A7B7B' }}>{title}</h1>
      <p>{message}</p>
    </div>
  );
}

function LoginPage() {
  const { login, loading, error, isAuthenticated } = useAuth();

  const handleSubmit = async (credentials) => {
    try {
      await login(credentials);
      // Redirect is handled by RequireAuth / role route
    } catch {
      // Error already set in context
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <LoginForm
      onSubmit={handleSubmit}
      loading={loading}
      error={error ?? undefined}
    />
  );
}

/**
 * Redirects to role-specific default route.
 * Super Admin → /admin; Company Admin → /dashboard; Field Agent → /mobile; Manager → /dashboard.
 */
function getDefaultRoute(role) {
  const r = (role || '').toLowerCase();
  if (r === 'super_admin') return '/admin';
  if (r === 'company_admin' || r === 'manager') return '/dashboard';
  if (r === 'field_agent') return '/mobile';
  return '/dashboard';
}

/** Redirects unauthenticated users to login; redirects "/" to role default. */
function RequireAuth({ children }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const defaultRoute = getDefaultRoute(user?.role);
  return <Navigate to={defaultRoute} replace />;
}

/** Protects role routes: must be logged in. */
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  // Optional: centralize handlers here and pass to pages/components
  const { login, loading, error } = useAuth();

  const handleLogin = async (credentials) => {
    await login(credentials);
  };

  const requestPasswordReset = async ({ email }) => {
    await new Promise((r) => setTimeout(r, 600));
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC routes */}
        <Route path="/login" element={<LoginPage />} />
        
        <Route
          path="/forgot-password" element={<ForgotPassword onRequestReset={requestResetApi} />}
        />

        <Route path="/reset-password" element={<ResetPassword />} />
        {/* AUTH redirect entry point */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <div />
            </RequireAuth>
          }
        />

        {/* PROTECTED routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
                <AdminPage />            
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <PlaceholderPage title="Dashboard" message="Company Admin / Manager (Phase 2+)." />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mobile"
          element={
            <ProtectedRoute>
              <PlaceholderPage title="Field" message="Field Agent area (Phase 2+)." />
            </ProtectedRoute>
          }
        />

        {/* CATCH-ALL: send unknown routes to login (public) */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;