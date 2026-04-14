import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../models/message.dart';
import '../../providers/auth_provider.dart';
import '../../services/messages_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _service = MessagesService();
  bool _loading = true;
  String? _error;
  List<Conversation> _unread = const [];

  String get _routePrefix {
    final loc = GoRouterState.of(context).matchedLocation;
    if (loc.startsWith('/admin')) return '/admin';
    if (loc.startsWith('/dashboard')) return '/dashboard';
    if (loc.startsWith('/employee')) return '/employee';
    return '/admin';
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadUnread());
  }

  Future<void> _loadUnread() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final auth = context.read<AuthProvider>();
      final conversations =
          await _service.getConversations(companyId: auth.user?.companyId);
      final unread = conversations.where((c) => c.unreadCount > 0).toList()
        ..sort((a, b) => (b.updatedAt ?? DateTime(2000))
            .compareTo(a.updatedAt ?? DateTime(2000)));
      if (!mounted) return;
      setState(() => _unread = unread);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  String _relativeTime(DateTime? dt) {
    if (dt == null) return '';
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  Future<void> _openNotification(Conversation convo) async {
    final auth = context.read<AuthProvider>();
    try {
      await _service.markAsRead(convo.id, companyId: auth.user?.companyId);
    } catch (_) {}
    if (!mounted) return;
    context.go('$_routePrefix/messages');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Notifications'),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.error_outline, color: AppColors.danger),
                        const SizedBox(height: 10),
                        Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: _loadUnread,
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                )
              : _unread.isEmpty
                  ? RefreshIndicator(
                      onRefresh: _loadUnread,
                      child: ListView(
                        children: const [
                          SizedBox(height: 140),
                          Icon(Icons.notifications_none_rounded,
                              size: 56, color: AppColors.disabled),
                          SizedBox(height: 12),
                          Center(
                            child: Text(
                              'No new notifications',
                              style: TextStyle(color: AppColors.textSecondary),
                            ),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadUnread,
                      child: ListView.separated(
                        padding: const EdgeInsets.fromLTRB(12, 10, 12, 18),
                        itemCount: _unread.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (_, i) {
                          final convo = _unread[i];
                          final title = (convo.name ?? '').trim().isEmpty
                              ? 'Chat'
                              : convo.name!;
                          final preview = (convo.lastMessage?.body ?? '').trim();
                          final unreadCount = convo.unreadCount;
                          return InkWell(
                            borderRadius: BorderRadius.circular(12),
                            onTap: () => _openNotification(convo),
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppColors.border),
                              ),
                              child: Row(
                                children: [
                                  CircleAvatar(
                                    radius: 18,
                                    backgroundColor:
                                        AppColors.primary.withOpacity(0.12),
                                    child: Text(
                                      title.substring(0, 1).toUpperCase(),
                                      style: const TextStyle(
                                        color: AppColors.primary,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          title,
                                          style: const TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w700,
                                            color: AppColors.textPrimary,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          preview.isEmpty
                                              ? 'New message'
                                              : preview,
                                          style: const TextStyle(
                                            fontSize: 12,
                                            color: AppColors.textSecondary,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        _relativeTime(convo.lastMessage?.createdAt ??
                                            convo.updatedAt),
                                        style: const TextStyle(
                                          fontSize: 11,
                                          color: AppColors.textSecondary,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: AppColors.danger,
                                          borderRadius:
                                              BorderRadius.circular(999),
                                        ),
                                        child: Text(
                                          unreadCount > 99
                                              ? '99+'
                                              : '$unreadCount',
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 10,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}

