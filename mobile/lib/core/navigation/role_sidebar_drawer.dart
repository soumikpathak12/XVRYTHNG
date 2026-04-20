import 'package:flutter/material.dart';

import '../../widgets/common/app_drawer.dart';

/// Builds drawer items from `/api/me/sidebar` to mirror the web company and
/// employee sidebars (module keys and groupings).
class RoleSidebarDrawer {
  static List<String> modulesFromConfig(Map<String, dynamic> config) {
    final raw = config['modules'];
    if (raw is List) {
      return raw.map((e) => e.toString()).toList();
    }
    return [];
  }

  static String? roleFromConfig(Map<String, dynamic> config) {
    final r = config['role'];
    if (r == null) return null;
    return r.toString();
  }

  /// Company admin / manager: dashboard, optional settings, then module links
  /// (same keys as web `MODULE_NAV`), plus Profile for mobile.
  static List<DrawerItem> buildCompanyDrawerItems({
    required List<String> modules,
    required String? apiRole,
    required String userRole,
  }) {
    final r = (apiRole ?? userRole).toLowerCase();
    final items = <DrawerItem>[
      const DrawerItem(
        label: 'Dashboard',
        icon: Icons.dashboard_outlined,
        route: '/dashboard',
      ),
    ];
    if (r == 'company_admin' || r == 'manager') {
      items.add(
        const DrawerItem(
          label: 'Settings',
          icon: Icons.settings_outlined,
          route: '/dashboard/settings',
        ),
      );
    }

    for (final key in modules) {
      final item = _companyModuleDrawerItem(key);
      if (item != null) items.add(item);
    }

    items.add(
      const DrawerItem(
        label: 'Profile',
        icon: Icons.person_outline,
        route: '/dashboard/profile',
      ),
    );
    return items;
  }

  static DrawerItem? _companyModuleDrawerItem(String key) {
    switch (key) {
      case 'leads':
        return const DrawerItem(
          label: 'Lead Pipeline',
          icon: Icons.people_outline,
          route: '/dashboard/leads',
        );
      case 'projects':
        return const DrawerItem(
          label: 'Projects',
          icon: Icons.inventory_2_outlined,
          route: '/dashboard/projects',
        );
      case 'on_field':
        return const DrawerItem(
          label: 'On-Field',
          icon: Icons.engineering_outlined,
          route: '/dashboard/on-field',
        );
      case 'operations':
        return const DrawerItem(
          label: 'Operations',
          icon: Icons.factory_outlined,
          route: '/dashboard/operations',
        );
      case 'attendance':
        return const DrawerItem(
          label: 'Attendance',
          icon: Icons.access_time_outlined,
          route: '/dashboard/attendance',
        );
      case 'attendance_history':
        return const DrawerItem(
          label: 'Team attendance',
          icon: Icons.calendar_view_day_outlined,
          route: '/dashboard/attendance-history',
        );
      case 'payroll':
        return const DrawerItem(
          label: 'Payroll',
          icon: Icons.calculate_outlined,
          route: '/dashboard/payroll',
        );
      case 'messages':
        return const DrawerItem(
          label: 'Messages',
          icon: Icons.message_outlined,
          route: '/dashboard/messages',
        );
      case 'support':
        return const DrawerItem(
          label: 'Support Tickets',
          icon: Icons.support_agent_outlined,
          route: '/dashboard/support-tickets',
        );
      case 'installation':
        return const DrawerItem(
          label: 'Installation Day',
          icon: Icons.build_outlined,
          route: '/dashboard/installation',
        );
      default:
        return null;
    }
  }

  /// Field agents / job-role users: sectioned menu matching web EmployeeSidebar.
  static List<DrawerItem> buildEmployeeDrawerItems(List<String> modules) {
    final allowed = modules.toSet();
    final items = <DrawerItem>[];

    // Sales Management appears only when leads module is enabled.
    // This hides Sales/Dashboard for on-field focused roles (e.g. job_role_id = 2).
    if (allowed.contains('leads')) {
      items.add(const DrawerItem.divider(label: 'Sales Management'));
      items.add(
        const DrawerItem(
          label: 'Dashboard',
          icon: Icons.home_outlined,
          route: '/employee',
        ),
      );
      items.add(
        const DrawerItem(
          label: 'Leads Kanban',
          icon: Icons.trending_up_outlined,
          route: '/employee/leads',
        ),
      );
    }

    if (allowed.contains('projects')) {
      items.add(const DrawerItem.divider(label: 'Project Manager Module'));
      items.add(
        const DrawerItem(
          label: 'Dashboard',
          icon: Icons.space_dashboard_outlined,
          route: '/employee/projects/dashboard',
        ),
      );
      items.add(
        const DrawerItem(
          label: 'In-house Project',
          icon: Icons.build_outlined,
          route: '/employee/projects',
        ),
      );
      items.add(
        const DrawerItem(
          label: 'Retailer Project',
          icon: Icons.storefront_outlined,
          route: '/employee/projects/retailer',
        ),
      );
    }

    final hasAttendance = allowed.contains('attendance');
    final hasTeamRoster = allowed.contains('attendance_history');
    const hasLeave = true;
    if (hasAttendance || hasTeamRoster || hasLeave) {
      items.add(const DrawerItem.divider(label: 'Attendance'));
      if (hasAttendance) {
        items.add(
          const DrawerItem(
            label: 'Attendance',
            icon: Icons.fact_check_outlined,
            route: '/employee/attendance',
          ),
        );
      }
      if (hasTeamRoster) {
        items.add(
          const DrawerItem(
            label: 'Team attendance',
            icon: Icons.calendar_view_day_outlined,
            route: '/employee/attendance-history',
          ),
        );
      }
      if (hasLeave) {
        items.add(
          const DrawerItem(
            label: 'Leave',
            icon: Icons.event_busy_outlined,
            route: '/employee/leave',
          ),
        );
      }
    }

    final onFieldItems = <DrawerItem>[];
    if (allowed.contains('on_field')) {
      onFieldItems.add(
        const DrawerItem(
          label: 'On-Field',
          icon: Icons.engineering_outlined,
          route: '/employee/on-field',
        ),
      );
    }
    if (allowed.contains('site_inspection')) {
      // Points to dedicated inspection list (web has /employee/site-inspection)
      onFieldItems.add(
        const DrawerItem(
          label: 'Site Inspection',
          icon: Icons.assignment_outlined,
          route: '/employee/site-inspection',
        ),
      );
    }
    if (allowed.contains('installation')) {
      onFieldItems.add(
        const DrawerItem(
          label: 'Installation Day',
          icon: Icons.build_outlined,
          route: '/employee/installation',
        ),
      );
    }
    if (onFieldItems.isNotEmpty) {
      items.add(const DrawerItem.divider(label: 'On-Field Module'));
      items.addAll(onFieldItems);
    }

    final comms = <DrawerItem>[];
    if (allowed.contains('messages')) {
      comms.add(
        const DrawerItem(
          label: 'Messages',
          icon: Icons.message_outlined,
          route: '/employee/messages',
        ),
      );
    }
    if (allowed.contains('referrals')) {
      comms.add(
        const DrawerItem(
          label: 'Referrals',
          icon: Icons.card_giftcard_outlined,
          route: '/employee/referrals',
        ),
      );
    }
    if (allowed.contains('support')) {
      comms.add(
        const DrawerItem(
          label: 'Support Tickets',
          icon: Icons.support_agent_outlined,
          route: '/employee/support-tickets',
        ),
      );
    }
    if (comms.isNotEmpty) {
      items.add(const DrawerItem.divider(label: 'Communications'));
      items.addAll(comms);
    }

    final hasOps = allowed.contains('operations');
    final hasPayroll = allowed.contains('payroll');
    if (hasOps || hasPayroll) {
      final title = hasOps && hasPayroll
          ? 'Approvals & Payroll'
          : hasOps
              ? 'Approvals'
              : 'Payroll';
      items.add(DrawerItem.divider(label: title));
      if (hasOps) {
        items.add(
          const DrawerItem(
            label: 'Approvals',
            icon: Icons.check_circle_outline,
            route: '/employee/approvals',
          ),
        );
      }
      if (hasPayroll) {
        items.add(
          const DrawerItem(
            label: 'Payroll',
            icon: Icons.calculate_outlined,
            route: '/employee/payroll',
          ),
        );
      }
    }

    if (allowed.contains('settings')) {
      items.add(const DrawerItem.divider(label: 'Settings'));
      items.add(
        const DrawerItem(
          label: 'Settings',
          icon: Icons.settings_outlined,
          route: '/employee/settings',
        ),
      );
    }

    return items;
  }
}
