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
  ///
  /// When [showDrawerWithBack] is true, shows both back and menu if the
  /// route can pop (e.g. Leave under Attendance in the drawer) so the drawer
  /// stays reachable.
  static Widget? navigationLeading(
    BuildContext context, {
    bool showDrawerWithBack = false,
  }) {
    final scope = _maybeOf(context);
    final canPop = GoRouter.of(context).canPop();

    if (showDrawerWithBack && scope != null && canPop) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            tooltip: 'Back',
            onPressed: () => GoRouter.of(context).pop(),
          ),
          IconButton(
            icon: const Icon(Icons.menu_rounded),
            tooltip: 'Menu',
            onPressed: () => scope.scaffoldKey.currentState?.openDrawer(),
          ),
        ],
      );
    }

    if (canPop) {
      return null;
    }
    if (scope == null) return null;
    return IconButton(
      icon: const Icon(Icons.menu_rounded),
      tooltip: 'Menu',
      onPressed: () => scope.scaffoldKey.currentState?.openDrawer(),
    );
  }

  /// Use with [navigationLeading] when `showDrawerWithBack` is true and the
  /// route can pop (two icons in the leading slot).
  static double? navigationLeadingWidth(
    BuildContext context, {
    bool showDrawerWithBack = false,
  }) {
    final scope = _maybeOf(context);
    if (scope == null) return null;
    if (showDrawerWithBack && GoRouter.of(context).canPop()) {
      return 112;
    }
    return null;
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
