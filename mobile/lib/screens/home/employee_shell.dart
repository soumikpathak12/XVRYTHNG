import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/navigation/role_sidebar_drawer.dart';
import '../../core/theme/app_colors.dart';
import '../../providers/auth_provider.dart';
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

  /// True for personal attendance and team roster (not other `/employee/attendance*` paths).
  static bool _isAttendanceSectionRoute(String route) {
    if (route.startsWith('/employee/attendance-history')) return true;
    if (route == '/employee/attendance' || route.startsWith('/employee/attendance/')) {
      return true;
    }
    return false;
  }

  List<DrawerItem> _drawerItems(AuthProvider auth) {
    final modules = RoleSidebarDrawer.modulesFromConfig(auth.sidebarConfig);
    return RoleSidebarDrawer.buildEmployeeDrawerItems(modules);
  }

  bool _isOnFieldHome(AuthProvider auth) =>
      auth.user?.isOnFieldRole == true || auth.user?.isFieldAgent == true;

  int _currentNavIndex(AuthProvider auth) {
    final route = widget.currentRoute;
    final isOnFieldHome = _isOnFieldHome(auth);
    if (route == '/employee') return 0;
    if (route == '/employee/on-field' && isOnFieldHome) return 0;
    if (isOnFieldHome) {
      if (_isAttendanceSectionRoute(route)) return 1;
      if (route.startsWith('/employee/messages')) return 2;
      return 3;
    }
    if (route.startsWith('/employee/leads')) return 1;
    if (_isAttendanceSectionRoute(route)) return 2;
    if (route.startsWith('/employee/messages')) return 3;
    return 4;
  }

  void _onNavTap(AuthProvider auth, int index) {
    final homeRoute = _isOnFieldHome(auth) ? '/employee/on-field' : '/employee';
    final isOnFieldHome = _isOnFieldHome(auth);
    if (isOnFieldHome) {
      switch (index) {
        case 0:
          context.go(homeRoute);
        case 1:
          context.go('/employee/attendance');
        case 2:
          context.go('/employee/messages');
        case 3:
          _scaffoldKey.currentState?.openDrawer();
      }
      return;
    }
    switch (index) {
      case 0:
        context.go(homeRoute);
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
    final auth = context.watch<AuthProvider>();
    final isOnFieldHome = _isOnFieldHome(auth);
    final destinations = isOnFieldHome
        ? const [
            NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home, color: AppColors.primary),
              label: 'Home',
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
          ]
        : const [
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
          ];
    return ShellScaffoldScope(
      scaffoldKey: _scaffoldKey,
      child: Scaffold(
        key: _scaffoldKey,
        drawer: AppDrawer(
          items: _drawerItems(auth),
          currentRoute: widget.currentRoute,
          onNavigate: (route) => context.go(route),
        ),
        body: widget.child,
        bottomNavigationBar: NavigationBar(
          selectedIndex:
              _currentNavIndex(auth) < destinations.length ? _currentNavIndex(auth) : 0,
          onDestinationSelected: (index) => _onNavTap(auth, index),
          backgroundColor: AppColors.white,
          surfaceTintColor: AppColors.white,
          indicatorColor: AppColors.primary.withOpacity(0.12),
          height: 64,
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          destinations: destinations,
        ),
      ),
    );
  }
}
