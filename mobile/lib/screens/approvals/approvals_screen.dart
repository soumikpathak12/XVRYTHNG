import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_colors.dart';
import '../../models/approval.dart';
import '../../models/expense.dart';
import '../../services/approvals_service.dart';
import '../../widgets/common/empty_state.dart';
import '../../widgets/common/loading_overlay.dart';
import '../../widgets/common/shell_scaffold_scope.dart';
import '../../widgets/common/status_badge.dart';

class ApprovalsScreen extends StatefulWidget {
  const ApprovalsScreen({super.key});

  @override
  State<ApprovalsScreen> createState() => _ApprovalsScreenState();
}

class _ApprovalsScreenState extends State<ApprovalsScreen>
    with SingleTickerProviderStateMixin {
  final _service = ApprovalsService();

  List<Approval> _approvals = [];
  ApprovalCounts _counts = ApprovalCounts();

  bool _loading = true;
  bool _actionLoading = false;
  String? _error;

  late final TabController _tabController;
  String _statusFilter = 'pending';

  static const _typeFilters = ['all', 'leave', 'expense', 'attendance'];
  static const _typeLabels = ['All', 'Leave', 'Expense', 'Attendance'];
  static const _statusOptions = ['pending', 'approved', 'rejected'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _typeFilters.length, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) _fetchApprovals();
    });
    _loadAll();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  String? get _activeType {
    final t = _typeFilters[_tabController.index];
    return t == 'all' ? null : t;
  }

  Future<void> _loadAll() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _service.listApprovals(type: _activeType, status: _statusFilter),
        _service.getPendingCount(),
      ]);
      _approvals = results[0] as List<Approval>;
      _counts = results[1] as ApprovalCounts;
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _fetchApprovals() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      _approvals = await _service.listApprovals(
          type: _activeType, status: _statusFilter);
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _handleDecision(Approval item, String action) async {
    final comment = await _showCommentDialog(action);
    if (comment == null) return;

    setState(() => _actionLoading = true);
    try {
      await _service.decide(item.type, item.id, action, comment);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                '${action == 'approve' ? 'Approved' : 'Rejected'} successfully'),
            backgroundColor:
                action == 'approve' ? AppColors.success : AppColors.danger,
          ),
        );
      }
      _loadAll();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Failed: $e'),
              backgroundColor: AppColors.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<String?> _showCommentDialog(String action) async {
    final ctrl = TextEditingController();
    final formKey = GlobalKey<FormState>();

    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          action == 'approve' ? 'Approve Request' : 'Reject Request',
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        content: Form(
          key: formKey,
          child: TextFormField(
            controller: ctrl,
            maxLines: 3,
            decoration: const InputDecoration(
              labelText: 'Reviewer Comment',
              hintText: 'Enter your review comments...',
              border: OutlineInputBorder(),
            ),
            validator: (v) => (v == null || v.trim().isEmpty)
                ? 'Comment is required'
                : null,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor:
                  action == 'approve' ? AppColors.success : AppColors.danger,
            ),
            onPressed: () {
              if (formKey.currentState!.validate()) {
                Navigator.pop(ctx, ctrl.text.trim());
              }
            },
            child: Text(action == 'approve' ? 'Approve' : 'Reject'),
          ),
        ],
      ),
    );
  }

  int _countForTab(int index) {
    switch (index) {
      case 0:
        return _counts.pending;
      case 1:
        return _counts.leave;
      case 2:
        return _counts.expense;
      case 3:
        return _counts.attendance;
      default:
        return 0;
    }
  }

  @override
  Widget build(BuildContext context) {
    final shellLeading = ShellScaffoldScope.navigationLeading(context);
    return Scaffold(
      appBar: AppBar(
        leading: shellLeading,
        automaticallyImplyLeading: shellLeading == null,
        title: const Text('Approvals'),
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.white,
        actions: ShellScaffoldScope.notificationActions(),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: TabBar(
            controller: _tabController,
            isScrollable: true,
            indicatorColor: AppColors.white,
            labelColor: AppColors.white,
            unselectedLabelColor: Colors.white70,
            tabAlignment: TabAlignment.start,
            tabs: List.generate(_typeFilters.length, (i) {
              final count = _countForTab(i);
              return Tab(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(_typeLabels[i]),
                    if (count > 0) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.white.withOpacity(0.25),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '$count',
                          style: const TextStyle(
                              fontSize: 11, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ],
                ),
              );
            }),
          ),
        ),
      ),
      body: LoadingOverlay(
        isLoading: _actionLoading,
        message: 'Processing...',
        child: Column(
          children: [
            _buildStatusChips(),
            Expanded(
              child: _loading
                  ? const Center(
                      child:
                          CircularProgressIndicator(color: AppColors.primary))
                  : _error != null
                      ? _buildError()
                      : _approvals.isEmpty
                          ? EmptyState(
                              icon: Icons.task_alt_rounded,
                              title: 'No Approvals',
                              subtitle:
                                  'No ${_statusFilter} items to show.',
                            )
                          : RefreshIndicator(
                              color: AppColors.primary,
                              onRefresh: _loadAll,
                              child: ListView.separated(
                                padding: const EdgeInsets.fromLTRB(
                                    16, 8, 16, 16),
                                itemCount: _approvals.length,
                                separatorBuilder: (_, __) =>
                                    const SizedBox(height: 10),
                                itemBuilder: (_, i) =>
                                    _approvalCard(_approvals[i]),
                              ),
                            ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChips() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: _statusOptions.map((s) {
          final selected = _statusFilter == s;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              selected: selected,
              label: Text(_capitalize(s)),
              selectedColor: AppColors.primary.withOpacity(0.15),
              checkmarkColor: AppColors.primary,
              labelStyle: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 13,
                color: selected ? AppColors.primary : AppColors.textSecondary,
              ),
              onSelected: (_) {
                setState(() => _statusFilter = s);
                _fetchApprovals();
              },
            ),
          );
        }).toList(),
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
            const Icon(Icons.error_outline, size: 48, color: AppColors.danger),
            const SizedBox(height: 12),
            Text(_error!, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: _loadAll,
              icon: const Icon(Icons.refresh, size: 18),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  // ──────────────────── APPROVAL CARD ────────────────────

  Widget _approvalCard(Approval a) {
    return _ExpandableApprovalCard(
      approval: a,
      onApprove:
          a.status == 'pending' ? () => _handleDecision(a, 'approve') : null,
      onReject:
          a.status == 'pending' ? () => _handleDecision(a, 'reject') : null,
      categoryIcon: _typeIcon(a.type),
      categoryColor: _typeColor(a.type),
    );
  }

  IconData _typeIcon(String type) {
    switch (type) {
      case 'leave':
        return Icons.beach_access_rounded;
      case 'expense':
        return Icons.receipt_long_rounded;
      case 'attendance':
        return Icons.schedule_rounded;
      default:
        return Icons.assignment_rounded;
    }
  }

  Color _typeColor(String type) {
    switch (type) {
      case 'leave':
        return AppColors.info;
      case 'expense':
        return const Color(0xFFE67E22);
      case 'attendance':
        return AppColors.primary;
      default:
        return AppColors.textSecondary;
    }
  }

  String _capitalize(String s) =>
      s.isEmpty ? '' : '${s[0].toUpperCase()}${s.substring(1)}';
}

// ──────────────────── EXPANDABLE CARD WIDGET ────────────────────

class _ExpandableApprovalCard extends StatefulWidget {
  final Approval approval;
  final VoidCallback? onApprove;
  final VoidCallback? onReject;
  final IconData categoryIcon;
  final Color categoryColor;

  const _ExpandableApprovalCard({
    required this.approval,
    this.onApprove,
    this.onReject,
    required this.categoryIcon,
    required this.categoryColor,
  });

  @override
  State<_ExpandableApprovalCard> createState() =>
      _ExpandableApprovalCardState();
}

class _ExpandableApprovalCardState extends State<_ExpandableApprovalCard> {
  bool _expanded = false;

  Approval get a => widget.approval;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => setState(() => _expanded = !_expanded),
        child: AnimatedSize(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeInOut,
          alignment: Alignment.topCenter,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _header(),
              if (_expanded) ...[
                const Divider(height: 1),
                _details(),
                if (widget.onApprove != null || widget.onReject != null)
                  _actions(),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _header() {
    return Padding(
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: widget.categoryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(widget.categoryIcon,
                color: widget.categoryColor, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  a.employeeName,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: widget.categoryColor.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        a.type.toUpperCase(),
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: widget.categoryColor,
                        ),
                      ),
                    ),
                    if (a.employeeCode != null) ...[
                      const SizedBox(width: 8),
                      Text(
                        a.employeeCode!,
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              StatusBadge.fromStatus(a.status),
              const SizedBox(height: 4),
              if (a.createdAt != null)
                Text(
                  DateFormat('dd MMM').format(a.createdAt!),
                  style: const TextStyle(
                      fontSize: 11, color: AppColors.textSecondary),
                ),
            ],
          ),
          const SizedBox(width: 4),
          Icon(
            _expanded
                ? Icons.keyboard_arrow_up_rounded
                : Icons.keyboard_arrow_down_rounded,
            color: AppColors.textSecondary,
            size: 22,
          ),
        ],
      ),
    );
  }

  Widget _details() {
    switch (a.type) {
      case 'leave':
        return _leaveDetails();
      case 'expense':
        return _expenseDetails();
      case 'attendance':
        return _attendanceDetails();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _leaveDetails() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 4),
      child: Column(
        children: [
          _detailRow('Leave Type',
              _leaveLabel(a.leaveType ?? 'annual')),
          _detailRow(
              'Period',
              a.startDate != null && a.endDate != null
                  ? '${DateFormat('dd MMM').format(a.startDate!)} – ${DateFormat('dd MMM yyyy').format(a.endDate!)}'
                  : '-'),
          _detailRow(
              'Days', '${a.daysCount ?? '-'}'),
          if (a.reason != null && a.reason!.isNotEmpty)
            _detailRow('Reason', a.reason!),
          if (a.companyName != null)
            _detailRow('Company', a.companyName!),
          if (a.reviewerNote != null && a.reviewerNote!.isNotEmpty)
            _reviewerBox(a.reviewerNote!),
        ],
      ),
    );
  }

  Widget _expenseDetails() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 4),
      child: Column(
        children: [
          _detailRow('Category',
              Expense.categoryLabels[a.category] ?? (a.category ?? '-')),
          _detailRow(
              'Amount',
              a.amount != null
                  ? '${a.currency ?? 'AUD'} \$${a.amount!.toStringAsFixed(2)}'
                  : '-'),
          if (a.expenseDate != null)
            _detailRow(
                'Date', DateFormat('dd MMM yyyy').format(a.expenseDate!)),
          if (a.description != null && a.description!.isNotEmpty)
            _detailRow('Description', a.description!),
          if (a.projectName != null)
            _detailRow('Project', a.projectName!),
          if (a.companyName != null)
            _detailRow('Company', a.companyName!),
          if (a.reviewerNote != null && a.reviewerNote!.isNotEmpty)
            _reviewerBox(a.reviewerNote!),
        ],
      ),
    );
  }

  Widget _attendanceDetails() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 4),
      child: Column(
        children: [
          _detailRow(
              'Original Check-In', _fmtTime(a.origCheckIn)),
          _detailRow(
              'Original Check-Out', _fmtTime(a.origCheckOut)),
          if (a.origHours != null)
            _detailRow(
                'Original Hours', '${a.origHours!.toStringAsFixed(1)}h'),
          const Divider(height: 16),
          _detailRow(
              'Requested Check-In', _fmtTime(a.reqCheckIn)),
          _detailRow(
              'Requested Check-Out', _fmtTime(a.reqCheckOut)),
          if (a.reason != null && a.reason!.isNotEmpty)
            _detailRow('Reason', a.reason!),
          if (a.companyName != null)
            _detailRow('Company', a.companyName!),
          if (a.reviewerNote != null && a.reviewerNote!.isNotEmpty)
            _reviewerBox(a.reviewerNote!),
        ],
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(
              label,
              style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textSecondary),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary),
            ),
          ),
        ],
      ),
    );
  }

  Widget _reviewerBox(String note) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 4, bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppColors.info.withOpacity(0.06),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.info.withOpacity(0.2)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.comment_rounded, size: 16, color: AppColors.info),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              note,
              style: const TextStyle(fontSize: 13, color: AppColors.info),
            ),
          ),
        ],
      ),
    );
  }

  Widget _actions() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 4, 14, 14),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.danger,
                side: const BorderSide(color: AppColors.danger),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              onPressed: widget.onReject,
              icon: const Icon(Icons.close_rounded, size: 18),
              label: const Text('Reject',
                  style: TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.success,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              onPressed: widget.onApprove,
              icon: const Icon(Icons.check_rounded, size: 18),
              label: const Text('Approve',
                  style: TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
    );
  }

  String _fmtTime(String? raw) {
    if (raw == null) return '--:--';
    try {
      return DateFormat.jm().format(DateTime.parse(raw));
    } catch (_) {
      return raw;
    }
  }

  String _leaveLabel(String key) {
    const map = {
      'annual': 'Annual Leave',
      'sick': 'Sick Leave',
      'personal': 'Personal Leave',
      'unpaid': 'Unpaid Leave',
      'other': 'Other',
    };
    return map[key] ?? key;
  }
}

