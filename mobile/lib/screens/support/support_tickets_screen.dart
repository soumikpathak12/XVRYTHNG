import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../models/support_ticket.dart';
import '../../providers/auth_provider.dart';
import '../../services/support_service.dart';
import '../../widgets/common/empty_state.dart';
import '../../widgets/common/shell_scaffold_scope.dart';
import '../../widgets/common/status_badge.dart';

class SupportTicketsScreen extends StatefulWidget {
  const SupportTicketsScreen({super.key});

  @override
  State<SupportTicketsScreen> createState() => _SupportTicketsScreenState();
}

class _SupportTicketsScreenState extends State<SupportTicketsScreen> {
  final _service = SupportService();
  final _dateFmt = DateFormat('dd MMM yyyy');

  List<SupportTicket> _tickets = [];
  bool _loading = true;
  String? _error;
  String _statusFilter = '';

  static const _filters = ['', 'open', 'in_progress', 'resolved', 'closed'];
  static const _filterLabels = {
    '': 'All',
    'open': 'Open',
    'in_progress': 'In Progress',
    'resolved': 'Resolved',
    'closed': 'Closed',
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      _tickets = await _service.getTickets(
        status: _statusFilter.isEmpty ? null : _statusFilter,
      );
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Color _priorityColor(String? priority) {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return AppColors.danger;
      case 'high':
        return const Color(0xFFE65100);
      case 'medium':
        return AppColors.warning;
      default:
        return AppColors.info;
    }
  }

  void _openCreateDialog() {
    final formKey = GlobalKey<FormState>();
    final subjectCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    String category = 'general';
    String priority = 'medium';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.fromLTRB(
              20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: Form(
            key: formKey,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey[300],
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'New Support Ticket',
                    style: Theme.of(ctx).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                  const SizedBox(height: 20),
                  TextFormField(
                    controller: subjectCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Subject',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.subject),
                    ),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: descCtrl,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      labelText: 'Description',
                      border: OutlineInputBorder(),
                      alignLabelWithHint: true,
                    ),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 14),
                  DropdownButtonFormField<String>(
                    initialValue: category,
                    decoration: const InputDecoration(
                      labelText: 'Category',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.category_outlined),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'general', child: Text('General')),
                      DropdownMenuItem(
                          value: 'technical', child: Text('Technical')),
                      DropdownMenuItem(value: 'billing', child: Text('Billing')),
                      DropdownMenuItem(
                          value: 'installation', child: Text('Installation')),
                      DropdownMenuItem(value: 'other', child: Text('Other')),
                    ],
                    onChanged: (v) =>
                        setSheetState(() => category = v ?? 'general'),
                  ),
                  const SizedBox(height: 14),
                  DropdownButtonFormField<String>(
                    initialValue: priority,
                    decoration: const InputDecoration(
                      labelText: 'Priority',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.flag_outlined),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'low', child: Text('Low')),
                      DropdownMenuItem(value: 'medium', child: Text('Medium')),
                      DropdownMenuItem(value: 'high', child: Text('High')),
                      DropdownMenuItem(value: 'urgent', child: Text('Urgent')),
                    ],
                    onChanged: (v) =>
                        setSheetState(() => priority = v ?? 'medium'),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: FilledButton(
                      onPressed: () => _submitTicket(
                        formKey,
                        subjectCtrl.text.trim(),
                        descCtrl.text.trim(),
                        category,
                        priority,
                      ),
                      child: const Text('Submit Ticket'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _submitTicket(
    GlobalKey<FormState> formKey,
    String subject,
    String description,
    String category,
    String priority,
  ) async {
    if (!formKey.currentState!.validate()) return;
    Navigator.pop(context);

    try {
      await _service.createTicket({
        'subject': subject,
        'description': description,
        'category': category,
        'priority': priority,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ticket created successfully')),
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
    final shellLeading = ShellScaffoldScope.navigationLeading(context);
    return Scaffold(
      appBar: AppBar(
        leading: shellLeading,
        automaticallyImplyLeading: shellLeading == null,
        title: const Text('Support Tickets'),
        actions: ShellScaffoldScope.notificationActions(),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreateDialog,
        icon: const Icon(Icons.add),
        label: const Text('New Ticket'),
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.white,
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? _buildError()
                : _buildBody(),
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

  Widget _buildBody() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildFilterChips(),
        const SizedBox(height: 16),
        if (_tickets.isEmpty)
          const EmptyState(
            icon: Icons.support_agent,
            title: 'No Tickets Found',
            subtitle: 'Support tickets will appear here.',
          )
        else
          ..._tickets.map(_buildTicketCard),
      ],
    );
  }

  Widget _buildFilterChips() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: _filters.map((f) {
          final selected = _statusFilter == f;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              label: Text(_filterLabels[f]!),
              selected: selected,
              onSelected: (_) {
                setState(() => _statusFilter = f);
                _load();
              },
              selectedColor: AppColors.primary.withOpacity(0.15),
              checkmarkColor: AppColors.primary,
              labelStyle: TextStyle(
                color: selected ? AppColors.primary : AppColors.textSecondary,
                fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildTicketCard(SupportTicket t) {
    final user = context.read<AuthProvider>().user;
    final detailPath = (user?.isSuperAdmin == true)
        ? '/admin/support-tickets/${t.id}'
        : (user?.isCompanyAdmin == true || user?.isManager == true)
            ? '/dashboard/support-tickets/${t.id}'
            : '/employee/support-tickets/${t.id}';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 0,
      color: AppColors.surface,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.push(detailPath),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      t.subject,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  StatusBadge.fromStatus(t.status),
                ],
              ),
              if (t.description != null && t.description!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  t.description!,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  if (t.priority != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: _priorityColor(t.priority).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        t.priority!.toUpperCase(),
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: _priorityColor(t.priority),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                  ],
                  if (t.category != null) ...[
                    Icon(Icons.label_outline,
                        size: 14, color: AppColors.textSecondary),
                    const SizedBox(width: 3),
                    Text(
                      t.category!,
                      style: const TextStyle(
                          fontSize: 12, color: AppColors.textSecondary),
                    ),
                    const SizedBox(width: 10),
                  ],
                  const Spacer(),
                  Text(
                    t.createdAt != null ? _dateFmt.format(t.createdAt!) : '',
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
