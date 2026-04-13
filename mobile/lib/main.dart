import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'core/theme/theme.dart';
import 'core/router/app_router.dart';
import 'providers/auth_provider.dart';
import 'providers/dashboard_provider.dart';
import 'providers/leads_provider.dart';
import 'providers/projects_provider.dart';
import 'providers/employees_provider.dart';
import 'providers/messages_provider.dart';
import 'providers/installation_provider.dart';
import 'providers/on_field_provider.dart';
import 'providers/settings_provider.dart';
import 'providers/financial_provider.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  runApp(const XvrythngApp());
}

class XvrythngApp extends StatefulWidget {
  const XvrythngApp({super.key});

  @override
  State<XvrythngApp> createState() => _XvrythngAppState();
}

class _XvrythngAppState extends State<XvrythngApp> {
  late final AuthProvider _authProvider;

  @override
  void initState() {
    super.initState();
    _authProvider = AuthProvider();
    _authProvider.initialize();
    _authProvider.listenToSessionExpiry();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: _authProvider),
        ChangeNotifierProvider(create: (_) => DashboardProvider()),
        ChangeNotifierProvider(create: (_) => LeadsProvider()),
        ChangeNotifierProvider(create: (_) => ProjectsProvider()),
        ChangeNotifierProvider(create: (_) => EmployeesProvider()),
        ChangeNotifierProvider(create: (_) => MessagesProvider()),
        ChangeNotifierProvider(create: (_) => InstallationProvider()),
        ChangeNotifierProvider(create: (_) => OnFieldProvider()),
        ChangeNotifierProvider(create: (_) => SettingsProvider()),
        ChangeNotifierProvider(create: (_) => FinancialProvider()),
      ],
      child: _AppWithRouter(authProvider: _authProvider),
    );
  }
}

class _AppWithRouter extends StatefulWidget {
  final AuthProvider authProvider;
  const _AppWithRouter({required this.authProvider});

  @override
  State<_AppWithRouter> createState() => _AppWithRouterState();
}

class _AppWithRouterState extends State<_AppWithRouter> {
  late final router = createRouter(widget.authProvider);

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'XVRYTHNG',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      themeMode: ThemeMode.light,
      routerConfig: router,
    );
  }
}
