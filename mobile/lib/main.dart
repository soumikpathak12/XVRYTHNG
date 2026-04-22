import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:async';
import 'package:provider/provider.dart';
import 'core/theme/theme.dart';
import 'core/router/app_router.dart';
import 'providers/auth_provider.dart';
import 'providers/pin_security_provider.dart';
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

class _XvrythngAppState extends State<XvrythngApp> with WidgetsBindingObserver {
  static const Duration _pinLockGracePeriod = Duration(minutes: 30);
  late final AuthProvider _authProvider;
  late final PinSecurityProvider _pinSecurityProvider;
  late final MessagesProvider _messagesProvider;
  late final GlobalKey<ScaffoldMessengerState> _scaffoldMessengerKey;
  StreamSubscription<IncomingMessageNotification>? _incomingSub;
  DateTime? _wentToBackgroundAt;

  @override
  void initState() {
    super.initState();
    _authProvider = AuthProvider();
    _pinSecurityProvider = PinSecurityProvider();
    _messagesProvider = MessagesProvider();
    _scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();
    WidgetsBinding.instance.addObserver(this);
    _authProvider.initialize();
    _authProvider.listenToSessionExpiry();
    _authProvider.addListener(_syncMessagePollingWithAuth);
    _authProvider.addListener(_syncPinWithAuth);
    _incomingSub = _messagesProvider.incomingNotifications.listen((incoming) {
      final messenger = _scaffoldMessengerKey.currentState;
      if (messenger == null) return;
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text('${incoming.title}: ${incoming.body}'),
            duration: const Duration(seconds: 3),
          ),
        );
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _syncMessagePollingWithAuth();
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!_authProvider.isAuthenticated) {
      super.didChangeAppLifecycleState(state);
      return;
    }

    if (state == AppLifecycleState.paused) {
      _wentToBackgroundAt = DateTime.now();
    } else if (state == AppLifecycleState.resumed) {
      final backgroundAt = _wentToBackgroundAt;
      _wentToBackgroundAt = null;
      if (backgroundAt == null) {
        super.didChangeAppLifecycleState(state);
        return;
      }
      final elapsed = DateTime.now().difference(backgroundAt);
      if (elapsed >= _pinLockGracePeriod) {
        _pinSecurityProvider.lock();
      }
    }
    super.didChangeAppLifecycleState(state);
  }

  void _syncMessagePollingWithAuth() {
    if (_authProvider.isAuthenticated) {
      _messagesProvider.loadConversations(
        companyId: _authProvider.user?.companyId,
        emitNotifications: false,
      );
      _messagesProvider.startPolling(companyId: _authProvider.user?.companyId);
      return;
    }
    _messagesProvider.clear();
  }

  void _syncPinWithAuth() {
    _pinSecurityProvider.syncForUser(_authProvider.user);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _incomingSub?.cancel();
    _authProvider.removeListener(_syncMessagePollingWithAuth);
    _authProvider.removeListener(_syncPinWithAuth);
    _messagesProvider.dispose();
    _pinSecurityProvider.dispose();
    _authProvider.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: _authProvider),
        ChangeNotifierProvider.value(value: _pinSecurityProvider),
        ChangeNotifierProvider(create: (_) => DashboardProvider()),
        ChangeNotifierProvider(create: (_) => LeadsProvider()),
        ChangeNotifierProvider(create: (_) => ProjectsProvider()),
        ChangeNotifierProvider(create: (_) => EmployeesProvider()),
        ChangeNotifierProvider.value(value: _messagesProvider),
        ChangeNotifierProvider(create: (_) => InstallationProvider()),
        ChangeNotifierProvider(create: (_) => OnFieldProvider()),
        ChangeNotifierProvider(create: (_) => SettingsProvider()),
        ChangeNotifierProvider(create: (_) => FinancialProvider()),
      ],
      child: _AppWithRouter(
        authProvider: _authProvider,
        pinSecurityProvider: _pinSecurityProvider,
        scaffoldMessengerKey: _scaffoldMessengerKey,
      ),
    );
  }
}

class _AppWithRouter extends StatefulWidget {
  final AuthProvider authProvider;
  final PinSecurityProvider pinSecurityProvider;
  final GlobalKey<ScaffoldMessengerState> scaffoldMessengerKey;
  const _AppWithRouter({
    required this.authProvider,
    required this.pinSecurityProvider,
    required this.scaffoldMessengerKey,
  });

  @override
  State<_AppWithRouter> createState() => _AppWithRouterState();
}

class _AppWithRouterState extends State<_AppWithRouter> {
  late final router = createRouter(
    widget.authProvider,
    widget.pinSecurityProvider,
  );

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'XVRYTHNG',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      themeMode: ThemeMode.light,
      scaffoldMessengerKey: widget.scaffoldMessengerKey,
      routerConfig: router,
    );
  }
}
