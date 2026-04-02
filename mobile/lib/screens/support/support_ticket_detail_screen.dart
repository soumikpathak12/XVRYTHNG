import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../models/support_ticket.dart';
import '../../providers/auth_provider.dart';
import '../../services/support_service.dart';
import '../../widgets/common/shell_scaffold_scope.dart';
import '../../widgets/common/status_badge.dart';

class SupportTicketDetailScreen extends StatefulWidget {
  final int ticketId;
  const SupportTicketDetailScreen({super.key, required this.ticketId});

  @override
  State<SupportTicketDetailScreen> createState() =>
      _SupportTicketDetailScreenState();
}

class _SupportTicketDetailScreenState extends State<SupportTicketDetailScreen> {
  final _service = SupportService();
  final _replyCtrl = TextEditingController();
  final _dateFmt = DateFormat('dd MMM yyyy, hh:mm a');

  SupportTicket? _ticket;
  bool _loading = true;
  bool _sending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _replyCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      _ticket = await _service.getTicket(widget.ticketId);
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _sendReply() async {
    final body = _replyCtrl.text.trim();
    if (body.isEmpty) return;

    setState(() => _sending = true);
    try {
      await _service.addReply(widget.ticketId, body);
      _replyCtrl.clear();
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _updateStatus(String status) async {
    try {
      await _service.updateTicketStatus(widget.ticketId, status);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                'Status updated to ${SupportTicket.statusLabels[status] ?? status}'),
          ),
        );
      }
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final isAdmin = authProvider.user?.isSuperAdmin == true ||
        authProvider.user?.isCompanyAdmin == true ||
        authProvider.user?.isManager == true;

    return Scaffold(
      appBar: AppBar(
        title: Text('Ticket #${widget.ticketId}'),
        actions: [
          if (isAdmin && _ticket != null)
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert),
              onSelected: _updateStatus,
              itemBuilder: (_) => SupportTicket.statusLabels.entries
                  .where((e) => e.key != _ticket!.status)
                  .map((e) => PopupMenuItem(
                        value: e.key,
                        child: Text('Set ${e.value}'),
                      ))
                  .toList(),
            ),
          ...ShellScaffoldScope.notificationActions(),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildError()
              : Column(
                  children: [
                    Expanded(child: _buildContent()),
                    _buildReplyInput(),
                  ],
                ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 48, color: AppColors.danger),
            const SizedBox(height: 12),
            Text(_error!, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(onPressed: _load, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }

  Widget _buildContent() {
    final t = _ticket!;
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildHeader(t),
          const SizedBox(height: 20),
          if (t.replies.isNotEmpty) ...[
            Text(
              'Replies (${t.replies.length})',
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 16,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            ...t.replies.map(_buildReplyBubble),
          ] else
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 32),
                child: Text(
                  'No replies yet. Be the first to respond.',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 14,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildHeader(SupportTicket t) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  t.subject,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              StatusBadge.fromStatus(t.status),
            ],
          ),
          if (t.description != null && t.description!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              t.description!,
              style: const TextStyle(
                fontSize: 14,
                color: AppColors.textSecondary,
                height: 1.5,
              ),
            ),
          ],
          const SizedBox(height: 14),
          const Divider(height: 1, color: AppColors.divider),
          const SizedBox(height: 14),
          Row(
            children: [
              _DetailChip(
                  icon: Icons.person_outline,
                  label: t.createdByName ?? 'Unknown'),
              const SizedBox(width: 16),
              if (t.priority != null)
                _DetailChip(
                    icon: Icons.flag_outlined, label: t.priority!),
              const Spacer(),
              if (t.createdAt != null)
                Text(
                  _dateFmt.format(t.createdAt!),
                  style: const TextStyle(
                      fontSize: 12, color: AppColors.textSecondary),
                ),
            ],
          ),
          if (t.category != null) ...[
            const SizedBox(height: 8),
            _DetailChip(icon: Icons.label_outline, label: t.category!),
          ],
        ],
      ),
    );
  }

  Widget _buildReplyBubble(TicketReply reply) {
    final isStaff = reply.isStaff;
    return Align(
      alignment: isStaff ? Alignment.centerLeft : Alignment.centerRight,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        constraints:
            BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isStaff
              ? AppColors.primary.withOpacity(0.08)
              : AppColors.info.withOpacity(0.08),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(14),
            topRight: const Radius.circular(14),
            bottomLeft: Radius.circular(isStaff ? 2 : 14),
            bottomRight: Radius.circular(isStaff ? 14 : 2),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  isStaff ? Icons.support_agent : Icons.person,
                  size: 14,
                  color: isStaff ? AppColors.primary : AppColors.info,
                ),
                const SizedBox(width: 6),
                Text(
                  reply.senderName ?? (isStaff ? 'Staff' : 'Customer'),
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                    color: isStaff ? AppColors.primary : AppColors.info,
                  ),
                ),
                if (isStaff) ...[
                  const SizedBox(width: 6),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'STAFF',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 8),
            Text(
              reply.body,
              style: const TextStyle(
                fontSize: 14,
                color: AppColors.textPrimary,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              reply.createdAt != null ? _dateFmt.format(reply.createdAt!) : '',
              style: const TextStyle(
                  fontSize: 11, color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReplyInput() {
    return Container(
      padding: EdgeInsets.fromLTRB(
          12, 8, 12, MediaQuery.of(context).padding.bottom + 8),
      decoration: const BoxDecoration(
        color: AppColors.white,
        border: Border(top: BorderSide(color: AppColors.divider)),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _replyCtrl,
              maxLines: null,
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => _sendReply(),
              decoration: InputDecoration(
                hintText: 'Type your reply...',
                filled: true,
                fillColor: AppColors.surface,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Material(
            color: AppColors.primary,
            shape: const CircleBorder(),
            child: InkWell(
              customBorder: const CircleBorder(),
              onTap: _sending ? null : _sendReply,
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: _sending
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.white,
                        ),
                      )
                    : const Icon(Icons.send, size: 20, color: AppColors.white),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailChip extends StatelessWidget {
  final IconData icon;
  final String label;
  const _DetailChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 15, color: AppColors.textSecondary),
        const SizedBox(width: 4),
        Text(
          label,
          style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w500),
        ),
      ],
    );
  }
}
