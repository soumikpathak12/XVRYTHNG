/**
 * App root: Router + AuthProvider. Role-based redirect after login.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import LoginForm from './components/auth/LoginForm.jsx';
import ForgotPassword from './components/auth/ForgotPassword.jsx';
import ResetPassword from './components/auth/ResetPassword.jsx';
import { requestPasswordReset as requestResetApi } from './services/api.js';

import AdminPage from './pages/admin/AdminPage.jsx';
import SettingsPage from './pages/admin/SettingsPage.jsx';
import CompaniesPage from './pages/admin/CompaniesPage.jsx';
import CompanyOnboardingWizard from './pages/admin/CompanyOnboardingWizard.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import AccessDeniedPage from './pages/AccessDeniedPage.jsx';
import RequirePermission from './components/RequirePermission.jsx';
import RolesPage from './pages/admin/RolesPage.jsx';
import CompanySettingsPage from './pages/company/CompanySettingPage.jsx';
import CompanyPage from './pages/company/CompanyPage.jsx';
import LeadsPage from './pages/LeadsPAge.jsx';
import LeadDetailPage from './pages/LeadDetailPage.jsx';
import LeadsCalendarPage from './pages/admin/LeadsCalendarPage.jsx';
import MessagesPage from './pages/MessagesPage.jsx';
import SiteInspectionPage from './pages/admin/SiteInspectionPage.jsx';
function PlaceholderPage({ title, message, children }) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#1A1A2E' }}>
      <h1 style={{ color: '#1A7B7B' }}>{title}</h1>
      <p>{message}</p>
      {children}
    </div>
  );
}

const AdminOverview = () => <PlaceholderPage title="Dashboard" message="Overview metrics & quick actions." />;
const AdminLeads = () => <PlaceholderPage title="Lead Pipeline" message="Manage and track leads." />;
const AdminProjects = () => <PlaceholderPage title="Projects" message="In-house & retailer projects." />;
const AdminOnField = () => <PlaceholderPage title="On-Field" message="Field schedules & activities." />;
const AdminOperations = () => <PlaceholderPage title="Operations" message="Approvals, payroll, billing." />;
const AdminAttendance = () => <PlaceholderPage title="Attendance" message="Time & attendance overview." />;
const AdminReferrals = () => <PlaceholderPage title="Referrals" message="Referral tracking & payouts." />;
const AdminSettings = () => <PlaceholderPage title="Settings" message="Organization & system settings." />;

// ---------- Login Page ----------
function LoginPage() {
  const {
    login,
    loading,
    error,
    sessionExpiredMessage,
    clearSessionExpiredMessage,
    isAuthenticated,
  } = useAuth();

  const handleSubmit = async (credentials) => {
    clearSessionExpiredMessage?.();
    try {
      await login(credentials);
    } catch {
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

/** Redirects unauthenticated users to login; "/" → role default. */
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
  const requestPasswordReset = async ({ email }) => {
    await new Promise((r) => setTimeout(r, 600));
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPassword onRequestReset={requestResetApi} />} />
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

        {/* PROTECTED: Super Admin area (layout AdminPage + nested) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<RequirePermission resource="overview" action="view"><AdminOverview /></RequirePermission>} />
          <Route path="leads" element={<RequirePermission resource="leads" action="view"><LeadsPage /></RequirePermission>} />
          <Route path="leads/:id" element={<RequirePermission resource="leads" action="view"><LeadDetailPage /></RequirePermission>} />
         
  <Route
    path="leads/:id/site-inspection"
    element={
      <RequirePermission resource="leads" action="view">
        <SiteInspectionPage />
      </RequirePermission>
    }
  />

          <Route path="leads/calendar" element={<RequirePermission resource="leads" action="view"><LeadsCalendarPage /></RequirePermission>} />
          <Route path="projects" element={<RequirePermission resource="projects" action="view"><AdminProjects /></RequirePermission>} />
          <Route path="on-field" element={<RequirePermission resource="on_field" action="view"><AdminOnField /></RequirePermission>} />
          <Route path="operations" element={<RequirePermission resource="operations" action="view"><AdminOperations /></RequirePermission>} />
          <Route path="attendance" element={<RequirePermission resource="attendance" action="view"><AdminAttendance /></RequirePermission>} />
          <Route path="referrals" element={<RequirePermission resource="referrals" action="view"><AdminReferrals /></RequirePermission>} />
          <Route path="messages" element={<RequirePermission resource="messages" action="view"><MessagesPage /></RequirePermission>} />
          <Route path="settings" element={<RequirePermission resource="settings" action="view"><SettingsPage /></RequirePermission>} />
          <Route path="profile" element={<RequirePermission resource="profile" action="view"><ProfilePage /></RequirePermission>} />
          <Route path="companies" element={<RequirePermission resource="companies" action="view"><CompaniesPage /></RequirePermission>} />
          <Route path="companies/new" element={<RequirePermission resource="companies" action="create"><CompanyOnboardingWizard /></RequirePermission>} />
          <Route path="companies/:id/edit" element={<RequirePermission resource="companies" action="update"><CompanyOnboardingWizard /></RequirePermission>} />
          <Route path="roles" element={<Navigate to="/admin/settings" replace />} />
        </Route>

        {/* PROTECTED: Company area (layout CompanyPage + nested) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <CompanyPage />
            </ProtectedRoute>
          }
        >
          <Route index element={<PlaceholderPage title="Dashboard" message="Company Admin / Manager (Phase 2+)." />} />

          <Route path="projects" element={<PlaceholderPage title="Projects" message="In-house & retailer projects." />} />
          <Route path="leads" element={<PlaceholderPage title="Lead Pipeline" message="Manage and track leads." />} />
          <Route path="on-field" element={<PlaceholderPage title="On-Field" message="Field schedules & activities." />} />
          <Route path="operations" element={<PlaceholderPage title="Operations" message="Approvals, payroll, billing." />} />
          <Route path="attendance" element={<PlaceholderPage title="Attendance" message="Time & attendance overview." />} />
          <Route path="referrals" element={<PlaceholderPage title="Referrals" message="Referral tracking & payouts." />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="settings" element={<CompanySettingsPage />} />
        </Route>


        <Route path="/access-denied" element={<ProtectedRoute><AccessDeniedPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
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