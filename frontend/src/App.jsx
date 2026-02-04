/**
 * App root: Router + AuthProvider. Role-based redirect after login.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import LoginForm from './components/auth/LoginForm.jsx';

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
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <div />
            </RequireAuth>
          }
        />
        <Route path="/admin" element={<ProtectedRoute><PlaceholderPage title="Admin" message="Super Admin area (Phase 2+)." /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><PlaceholderPage title="Dashboard" message="Company Admin / Manager (Phase 2+)." /></ProtectedRoute>} />
        <Route path="/mobile" element={<ProtectedRoute><PlaceholderPage title="Field" message="Field Agent area (Phase 2+)." /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
