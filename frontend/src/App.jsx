/**
 * App root: Router + AuthProvider. Role-based redirect after login.
 */
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import LoginForm from './components/auth/LoginForm.jsx';
import ForgotPassword from './components/auth/ForgotPassword.jsx'; 
import ResetPassword from './components/auth/ResetPassword.jsx';
import { requestPasswordReset as requestResetApi } from './services/api.js';

import AdminPage from './pages/admin/AdminPage.jsx'; 

import SettingsPage from './pages/admin/SettingsPage.jsx';
// ...



const AdminOverview = () => <PlaceholderPage title="Dashboard" message="Overview metrics & quick actions." />;
const AdminLeads = () => <PlaceholderPage title="Lead Pipeline" message="Manage and track leads." />;
const AdminProjects = () => <PlaceholderPage title="Projects" message="In-house & retailer projects." />;
const AdminOnField = () => <PlaceholderPage title="On-Field" message="Field schedules & activities." />;
const AdminOperations = () => <PlaceholderPage title="Operations" message="Approvals, payroll, billing." />;
const AdminAttendance = () => <PlaceholderPage title="Attendance" message="Time & attendance overview." />;
const AdminReferrals = () => <PlaceholderPage title="Referrals" message="Referral tracking & payouts." />;
const AdminMessages = () => <PlaceholderPage title="Messages" message="Team & customer communications." />;
const AdminSettings = () => <PlaceholderPage title="Settings" message="Organization & system settings." />;


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
  const { login, loading, error, sessionExpiredMessage, clearSessionExpiredMessage, isAuthenticated } = useAuth();

  const handleSubmit = async (credentials) => {
    clearSessionExpiredMessage?.();
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
      sessionExpiredMessage={sessionExpiredMessage ?? undefined}
      onDismissSessionMessage={clearSessionExpiredMessage}
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
        >
        
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<AdminOverview />} />
          <Route path="leads" element={<AdminLeads />} />
          <Route path="projects" element={<AdminProjects />} />
          <Route path="on-field" element={<AdminOnField />} />
          <Route path="operations" element={<AdminOperations />} />
          <Route path="attendance" element={<AdminAttendance />} />
          <Route path="referrals" element={<AdminReferrals />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="settings" element={<SettingsPage />} />

        </Route>

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