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

import CustomerLoginPage from './pages/customer/CustomerLoginPage.jsx';
import CustomerPortalLayout from './pages/customer/CustomerPortalLayout.jsx';
import MyProjectPage from './pages/customer/MyProjectPage.jsx';
import CustomerReferralsPage from './pages/customer/ReferralsPage.jsx';
import SupportTicketsPage from './pages/customer/SupportTicketsPage.jsx';

import ReferralsPage from './pages/ReferralsPage.jsx';
import AdminTemplatesPage from './pages/admin/AdminTemplatePage.jsx';
import SiteInspectionPage from './pages/admin/SiteInspectionPage.jsx';
import CreateUser from './pages/admin/CreateUserPage.jsx';

import EmployeesPage from './pages/EmployeesPage.jsx';
import EmployeePage from './pages/employee/EmployeePage.jsx';
import EmployeeCreatePage from './pages/EmployeeCreate.jsx';
import EmployeeProfilePage from './pages/EmployeeProfilePage.jsx';

import RequirePasswordUpdate from './components/auth/RequiredPasswordUpdate.jsx';
import EmployeeChangePasswordPage from './pages/EmployeeChangePasswordPage.jsx';

import DashboardPage from './pages/admin/DashboardPage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import TrialUsersPage from './pages/admin/TrialUsersPage.jsx';
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
const AdminProjects = () => <PlaceholderPage title="Projects" message="In-house & retailer projects." />;
const AdminOnField = () => <PlaceholderPage title="On-Field" message="Field schedules & activities." />;
const AdminOperations = () => <PlaceholderPage title="Operations" message="Approvals, payroll, billing." />;
const AdminAttendance = () => <PlaceholderPage title="Attendance" message="Time & attendance overview." />;

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
    } catch {}
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
 * Super Admin → /admin; Company Admin → /dashboard; Field Agent → /employee; Manager → /dashboard.
 */
function getDefaultRoute(role) {
  const r = (role || '').toLowerCase();
  if (r === 'super_admin') return '/admin';
  if (r === 'company_admin' || r === 'manager') return '/dashboard';
  if (r === 'field_agent') return '/employee';
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

/** Protects customer portal: must be customer-authenticated. */
function RequireCustomerAuth({ children }) {
  const { isCustomerAuthenticated } = useAuth();
  if (!isCustomerAuthenticated) return <Navigate to="/portal/login" replace />;
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

        {/* PROTECTED: Super Admin area */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />

          <Route
            path="overview"
            element={
              <RequirePermission resource="overview" action="view"> 
                <DashboardPage />
              </RequirePermission>
            }
          />

          
          <Route
            path="trial-users"
            element={
              <RequirePermission resource="users" action="view">
                <TrialUsersPage />
              </RequirePermission>
            }
          />


          <Route
            path="leads"
            element={
              <RequirePermission resource="leads" action="view">
                <LeadsPage />
              </RequirePermission>
            }
          />

          <Route
            path="leads/:id"
            element={
              <RequirePermission resource="leads" action="view">
                <LeadDetailPage />
              </RequirePermission>
            }
          />

          <Route
            path="leads/:id/site-inspection"
            element={
              <RequirePermission resource="leads" action="view">
                <SiteInspectionPage />
              </RequirePermission>
            }
          />

          <Route
            path="leads/calendar"
            element={
              <RequirePermission resource="leads" action="view">
                <LeadsCalendarPage />
              </RequirePermission>
            }
          />

          <Route
            path="employees"
            element={
              <RequirePermission resource="employees" action="view">
                <EmployeesPage />
              </RequirePermission>
            }
          />
          <Route path="employees/:id" element={<EmployeeProfilePage />} />
          <Route path="employees/new" element={<EmployeeCreatePage />} />

          <Route
            path="projects"
            element={
              <RequirePermission resource="projects" action="view">
                <ProjectsPage />
              </RequirePermission>
            }
          />

          <Route
            path="on-field"
            element={
              <RequirePermission resource="on_field" action="view">
                <AdminOnField />
              </RequirePermission>
            }
          />

          <Route
            path="operations"
            element={
              <RequirePermission resource="operations" action="view">
                <AdminOperations />
              </RequirePermission>
            }
          />

          <Route
            path="attendance"
            element={
              <RequirePermission resource="attendance" action="view">
                <AdminAttendance />
              </RequirePermission>
            }
          />

          <Route
            path="referrals"
            element={
              <RequirePermission resource="referrals" action="view">
                <ReferralsPage />
              </RequirePermission>
            }
          />

          <Route
            path="messages"
            element={
              <RequirePermission resource="messages" action="view">
                <MessagesPage />
              </RequirePermission>
            }
          />

          <Route
            path="settings"
            element={
              <RequirePermission resource="settings" action="view">
                <SettingsPage />
              </RequirePermission>
            }
          />

          <Route
            path="profile"
            element={
              <RequirePermission resource="profile" action="view">
                <ProfilePage />
              </RequirePermission>
            }
          />

          <Route
            path="companies"
            element={
              <RequirePermission resource="companies" action="view">
                <CompaniesPage />
              </RequirePermission>
            }
          />

          <Route
            path="companies/new"
            element={
              <RequirePermission resource="companies" action="create">
                <CompanyOnboardingWizard />
              </RequirePermission>
            }
          />

          <Route
            path="companies/:id/edit"
            element={
              <RequirePermission resource="companies" action="update">
                <CompanyOnboardingWizard />
              </RequirePermission>
            }
          />

          <Route path="roles" element={<Navigate to="/admin/settings" replace />} />

          <Route path="settings/inspection-templates" element={<AdminTemplatesPage />} />
        </Route>

        {/* Company Admin / Manager */}
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
          <Route path="referrals" element={<ReferralsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="settings" element={<CompanySettingsPage />} />
        </Route>

        {/* Employee portal */}
        <Route
          path="/employee"
          element={
            <ProtectedRoute>
              <RequirePasswordUpdate>
                <EmployeePage />
              </RequirePasswordUpdate>
            </ProtectedRoute>
          }
        >
          <Route index element={<PlaceholderPage title="Dashboard" message="Your tasks, KPIs & quick actions." />} />

          <Route path="dashboard" element={<PlaceholderPage title="Dashboard" message="Your tasks, KPIs & quick actions." />} />

          <Route path="change-password" element={<EmployeeChangePasswordPage />} />

          {/* Leads */}
          <Route
            path="leads"
            element={
              <RequirePermission resource="leads" action="view">
                <LeadsPage />
              </RequirePermission>
            }
          />

            <Route
          path="leads/:id"
          element={
            <RequirePermission resource="leads" action="view">
              <LeadDetailPage />
            </RequirePermission>
          }
        />

          <Route
            path="leads/calendar"
            element={
              <RequirePermission resource="leads" action="view">
                <LeadsCalendarPage />
              </RequirePermission>
            }
          />
          <Route
            path="leads/:id/site-inspection"
            element={
              <RequirePermission resource="leads" action="view">
                <SiteInspectionPage />
              </RequirePermission>
            }
          />

          {/* Messages */}
          <Route
            path="messages"
            element={
              <RequirePermission resource="messages" action="view">
                <MessagesPage />
              </RequirePermission>
            }
          />

          {/* Attendance */}
          <Route
            path="attendance"
            element={
              <RequirePermission resource="attendance" action="view">
                <PlaceholderPage title="Attendance" message="Time & attendance (Employee)" />
              </RequirePermission>
            }
          />

          {/* Operations */}
          <Route
            path="operations"
            element={
              <RequirePermission resource="operations" action="view">
                <PlaceholderPage title="Operations" message="Approvals, payroll, billing (Employee)" />
              </RequirePermission>
            }
          />

          {/* Projects */}
          <Route
            path="projects"
            element={
              <RequirePermission resource="projects" action="view">
                <PlaceholderPage title="Projects" message="Employee projects." />
              </RequirePermission>
            }
          />

          {/* Referrals */}
          <Route
            path="referrals"
            element={
              <RequirePermission resource="referrals" action="view">
                <ReferralsPage />
              </RequirePermission>
            }
          />

          {/* Settings (profile) */}
          <Route
            path="settings"
            element={
              <RequirePermission resource="profile" action="view">
                <ProfilePage />
              </RequirePermission>
            }
          />
        </Route>
        
      

        {/* Mobile placeholder */}
        <Route
          path="/mobile"
          element={
            <ProtectedRoute>
              <PlaceholderPage title="Field" message="Field Agent area (Phase 2+)." />
            </ProtectedRoute>
          }
        />

        {/* Access denied + profile */}
        <Route path="/access-denied" element={<ProtectedRoute><AccessDeniedPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

        {/* Customer portal */}
        <Route path="/portal/login" element={<CustomerLoginPage />} />
        <Route
          path="/portal"
          element={
            <RequireCustomerAuth>
              <CustomerPortalLayout />
            </RequireCustomerAuth>
          }
        >
          <Route index element={<MyProjectPage />} />
          <Route path="referrals" element={<CustomerReferralsPage />} />
          <Route path="support" element={<SupportTicketsPage />} />
          <Route path="support/:ticketId" element={<SupportTicketsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;