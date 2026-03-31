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
  bool _approvalsLoading = true;

  // Leave
  List<LeaveRequest> _pendingLeaves = [];
  bool _leavesLoading = true;

  // Expenses
  List<Expense> _pendingExpenses = [];
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
      _approvals = await _approvalsService.listApprovals(status: 'pending');
    } catch (e) {
      debugPrint('Approvals load error: $e');
    }
    if (mounted) setState(() => _approvalsLoading = false);
  }

  Future<void> _loadLeaves() async {
    setState(() => _leavesLoading = true);
    try {
      _pendingLeaves = await _leaveService.getPendingLeaves();
    } catch (e) {
      debugPrint('Approvals load error: $e');
    }
    if (mounted) setState(() => _leavesLoading = false);
  }

  Future<void> _loadExpenses() async {
    setState(() => _expensesLoading = true);
    try {
      _pendingExpenses = await _expenseService.getPendingExpenses();
    } catch (e) {
      debugPrint('Approvals load error: $e');
    }
    if (mounted) setState(() => _expensesLoading = false);
  }

  Future<void> _decideApproval(
      String type, int id, String action) async {
    try {
      await _approvalsService.decide(type, id, action, '');
      _loadApprovals();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('${action == 'approve' ? 'Approved' : 'Rejected'}'),
        backgroundColor:
            action == 'approve' ? AppColors.success : AppColors.danger,
      ));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed: $e')),
      );
    }
  }

  Future<void> _reviewLeave(int id, String action) async {
    try {
      await _leaveService.reviewLeave(id, action);
      _loadLeaves();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(
            'Leave ${action == 'approve' ? 'approved' : 'rejected'}'),
        backgroundColor:
            action == 'approve' ? AppColors.success : AppColors.danger,
      ));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed: $e')),
      );
    }
  }

  Future<void> _reviewExpense(int id, String action) async {
    try {
      await _expenseService.reviewExpense(id, action);
      _loadExpenses();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(
            'Expense ${action == 'approve' ? 'approved' : 'rejected'}'),
        backgroundColor:
            action == 'approve' ? AppColors.success : AppColors.danger,
      ));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed: $e')),
      );
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
          indicatorColor: AppColors.primary,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSecondary,
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
            )),
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
            )),
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
            )),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [
          _buildApprovals(),
          _buildLeaves(),
          _buildExpenses(),
        ],
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
            color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
      ),
    );
  }

  Widget _buildApprovals() {
    if (_approvalsLoading) {
      return const Center(
          child: CircularProgressIndicator(color: AppColors.primary));
    }
    if (_approvals.isEmpty) {
      return _buildEmpty('No pending approvals', Icons.check_circle_outline);
    }
    return RefreshIndicator(
      onRefresh: _loadApprovals,
      color: AppColors.primary,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _approvals.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) {
          final a = _approvals[i];
          return _ApprovalCard(
            title: a.employeeName.isNotEmpty ? a.employeeName : 'Approval #${a.id}',
            subtitle: a.description ?? a.reason ?? a.category ?? '',
            type: a.type,
            onApprove: () =>
                _decideApproval(a.type, a.id, 'approve'),
            onReject: () =>
                _decideApproval(a.type, a.id, 'reject'),
          );
        },
      ),
    );
  }

  Widget _buildLeaves() {
    if (_leavesLoading) {
      return const Center(
          child: CircularProgressIndicator(color: AppColors.primary));
    }
    if (_pendingLeaves.isEmpty) {
      return _buildEmpty(
          'No pending leave requests', Icons.beach_access_outlined);
    }
    return RefreshIndicator(
      onRefresh: _loadLeaves,
      color: AppColors.primary,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _pendingLeaves.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) {
          final l = _pendingLeaves[i];
          final startStr = '${l.startDate.day}/${l.startDate.month}/${l.startDate.year}';
          final endStr = '${l.endDate.day}/${l.endDate.month}/${l.endDate.year}';
          return _ApprovalCard(
            title: 'Leave Request #${l.id}',
            subtitle:
                '${l.leaveType} • $startStr → $endStr',
            type: 'leave',
            onApprove: () => _reviewLeave(l.id, 'approve'),
            onReject: () => _reviewLeave(l.id, 'reject'),
          );
        },
      ),
    );
  }

  Widget _buildExpenses() {
    if (_expensesLoading) {
      return const Center(
          child: CircularProgressIndicator(color: AppColors.primary));
    }
    if (_pendingExpenses.isEmpty) {
      return _buildEmpty(
          'No pending expenses', Icons.receipt_long_outlined);
    }
    return RefreshIndicator(
      onRefresh: _loadExpenses,
      color: AppColors.primary,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _pendingExpenses.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) {
          final e = _pendingExpenses[i];
          return _ApprovalCard(
            title: e.category.isNotEmpty ? e.category : 'Expense #${e.id}',
            subtitle: '\$${e.amount.toStringAsFixed(2)} • ${e.description ?? ''}',
            type: 'expense',
            onApprove: () => _reviewExpense(e.id, 'approve'),
            onReject: () => _reviewExpense(e.id, 'reject'),
          );
        },
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
          Text(message,
              style: const TextStyle(
                  color: AppColors.textSecondary, fontSize: 15)),
        ],
      ),
    );
  }
}

class _ApprovalCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final String type;
  final VoidCallback onApprove;
  final VoidCallback onReject;

  const _ApprovalCard({
    required this.title,
    required this.subtitle,
    required this.type,
    required this.onApprove,
    required this.onReject,
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
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
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
                fontSize: 12, color: AppColors.textSecondary),
          ),
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
                        borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  child: const Text('Reject',
                      style: TextStyle(fontWeight: FontWeight.w600)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  onPressed: onApprove,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.success,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  child: const Text('Approve',
                      style: TextStyle(fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
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
