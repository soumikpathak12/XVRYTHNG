// lib/main.dart (minimal changes)
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'core/theme/theme.dart';
import 'core/storage/secure_storage.dart';
import 'screens/auth/login_screen.dart';
import '/screens/auth/forgot_password_screen.dart';
import '/screens/auth/reset_password_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Lock to portrait
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  runApp(const XvrythngApp());
}

class XvrythngApp extends StatelessWidget {
  const XvrythngApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'XVRYTHING',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,

      // Use a routes table for all named navigations
      initialRoute: '/',
      routes: {
        '/': (_) => const _SplashGate(),
        '/login': (_) => const LoginScreen(),
        '/home': (_) => const HomeShell(), // <- persistent bottom nav here
        '/forgot-password': (_) => const ForgotPasswordScreen(),
        '/reset-password': (ctx) {
          final arg = ModalRoute.of(ctx)?.settings.arguments;
          return ResetPasswordScreen(initialToken: arg is String ? arg : null);
        },
      },

      // Optional last-resort route
      onUnknownRoute: (_) =>
          MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }
}

/// Splash that decides /login vs /home
class _SplashGate extends StatefulWidget {
  const _SplashGate({super.key});

  @override
  State<_SplashGate> createState() => _SplashGateState();
}

class _SplashGateState extends State<_SplashGate> {
  @override
  void initState() {
    super.initState();
    _decide();
  }

  Future<void> _decide() async {
    final token = await SecureStore.readAccess();
    if (!mounted) return;
    Navigator.of(context).pushReplacementNamed(
      (token == null || token.isEmpty) ? '/login' : '/home',
    );
  }

  @override
  Widget build(BuildContext context) => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
}

/// --------------------------
/// HOME SHELL WITH BOTTOM NAV
/// --------------------------
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  // Simple tab pages (replace with your actual feature screens)
  final _tabs = const [
    _HomeTab(),
    _ProjectsTab(),
    _ReportsTab(),
    _ProfileTab(),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('XVRYTHING'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {},
          ),
        ],
      ),

      // Keep state of tabs alive with IndexedStack
      body: IndexedStack(
        index: _index,
        children: _tabs,
      ),

      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.folder_outlined),
            selectedIcon: Icon(Icons.folder),
            label: 'Projects',
          ),
          NavigationDestination(
            icon: Icon(Icons.analytics_outlined),
            selectedIcon: Icon(Icons.analytics),
            label: 'Reports',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
        // If you prefer the classic BottomNavigationBar look, see alternative below.
        // You can also customize heights & labels via Theme.
      ),
    );
  }
}

/// --------------------------
/// TAB PLACEHOLDERS (replace with your real screens)
/// --------------------------

class _HomeTab extends StatelessWidget {
  const _HomeTab();

  @override
  Widget build(BuildContext context) {
    return const Center(child: Text('Home Page'));
  }
}

class _ProjectsTab extends StatelessWidget {
  const _ProjectsTab();

  @override
  Widget build(BuildContext context) {
    return const Center(child: Text('Projects Page'));
  }
}

class _ReportsTab extends StatelessWidget {
  const _ReportsTab();

  @override
  Widget build(BuildContext context) {
    return const Center(child: Text('Reports Page'));
  }
}

class _ProfileTab extends StatelessWidget {
  const _ProfileTab();

  @override
  Widget build(BuildContext context) {
    return const Center(child: Text('Profile Page'));
  }
}
