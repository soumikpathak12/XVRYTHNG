import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../screens/auth/login_screen.dart';
import '../../screens/auth/forgot_password_screen.dart';
import '../../screens/auth/reset_password_screen.dart';
import '../../screens/home/admin_shell.dart';
import '../../screens/home/employee_shell.dart';
import '../../screens/home/company_shell.dart';
import '../../screens/dashboard/dashboard_screen.dart';
import '../../screens/leads/leads_screen.dart';
import '../../screens/leads/lead_detail_screen.dart';
import '../../screens/leads/lead_form_screen.dart';
import '../../screens/projects/projects_screen.dart';
import '../../screens/projects/project_detail_screen.dart';
import '../../screens/projects/retailer_projects_screen.dart';
import '../../screens/employees/employees_screen.dart';
import '../../screens/employees/employee_create_screen.dart';
import '../../screens/employees/employee_profile_screen.dart';
import '../../screens/installation/installation_list_screen.dart';
import '../../screens/installation/installation_detail_screen.dart';
import '../../screens/messages/messages_screen.dart';
import '../../screens/attendance/attendance_screen.dart';
import '../../screens/attendance/team_attendance_roster_screen.dart';
import '../../screens/leave/leave_screen.dart';
import '../../screens/expenses/expenses_screen.dart';
import '../../screens/approvals/approvals_screen.dart';
import '../../screens/referrals/referrals_screen.dart';
import '../../screens/support/support_tickets_screen.dart';
import '../../screens/support/support_ticket_detail_screen.dart';
import '../../screens/payroll/payroll_screen.dart';
import '../../screens/companies/companies_screen.dart';
import '../../screens/settings/settings_screen.dart';
import '../../screens/profile/profile_screen.dart';
import '../../screens/on_field/on_field_screen.dart';
import '../../screens/customer/customer_portal_screen.dart';
import '../../screens/projects/pm_dashboard_screen.dart';
import '../../screens/projects/retailer_project_detail_screen.dart';
import '../../screens/projects/project_form_screen.dart';
import '../../screens/operations/operations_dashboard_screen.dart';
import '../../screens/operations/operational_users_placeholder_screen.dart';
import '../../screens/leads/import_leads_screen.dart';
import '../../screens/on_field/site_inspection_form_screen.dart';
import '../../screens/on_field/site_inspection_leads_screen.dart';
import '../../screens/notifications/notifications_screen.dart';
import '../../screens/resources/resource_library_screen.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();

GoRouter createRouter(AuthProvider authProvider) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/',
    refreshListenable: authProvider,
    redirect: (context, state) {
      final auth = authProvider;
      final isLoggedIn = auth.isAuthenticated;
      final isAuthRoute =
          state.matchedLocation == '/login' ||
          state.matchedLocation == '/forgot-password' ||
          state.matchedLocation.startsWith('/reset-password');

      if (auth.loading) {
        if (state.matchedLocation == '/') return '/splash';
        return null;
      }

      final isSplash = state.matchedLocation == '/splash';

      if (!isLoggedIn && !isAuthRoute) return '/login';
      if (isLoggedIn &&
          (auth.user?.isOnFieldRole == true ||
              auth.user?.isFieldAgent == true) &&
          state.matchedLocation == '/employee') {
        return '/employee/on-field';
      }
      if (isLoggedIn && (isAuthRoute || isSplash))
        return auth.getDefaultRoute();
      return null;
    },
    routes: [
      GoRoute(
        path: '/',
        redirect: (context, state) {
          final auth = context.read<AuthProvider>();
          if (auth.loading) return '/splash';
          if (!auth.isAuthenticated) return '/login';
          return auth.getDefaultRoute();
        },
      ),
      GoRoute(
        path: '/splash',
        builder: (context, state) =>
            const Scaffold(body: Center(child: CircularProgressIndicator())),
      ),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: '/forgot-password',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/reset-password',
        builder: (context, state) => ResetPasswordScreen(
          initialToken: state.uri.queryParameters['token'],
        ),
      ),

      // Super Admin Shell
      ShellRoute(
        builder: (context, state, child) =>
            AdminShell(currentRoute: state.matchedLocation, child: child),
        routes: [
          GoRoute(
            path: '/admin',
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/admin/leads',
            builder: (context, state) => const LeadsScreen(),
          ),
          GoRoute(
            path: '/admin/leads/new',
            builder: (context, state) => const LeadFormScreen(),
          ),
          GoRoute(
            path: '/admin/leads/:id',
            builder: (context, state) => LeadDetailScreen(
              leadId: int.parse(state.pathParameters['id']!),
            ),
          ),
          GoRoute(
            path: '/admin/leads/:id/site-inspection',
            builder: (context, state) => SiteInspectionFormScreen(
              leadId: int.parse(state.pathParameters['id']!),
            ),
          ),
          GoRoute(
            path: '/admin/companies',
            builder: (context, state) => const CompaniesScreen(),
          ),
          GoRoute(
            path: '/admin/employees',
            builder: (context, state) => const EmployeesScreen(),
          ),
          GoRoute(
            path: '/admin/employees/new',
            builder: (context, state) => const EmployeeCreateScreen(),
          ),
          GoRoute(
            path: '/admin/employees/:id',
            builder: (context, state) => EmployeeProfileScreen(
              employeeId: int.parse(state.pathParameters['id']!),
            ),
          ),
          GoRoute(
            path: '/admin/employees/:id/edit',
            builder: (context, state) => EmployeeCreateScreen(
              employeeId: int.parse(state.pathParameters['id']!),
            ),
          ),
          GoRoute(
            path: '/admin/projects',
            builder: (context, state) => const ProjectsScreen(),
          ),
          GoRoute(
            path: '/admin/projects/retailer',
            builder: (context, state) => const RetailerProjectsScreen(),
          ),
          GoRoute(
            path: '/admin/projects/new',
            builder: (context, state) => const ProjectFormScreen(),
          ),
          GoRoute(
            path: '/admin/projects/retailer/new',
            builder: (context, state) =>
                const ProjectFormScreen(isRetailer: true),
          ),
          GoRoute(
            path: '/admin/projects/retailer/:id',
            builder: (context, state) => RetailerProjectDetailScreen(
              projectId: int.parse(state.pathParameters['id']!),
            ),
          ),
          GoRoute(
            path: '/admin/projects/:id',
            builder: (context, state) => ProjectDetailScreen(
              projectId: int.parse(state.pathParameters['id']!),
            ),
          ),
          GoRoute(
            path: '/admin/installation',
            builder: (context, state) => const InstallationListScreen(),
          ),
          GoRoute(
            path: '/admin/installation/:id',
            builder: (context, state) => InstallationDetailScreen(
              jobId: int.parse(state.pathParameters['id']!),
            ),
          ),
          GoRoute(
            path: '/admin/operations',
            builder: (context, state) => const OperationsDashboardScreen(),
          ),
          GoRoute(
            path: '/admin/guest-users',
            builder: (context, state) => const OperationalUsersPlaceholderScreen(
              title: 'Guest Users',
              subtitle:
                  'Guest users management will be available here in the next update.',
            ),
          ),
          GoRoute(
            path: '/admin/trial-users',
            builder: (context, state) => const OperationalUsersPlaceholderScreen(
              title: 'Trial Users',
              subtitle:
                  'Trial users management will be available here in the next update.',
            ),
          ),
          GoRoute(
            path: '/admin/attendance',
            builder: (context, state) => const ApprovalsScreen(),
          ),
          GoRoute(
            path: '/admin/attendance-history',
            builder: (context, state) => const TeamAttendanceRosterScreen(),
          ),
          GoRoute(
            path: '/admin/payroll',
            builder: (context, state) => const PayrollScreen(),
          ),
          GoRoute(
            path: '/admin/referrals',
            builder: (context, state) => const ReferralsScreen(),
          ),
          GoRoute(
            path: '/admin/messages',
            builder: (context, state) => const MessagesScreen(),
          ),
          GoRoute(
            path: '/admin/notifications',
            builder: (context, state) => const NotificationsScreen(),
          ),
          GoRoute(
            path: '/admin/support-tickets',
            builder: (context, state) => const SupportTicketsScreen(),
          ),
          GoRoute(
            path: '/admin/support-tickets/:id',
            builder: (context, state) => SupportTicketDetailScreen(
              ticketId: int.parse(state.pathParameters['id']!),
            ),
          ),
          GoRoute(
            path: '/admin/on-field',
            builder: (context, state) => const OnFieldScreen(),
          ),
          GoRoute(
            path: '/admin/job-scheduling',
            builder: (context, state) => const OnFieldScreen(),
          ),
          GoRoute(
            path: '/admin/settings',
            builder: (context, state) => const SettingsScreen(),
          ),
          GoRoute(
            path: '/admin/resources',
            builder: (context, state) => const ResourceLibraryScreen(),
          ),
          GoRoute(
            path: '/admin/profile',
            builder: (context, state) => const ProfileScreen(),
          ),
          GoRoute(
            path: '/admin/pm-dashboard',
            builder: (context, state) => const PmDashboardScreen(),
          ),
          GoRoute(
            path: '/admin/leads/import',
            builder: (context, state) => const ImportLeadsScreen(),
          ),
        ],
      ),

      // Company Admin/Manager Shell
      ShellRoute(
        builder: (context, state, child) =>
            CompanyShell(currentRoute: state.matchedLocation, child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/dashboard/leads',
            builder: (context, state) => const LeadsScreen(),
          ),
          GoRoute(
            path: '/dashboard/leads/new',
            builder: (context, state) => const LeadFormScreen(),
          ),
          GoRoute(
            path: '/dashboard/leads/:id',
            builder: (context, state) => LeadDetailScreen(
              leadId: int.parse(state.pathParameters['id']!),
            ),
          ),
          GoRoute(
            path: '/dashboard/leads/:id/site-inspection',
            builder: (context, state) => SiteInspectionFormScreen(
              leadId: int.parse(state.pathParameters['id']!),
            ),
          ),
          GoRoute(
            path: '/dashboard/employees',
            builder: (context, state) => const EmployeesScreen(),
          ),
          GoRoute(
            path: '/dashboard/employees/new',
            builder: (context, state) => const EmployeeCreateScreen(),
          ),
          GoRoute(
            path: '/dashboard/employees/:id',
            builder: (context, state) => EmployeeProfileScreen(
              employeeId: int.parse(state.pathParameters['id']!),
            ),
          ),
          GoRoute(
            path: '/dashboard/employees/:id/edit',
            builder: (context, state) => EmployeeCreateScreen(
              employeeId: int.parse(state.pathParameters['id']!),
            ),
          ),
          GoRoute(
            path: '/dashboard/projects',
            builder: (context, state) => const ProjectsScreen(),
          ),
          GoRoute(
            path: '/dashboard/projects/new',
            builder: (context, state) =>
                const ProjectFormScreen(isRetailer: true),
          ),
          GoRoute(
            path: '/dashboard/projects/retailer',
            builder: (context, state) => const RetailerProjectsScreen(),
          ),
          GoRoute(
            path: '/dashboard/projects/retailer/new',
            builder: (context, state) =>
                const ProjectFormScreen(isRetailer: true),
          ),
          GoRoute(
            path: '/dashboard/projects/retailer/:id',
            builder: (context, state) => RetailerProjectDetailScreen(
              projectId: int.parse(state.pathParameters['id']!),
            ),
          ),
          GoRoute(
            path: '/dashboard/projects/:id',
            builder: (context, state) => ProjectDetailScreen(
              projectId: int.parse(state.pathParameters['id']!),
            ),
          ),
          GoRoute(
            path: '/dashboard/installation',
            builder: (context, state) => const InstallationListScreen(),
          ),
          GoRoute(
            path: '/dashboard/installation/:id',
            builder: (context, state) => InstallationDetailScreen(
              jobId: int.parse(state.pathParameters['id']!),
            ),
          ),
          GoRoute(
            path: '/dashboard/operations',
            builder: (context, state) => const OperationsDashboardScreen(),
          ),
          GoRoute(
            path: '/dashboard/attendance',
            builder: (context, state) => const ApprovalsScreen(),
          ),
          GoRoute(
            path: '/dashboard/attendance-history',
            builder: (context, state) => const TeamAttendanceRosterScreen(),
          ),
          GoRoute(
            path: '/dashboard/payroll',
            builder: (context, state) => const PayrollScreen(),
          ),
          GoRoute(
            path: '/dashboard/referrals',
            builder: (context, state) => const ReferralsScreen(),
          ),
          GoRoute(
            path: '/dashboard/messages',
            builder: (context, state) => const MessagesScreen(),
          ),
          GoRoute(
            path: '/dashboard/notifications',
            builder: (context, state) => const NotificationsScreen(),
          ),
          GoRoute(
            path: '/dashboard/support-tickets',
            builder: (context, state) => const SupportTicketsScreen(),
          ),
          GoRoute(
            path: '/dashboard/support-tickets/:id',
            builder: (context, state) => SupportTicketDetailScreen(
              ticketId: int.parse(state.pathParameters['id']!),
            ),
          ),
          GoRoute(
            path: '/dashboard/settings',
            builder: (context, state) => const SettingsScreen(),
          ),
          GoRoute(
            path: '/dashboard/resources',
            builder: (context, state) => const ResourceLibraryScreen(),
          ),
          GoRoute(
            path: '/dashboard/profile',
            builder: (context, state) => const ProfileScreen(),
          ),
          GoRoute(
            path: '/dashboard/pm-dashboard',
            builder: (context, state) => const PmDashboardScreen(),
          ),
          GoRoute(
            path: '/dashboard/on-field',
            builder: (context, state) => const OnFieldScreen(),
          ),
        ],
      ),

      // Employee Shell
      ShellRoute(
        builder: (context, state, child) =>
            EmployeeShell(currentRoute: state.matchedLocation, child: child),
        routes: [
          GoRoute(
            path: '/employee',
            builder: (context, state) {
              final auth = context.read<AuthProvider>();
              if (auth.user?.isOnFieldRole == true ||
                  auth.user?.isFieldAgent == true) {
                return const OnFieldScreen();
              }
              return const DashboardScreen();
            },
          ),
          GoRoute(
            path: '/employee/leads',
            builder: (context, state) => const LeadsScreen(),
          ),
          GoRoute(
            path: '/employee/leads/new',
            builder: (context, state) => const LeadFormScreen(),
          ),
          GoRoute(
            path: '/employee/site-inspection',
            builder: (context, state) => const SiteInspectionLeadsScreen(),
          ),
          GoRoute(
            path: '/employee/leads/:id',
            builder: (context, state) => LeadDetailScreen(
              leadId: int.parse(state.pathParameters['id']!),
            ),
          ),
          GoRoute(
            path: '/employee/leads/:id/site-inspection',
            builder: (context, state) => SiteInspectionFormScreen(
              leadId: int.parse(state.pathParameters['id']!),
            ),
          ),
          GoRoute(
            path: '/employee/attendance',
            builder: (context, state) => const AttendanceScreen(),
          ),
          GoRoute(
            path: '/employee/attendance-history',
            builder: (context, state) => const TeamAttendanceRosterScreen(),
          ),
          GoRoute(
            path: '/employee/leave',
            builder: (context, state) => const LeaveScreen(),
          ),
          GoRoute(
            path: '/employee/expenses',
            builder: (context, state) => const ExpensesScreen(),
          ),
          GoRoute(
            path: '/employee/on-field',
            builder: (context, state) => const OnFieldScreen(),
          ),
          GoRoute(
            path: '/employee/installation',
            builder: (context, state) => const InstallationListScreen(),
          ),
          GoRoute(
            path: '/employee/installation/:id',
            builder: (context, state) => InstallationDetailScreen(
              jobId: int.parse(state.pathParameters['id']!),
            ),
          ),
          GoRoute(
            path: '/employee/messages',
            builder: (context, state) => const MessagesScreen(),
          ),
          GoRoute(
            path: '/employee/notifications',
            builder: (context, state) => const NotificationsScreen(),
          ),
          GoRoute(
            path: '/employee/referrals',
            builder: (context, state) => const ReferralsScreen(),
          ),
          GoRoute(
            path: '/employee/support-tickets',
            builder: (context, state) => const SupportTicketsScreen(),
          ),
          GoRoute(
            path: '/employee/support-tickets/:id',
            builder: (context, state) => SupportTicketDetailScreen(
              ticketId: int.parse(state.pathParameters['id']!),
            ),
          ),
          GoRoute(
            path: '/employee/approvals',
            builder: (context, state) => const ApprovalsScreen(),
          ),
          GoRoute(
            path: '/employee/payroll',
            builder: (context, state) => const PayrollScreen(),
          ),
          GoRoute(
            path: '/employee/pm-dashboard',
            builder: (context, state) => const PmDashboardScreen(),
          ),
          GoRoute(
            path: '/employee/projects/dashboard',
            builder: (context, state) => const PmDashboardScreen(),
          ),
          GoRoute(
            path: '/employee/projects/retailer',
            builder: (context, state) => const RetailerProjectsScreen(),
          ),
          GoRoute(
            path: '/employee/projects/retailer/new',
            builder: (context, state) =>
                const ProjectFormScreen(isRetailer: true),
          ),
          GoRoute(
            path: '/employee/projects/retailer/:id',
            builder: (context, state) => RetailerProjectDetailScreen(
              projectId: int.parse(state.pathParameters['id']!),
            ),
          ),
          GoRoute(
            path: '/employee/projects',
            builder: (context, state) => const ProjectsScreen(),
          ),
          GoRoute(
            path: '/employee/projects/:id',
            builder: (context, state) => ProjectDetailScreen(
              projectId: int.parse(state.pathParameters['id']!),
            ),
          ),
          GoRoute(
            path: '/employee/settings',
            builder: (context, state) => const ProfileScreen(),
          ),
          GoRoute(
            path: '/employee/resources',
            builder: (context, state) => const ResourceLibraryScreen(),
          ),
        ],
      ),

      // Customer Portal
      GoRoute(
        path: '/portal',
        builder: (context, state) => const CustomerPortalScreen(),
      ),
    ],
    errorBuilder: (context, state) => const LoginScreen(),
  );
}
