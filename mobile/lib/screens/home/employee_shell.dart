import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../widgets/common/app_drawer.dart';
import '../../widgets/common/shell_scaffold_scope.dart';

class EmployeeShell extends StatefulWidget {
  final String currentRoute;
  final Widget child;

  const EmployeeShell({
    super.key,
    required this.currentRoute,
    required this.child,
  });

  @override
  State<EmployeeShell> createState() => _EmployeeShellState();
}

class _EmployeeShellState extends State<EmployeeShell> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  List<DrawerItem> get _drawerItems => const [
        DrawerItem.divider(label: 'Onsite Field Management'),
        DrawerItem(
          label: 'Dashboard',
          icon: Icons.space_dashboard_outlined,
          route: '/employee/on-field',
        ),
        DrawerItem(
          label: 'Job Scheduling',
          icon: Icons.engineering_outlined,
          route: '/employee/on-field',
        ),
        DrawerItem(
          label: 'Job Management',
          icon: Icons.build_outlined,
          route: '/employee/installation',
        ),
        DrawerItem.divider(label: 'Operation'),
        DrawerItem(
          label: 'Leave',
          icon: Icons.event_busy_outlined,
          route: '/employee/leave',
        ),
        DrawerItem(
          label: 'Expenses',
          icon: Icons.receipt_long_outlined,
          route: '/employee/expenses',
        ),
        DrawerItem(
          label: 'Messages',
          icon: Icons.message_outlined,
          route: '/employee/messages',
        ),
        DrawerItem(
          label: 'Referrals',
          icon: Icons.share_outlined,
          route: '/employee/referrals',
        ),
        DrawerItem(
          label: 'Support Tickets',
          icon: Icons.support_agent_outlined,
          route: '/employee/support-tickets',
        ),
        DrawerItem.divider(),
        DrawerItem(
          label: 'Settings',
          icon: Icons.settings_outlined,
          route: '/employee/settings',
        ),
      ];

  int get _currentNavIndex {
    final route = widget.currentRoute;
    if (route == '/employee') return 0;
    if (route.startsWith('/employee/leads')) return 1;
    if (route.startsWith('/employee/attendance')) return 2;
    if (route.startsWith('/employee/messages')) return 3;
    return 4;
  }

  void _onNavTap(int index) {
    switch (index) {
      case 0:
        context.go('/employee');
      case 1:
        context.go('/employee/leads');
      case 2:
        context.go('/employee/attendance');
      case 3:
        context.go('/employee/messages');
      case 4:
        _scaffoldKey.currentState?.openDrawer();
    }
  }

  @override
  Widget build(BuildContext context) {
    return ShellScaffoldScope(
      scaffoldKey: _scaffoldKey,
      child: Scaffold(
        key: _scaffoldKey,
        drawer: AppDrawer(
          items: _drawerItems,
          currentRoute: widget.currentRoute,
          onNavigate: (route) => context.go(route),
        ),
        body: widget.child,
        bottomNavigationBar: NavigationBar(
        selectedIndex: _currentNavIndex < 5 ? _currentNavIndex : 0,
        onDestinationSelected: _onNavTap,
        backgroundColor: AppColors.white,
        surfaceTintColor: AppColors.white,
        indicatorColor: AppColors.primary.withOpacity(0.12),
        height: 64,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home, color: AppColors.primary),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.people_outline),
            selectedIcon: Icon(Icons.people, color: AppColors.primary),
            label: 'Leads',
          ),
          NavigationDestination(
            icon: Icon(Icons.access_time_outlined),
            selectedIcon: Icon(Icons.access_time_filled, color: AppColors.primary),
            label: 'Attendance',
          ),
          NavigationDestination(
            icon: Icon(Icons.message_outlined),
            selectedIcon: Icon(Icons.message, color: AppColors.primary),
            label: 'Messages',
          ),
          NavigationDestination(
            icon: Icon(Icons.menu),
            selectedIcon: Icon(Icons.menu, color: AppColors.primary),
            label: 'More',
          ),
        ],
        ),
      ),
    );
  }
}
