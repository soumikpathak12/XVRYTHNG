import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../widgets/common/app_drawer.dart';
import '../../widgets/common/shell_scaffold_scope.dart';

class CompanyShell extends StatefulWidget {
  final String currentRoute;
  final Widget child;

  const CompanyShell({
    super.key,
    required this.currentRoute,
    required this.child,
  });

  @override
  State<CompanyShell> createState() => _CompanyShellState();
}

class _CompanyShellState extends State<CompanyShell> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  List<DrawerItem> get _drawerItems => const [
        DrawerItem(
          label: 'Dashboard',
          icon: Icons.dashboard_outlined,
          route: '/dashboard',
        ),
        DrawerItem(
          label: 'Leads',
          icon: Icons.people_outline,
          route: '/dashboard/leads',
        ),
        DrawerItem(
          label: 'Projects',
          icon: Icons.inventory_2_outlined,
          route: '/dashboard/projects',
        ),
        DrawerItem(
          label: 'Installation',
          icon: Icons.build_outlined,
          route: '/dashboard/installation',
        ),
        DrawerItem(
          label: 'Operations',
          icon: Icons.factory_outlined,
          route: '/dashboard/operations',
        ),
        DrawerItem(
          label: 'Attendance',
          icon: Icons.access_time_outlined,
          route: '/dashboard/attendance',
        ),
        DrawerItem(
          label: 'Payroll',
          icon: Icons.calculate_outlined,
          route: '/dashboard/payroll',
        ),
        DrawerItem(
          label: 'Referrals',
          icon: Icons.share_outlined,
          route: '/dashboard/referrals',
        ),
        DrawerItem(
          label: 'Messages',
          icon: Icons.message_outlined,
          route: '/dashboard/messages',
        ),
        DrawerItem(
          label: 'Support Tickets',
          icon: Icons.support_agent_outlined,
          route: '/dashboard/support-tickets',
        ),
        DrawerItem.divider(),
        DrawerItem(
          label: 'Settings',
          icon: Icons.settings_outlined,
          route: '/dashboard/settings',
        ),
        DrawerItem(
          label: 'Profile',
          icon: Icons.person_outline,
          route: '/dashboard/profile',
        ),
      ];

  int get _currentNavIndex {
    final route = widget.currentRoute;
    if (route == '/dashboard') return 0;
    if (route.startsWith('/dashboard/leads')) return 1;
    if (route.startsWith('/dashboard/projects')) return 2;
    if (route.startsWith('/dashboard/messages')) return 3;
    return 4;
  }

  void _onNavTap(int index) {
    switch (index) {
      case 0:
        context.go('/dashboard');
      case 1:
        context.go('/dashboard/leads');
      case 2:
        context.go('/dashboard/projects');
      case 3:
        context.go('/dashboard/messages');
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
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard, color: AppColors.primary),
            label: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(Icons.people_outline),
            selectedIcon: Icon(Icons.people, color: AppColors.primary),
            label: 'Leads',
          ),
          NavigationDestination(
            icon: Icon(Icons.inventory_2_outlined),
            selectedIcon: Icon(Icons.inventory_2, color: AppColors.primary),
            label: 'Projects',
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
