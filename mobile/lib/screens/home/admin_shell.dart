import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../widgets/common/app_drawer.dart';
import '../../widgets/common/shell_scaffold_scope.dart';

class AdminShell extends StatefulWidget {
  final String currentRoute;
  final Widget child;

  const AdminShell({
    super.key,
    required this.currentRoute,
    required this.child,
  });

  @override
  State<AdminShell> createState() => _AdminShellState();
}

class _AdminShellState extends State<AdminShell> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  List<DrawerItem> get _drawerItems => [
        const DrawerItem.divider(label: 'Operation'),
        const DrawerItem(
          label: 'Companies',
          icon: Icons.business_outlined,
          route: '/admin/companies',
        ),
        const DrawerItem(
          label: 'Employees',
          icon: Icons.badge_outlined,
          route: '/admin/employees',
        ),
        const DrawerItem(
          label: 'Projects',
          icon: Icons.inventory_2_outlined,
          route: '/admin/projects',
        ),
        const DrawerItem(
          label: 'Installation Day',
          icon: Icons.build_outlined,
          route: '/admin/installation',
        ),
        const DrawerItem(
          label: 'On-Field',
          icon: Icons.engineering_outlined,
          route: '/admin/on-field',
        ),
        const DrawerItem(
          label: 'Operations',
          icon: Icons.factory_outlined,
          route: '/admin/operations',
        ),
        const DrawerItem(
          label: 'Payroll',
          icon: Icons.calculate_outlined,
          route: '/admin/payroll',
        ),
        const DrawerItem(
          label: 'Referrals',
          icon: Icons.share_outlined,
          route: '/admin/referrals',
        ),
        const DrawerItem(
          label: 'Messages',
          icon: Icons.message_outlined,
          route: '/admin/messages',
        ),
        const DrawerItem(
          label: 'Support Tickets',
          icon: Icons.support_agent_outlined,
          route: '/admin/support-tickets',
        ),
        const DrawerItem(
          label: 'Settings',
          icon: Icons.settings_outlined,
          route: '/admin/settings',
        ),
        const DrawerItem.divider(),
        const DrawerItem(
          label: 'Profile',
          icon: Icons.person_outline,
          route: '/admin/profile',
        ),
      ];

  int get _currentNavIndex {
    final route = widget.currentRoute;
    if (route == '/admin') return 0;
    if (route.startsWith('/admin/leads')) return 1;
    if (route.startsWith('/admin/projects')) return 2;
    if (route.startsWith('/admin/messages')) return 3;
    return 4;
  }

  void _onNavTap(int index) {
    switch (index) {
      case 0:
        context.go('/admin');
      case 1:
        context.go('/admin/leads');
      case 2:
        context.go('/admin/projects');
      case 3:
        context.go('/admin/messages');
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
