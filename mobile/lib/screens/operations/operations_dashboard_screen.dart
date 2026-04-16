import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../models/approval.dart';
import '../../models/leave.dart';
import '../../models/expense.dart';
import '../../services/approvals_service.dart';
import '../../services/leave_service.dart';
import '../../services/expense_service.dart';
import '../../widgets/common/shell_scaffold_scope.dart';

/// Operations dashboard with tabs: Approvals | Leave | Expenses.
class OperationsDashboardScreen extends StatefulWidget {
  const OperationsDashboardScreen({super.key});

  @override
  State<OperationsDashboardScreen> createState() =>
      _OperationsDashboardScreenState();
}

class _OperationsDashboardScreenState extends State<OperationsDashboardScreen>
    with TickerProviderStateMixin {
  late final TabController _tabs;
  final _approvalsService = ApprovalsService();
  final _leaveService = LeaveService();
  final _expenseService = ExpenseService();

  // Approvals
  List<Approval> _approvals = [];
  List<Approval> _approvedApprovals = [];
  bool _approvalsLoading = true;

  // Leave
  List<LeaveRequest> _pendingLeaves = [];
  List<Approval> _approvedLeaves = [];
  bool _leavesLoading = true;

  // Expenses
  List<Expense> _pendingExpenses = [];
  List<Approval> _approvedExpenses = [];
  bool _expensesLoading = true;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _loadAll();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    _loadApprovals();
    _loadLeaves();
    _loadExpenses();
  }

  Future<void> _loadApprovals() async {
    setState(() => _approvalsLoading = true);
    try {
      final out = await Future.wait([
        _approvalsService.listApprovals(status: 'pending'),
        _approvalsService.listApprovals(status: 'approved'),
      ]);
      _approvals = out[0];
      _approvedApprovals = out[1];
    } catch (e) {
      debugPrint('Approvals load error: $e');
    }
    if (mounted) setState(() => _approvalsLoading = false);
  }

  Future<void> _loadLeaves() async {
    setState(() => _leavesLoading = true);
    try {
      final out = await Future.wait([
        _leaveService.getPendingLeaves(),
        _approvalsService.listApprovals(type: 'leave', status: 'approved'),
      ]);
      _pendingLeaves = out[0] as List<LeaveRequest>;
      _approvedLeaves = out[1] as List<Approval>;
    } catch (e) {
      debugPrint('Approvals load error: $e');
    }
    if (mounted) setState(() => _leavesLoading = false);
  }

  Future<void> _loadExpenses() async {
    setState(() => _expensesLoading = true);
    try {
      final out = await Future.wait([
        _expenseService.getPendingExpenses(),
        _approvalsService.listApprovals(type: 'expense', status: 'approved'),
      ]);
      _pendingExpenses = out[0] as List<Expense>;
      _approvedExpenses = out[1] as List<Approval>;
    } catch (e) {
      debugPrint('Approvals load error: $e');
    }
    if (mounted) setState(() => _expensesLoading = false);
  }

  String _fmtDate(DateTime? dt) {
    if (dt == null) return '-';
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  Widget _sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w700,
          color: AppColors.textSecondary,
          letterSpacing: 0.2,
        ),
      ),
    );
  }

  Future<String?> _askReviewComment({
    required String action,
    required bool requiredComment,
  }) async {
    if (!mounted) return null;
    String draft = '';
    String? errorText;
    final result = await showDialog<String>(
      context: context,
      barrierDismissible: true,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (dialogContext, setDialogState) {
            return AlertDialog(
              title: Text(
                action == 'approve' ? 'Approve Request' : 'Reject Request',
              ),
              content: TextField(
                maxLines: 3,
                autofocus: true,
                onChanged: (value) {
                  draft = value;
                  if (errorText != null && value.trim().isNotEmpty) {
                    setDialogState(() => errorText = null);
                  }
                },
                decoration: InputDecoration(
                  labelText: requiredComment
                      ? 'Comment *'
                      : 'Comment (optional)',
                  hintText: 'Enter your note...',
                  border: const OutlineInputBorder(),
                  errorText: errorText,
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(dialogContext).pop(null),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: () {
                    final trimmed = draft.trim();
                    if (requiredComment && trimmed.isEmpty) {
                      setDialogState(() => errorText = 'Comment is required');
                      return;
                    }
                    Navigator.of(dialogContext).pop(trimmed);
                  },
                  child: const Text('Submit'),
                ),
              ],
            );
          },
        );
      },
    );
    return result;
  }

  Future<void> _decideApproval(String type, int id, String action) async {
    try {
      final reviewAction = action == 'approve' ? 'approved' : 'rejected';
      final comment = await _askReviewComment(
        action: action,
        requiredComment: true,
      );
      if (!mounted || comment == null) return;
      await _approvalsService.decide(type, id, reviewAction, comment);
      _loadApprovals();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${action == 'approve' ? 'Approved' : 'Rejected'}'),
          backgroundColor: action == 'approve'
              ? AppColors.success
              : AppColors.danger,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed: $e')));
    }
  }

  Future<void> _reviewLeave(int id, String action) async {
    try {
      final reviewAction = action == 'approve' ? 'approved' : 'rejected';
      final comment = await _askReviewComment(
        action: action,
        requiredComment: false,
      );
      if (!mounted || comment == null) return;
      await _leaveService.reviewLeave(
        id,
        reviewAction,
        note: comment.isEmpty ? null : comment,
      );
      _loadLeaves();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Leave ${action == 'approve' ? 'approved' : 'rejected'}',
          ),
          backgroundColor: action == 'approve'
              ? AppColors.success
              : AppColors.danger,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed: $e')));
    }
  }

  Future<void> _reviewExpense(int id, String action) async {
    try {
      final reviewAction = action == 'approve' ? 'approved' : 'rejected';
      final comment = await _askReviewComment(
        action: action,
        requiredComment: false,
      );
      if (!mounted || comment == null) return;
      await _expenseService.reviewExpense(
        id,
        reviewAction,
        comment: comment.isEmpty ? null : comment,
      );
      _loadExpenses();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Expense ${action == 'approve' ? 'approved' : 'rejected'}',
          ),
          backgroundColor: action == 'approve'
              ? AppColors.success
              : AppColors.danger,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final shellLeading = ShellScaffoldScope.navigationLeading(context);

    return Scaffold(
      appBar: AppBar(
        leading: shellLeading,
        automaticallyImplyLeading: shellLeading == null,
        title: const Text('Operations'),
        bottom: TabBar(
          controller: _tabs,
          indicatorColor: Colors.white,
          indicatorWeight: 3,
          indicatorSize: TabBarIndicatorSize.label,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          labelStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
          unselectedLabelStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
          tabs: [
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Approvals'),
                  if (!_approvalsLoading && _approvals.isNotEmpty) ...[
                    const SizedBox(width: 6),
                    _badge('${_approvals.length}'),
                  ],
                ],
              ),
            ),
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Leave'),
                  if (!_leavesLoading && _pendingLeaves.isNotEmpty) ...[
                    const SizedBox(width: 6),
                    _badge('${_pendingLeaves.length}'),
                  ],
                ],
              ),
            ),
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Expenses'),
                  if (!_expensesLoading && _pendingExpenses.isNotEmpty) ...[
                    const SizedBox(width: 6),
                    _badge('${_pendingExpenses.length}'),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [_buildApprovals(), _buildLeaves(), _buildExpenses()],
      ),
    );
  }

  Widget _badge(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.danger,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  Widget _buildApprovals() {
    if (_approvalsLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }
    if (_approvals.isEmpty && _approvedApprovals.isEmpty) {
      return _buildEmpty('No approval requests', Icons.check_circle_outline);
    }
    return RefreshIndicator(
      onRefresh: _loadApprovals,
      color: AppColors.primary,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_approvals.isNotEmpty) ...[
            _sectionTitle('Pending'),
            ..._approvals.map((a) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _ApprovalCard(
                  title: a.employeeName.isNotEmpty
                      ? a.employeeName
                      : 'Approval #${a.id}',
                  subtitle: a.description ?? a.reason ?? a.category ?? '',
                  type: a.type,
                  status: a.status,
                  onApprove: () => _decideApproval(a.type, a.id, 'approve'),
                  onReject: () => _decideApproval(a.type, a.id, 'reject'),
                ),
              );
            }),
          ],
          if (_approvedApprovals.isNotEmpty) ...[
            _sectionTitle('Approved'),
            ..._approvedApprovals.map((a) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _ApprovalCard(
                  title: a.employeeName.isNotEmpty
                      ? a.employeeName
                      : 'Approval #${a.id}',
                  subtitle: a.description ?? a.reason ?? a.category ?? '',
                  type: a.type,
                  status: a.status,
                  reviewerNote: a.reviewerNote,
                ),
              );
            }),
          ],
        ],
      ),
    );
  }

  Widget _buildLeaves() {
    if (_leavesLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }
    if (_pendingLeaves.isEmpty && _approvedLeaves.isEmpty) {
      return _buildEmpty('No leave requests', Icons.beach_access_outlined);
    }
    return RefreshIndicator(
      onRefresh: _loadLeaves,
      color: AppColors.primary,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_pendingLeaves.isNotEmpty) ...[
            _sectionTitle('Pending'),
            ..._pendingLeaves.map((l) {
              final startStr = _fmtDate(l.startDate);
              final endStr = _fmtDate(l.endDate);
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _ApprovalCard(
                  title: 'Leave Request #${l.id}',
                  subtitle: '${l.leaveType} • $startStr -> $endStr',
                  type: 'leave',
                  status: 'pending',
                  onApprove: () => _reviewLeave(l.id, 'approve'),
                  onReject: () => _reviewLeave(l.id, 'reject'),
                ),
              );
            }),
          ],
          if (_approvedLeaves.isNotEmpty) ...[
            _sectionTitle('Approved'),
            ..._approvedLeaves.map((l) {
              final startStr = _fmtDate(l.startDate);
              final endStr = _fmtDate(l.endDate);
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _ApprovalCard(
                  title: l.employeeName.isNotEmpty
                      ? l.employeeName
                      : 'Leave Request #${l.id}',
                  subtitle: '${l.leaveType ?? 'leave'} • $startStr -> $endStr',
                  type: 'leave',
                  status: l.status,
                  reviewerNote: l.reviewerNote,
                ),
              );
            }),
          ],
        ],
      ),
    );
  }

  Widget _buildExpenses() {
    if (_expensesLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }
    if (_pendingExpenses.isEmpty && _approvedExpenses.isEmpty) {
      return _buildEmpty('No expense requests', Icons.receipt_long_outlined);
    }
    return RefreshIndicator(
      onRefresh: _loadExpenses,
      color: AppColors.primary,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_pendingExpenses.isNotEmpty) ...[
            _sectionTitle('Pending'),
            ..._pendingExpenses.map((e) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _ApprovalCard(
                  title: e.category.isNotEmpty
                      ? e.category
                      : 'Expense #${e.id}',
                  subtitle:
                      '\$${e.amount.toStringAsFixed(2)} • ${e.description ?? ''}',
                  type: 'expense',
                  status: 'pending',
                  onApprove: () => _reviewExpense(e.id, 'approve'),
                  onReject: () => _reviewExpense(e.id, 'reject'),
                ),
              );
            }),
          ],
          if (_approvedExpenses.isNotEmpty) ...[
            _sectionTitle('Approved'),
            ..._approvedExpenses.map((e) {
              final amount = e.amount ?? 0;
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _ApprovalCard(
                  title: e.category?.isNotEmpty == true
                      ? e.category!
                      : 'Expense #${e.id}',
                  subtitle:
                      '\$${amount.toStringAsFixed(2)} • ${e.description ?? ''}',
                  type: 'expense',
                  status: e.status,
                  reviewerNote: e.reviewerNote,
                ),
              );
            }),
          ],
        ],
      ),
    );
  }

  Widget _buildEmpty(String message, IconData icon) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 48, color: AppColors.textSecondary.withOpacity(0.4)),
          const SizedBox(height: 12),
          Text(
            message,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 15,
            ),
          ),
        ],
      ),
    );
  }
}

class _ApprovalCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final String type;
  final String status;
  final String? reviewerNote;
  final VoidCallback? onApprove;
  final VoidCallback? onReject;

  const _ApprovalCard({
    required this.title,
    required this.subtitle,
    required this.type,
    required this.status,
    this.reviewerNote,
    this.onApprove,
    this.onReject,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: _typeColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  type.toUpperCase(),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: _typeColor,
                  ),
                ),
              ),
              const Spacer(),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            title,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 14,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
          ),
          if (reviewerNote != null && reviewerNote!.trim().isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              'Comment: ${reviewerNote!.trim()}',
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
          if (onApprove != null && onReject != null) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: onReject,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.danger,
                      side: const BorderSide(color: AppColors.danger),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                    child: const Text(
                      'Reject',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton(
                    onPressed: onApprove,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.success,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                    child: const Text(
                      'Approve',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              ],
            ),
          ] else ...[
            const SizedBox(height: 8),
            Text(
              status.toUpperCase(),
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: status == 'approved'
                    ? AppColors.success
                    : AppColors.textSecondary,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Color get _typeColor {
    switch (type) {
      case 'leave':
        return AppColors.info;
      case 'expense':
        return AppColors.warning;
      default:
        return AppColors.primary;
    }
  }
}
