import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Provides the [GlobalKey] for the root shell [Scaffold] so nested screens
/// can open the drawer. Also avoids **double AppBars** (white shell bar +
/// teal screen bar) by letting only the inner screen own the [AppBar].
class ShellScaffoldScope extends InheritedWidget {
  const ShellScaffoldScope({
    super.key,
    required this.scaffoldKey,
    required super.child,
  });

  final GlobalKey<ScaffoldState> scaffoldKey;

  static ShellScaffoldScope? _maybeOf(BuildContext context) {
    return context.getInheritedWidgetOfExactType<ShellScaffoldScope>();
  }

  /// Drawer menu when this is a shell "root" route; `null` when [GoRouter]
  /// can pop (detail pages get the default back affordance).
  static Widget? navigationLeading(BuildContext context) {
    if (GoRouter.of(context).canPop()) {
      return null;
    }
    final scope = _maybeOf(context);
    if (scope == null) return null;
    return IconButton(
      icon: const Icon(Icons.menu_rounded),
      tooltip: 'Menu',
      onPressed: () => scope.scaffoldKey.currentState?.openDrawer(),
    );
  }

  @override
  bool updateShouldNotify(covariant ShellScaffoldScope oldWidget) =>
      scaffoldKey != oldWidget.scaffoldKey;

  /// Bell icon action (optional per-screen).
  /// If [onPressed] is not provided and [context] is available,
  /// it shows a lightweight placeholder until notifications module is added.
  static List<Widget> notificationActions({
    BuildContext? context,
    VoidCallback? onPressed,
  }) {
    void defaultTap() {
      if (context == null) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No new notifications'),
          duration: Duration(seconds: 2),
        ),
      );
    }

    return [
      IconButton(
        icon: const Icon(Icons.notifications_outlined),
        tooltip: 'Notifications',
        onPressed: onPressed ?? defaultTap,
      ),
    ];
  }
}
