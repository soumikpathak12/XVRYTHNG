import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_colors.dart';
import '../../models/leave.dart';
import '../../services/leave_service.dart';
import '../../widgets/common/empty_state.dart';
import '../../widgets/common/loading_overlay.dart';
import '../../widgets/common/shell_scaffold_scope.dart';
import '../../widgets/common/status_badge.dart';

class LeaveScreen extends StatefulWidget {
  const LeaveScreen({super.key});

  @override
  State<LeaveScreen> createState() => _LeaveScreenState();
}

class _LeaveScreenState extends State<LeaveScreen> {
  final _service = LeaveService();

  List<LeaveBalance> _balances = [];
  List<LeaveRequest> _requests = [];

  bool _loading = true;
  bool _actionLoading = false;
  String? _error;

  // Form controllers
  final _formKey = GlobalKey<FormState>();
  String _selectedType = 'annual';
  DateTime? _startDate;
  DateTime? _endDate;
  final _reasonCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  @override
  void dispose() {
    _reasonCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _service.getBalances(),
        _service.getMyLeaves(),
      ]);
      _balances = results[0] as List<LeaveBalance>;
      _requests = results[1] as List<LeaveRequest>;
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submitLeave() async {
    if (!_formKey.currentState!.validate()) return;
    if (_startDate == null || _endDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Please select start and end dates'),
            backgroundColor: AppColors.danger),
      );
      return;
    }
    if (_endDate!.isBefore(_startDate!)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('End date must be after start date'),
            backgroundColor: AppColors.danger),
      );
      return;
    }

    setState(() => _actionLoading = true);
    try {
      await _service.applyLeave({
        'leave_type': _selectedType,
        'start_date': DateFormat('yyyy-MM-dd').format(_startDate!),
        'end_date': DateFormat('yyyy-MM-dd').format(_endDate!),
        'reason': _reasonCtrl.text.trim(),
      });
      _resetForm();
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Leave request submitted'),
              backgroundColor: AppColors.success),
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

  Future<void> _cancelLeave(int id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Leave?'),
        content: const Text(
            'Are you sure you want to cancel this leave request?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('No')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Yes, Cancel'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _actionLoading = true);
    try {
      await _service.cancelLeave(id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Leave cancelled'),
              backgroundColor: AppColors.success),
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

  void _resetForm() {
    _selectedType = 'annual';
    _startDate = null;
    _endDate = null;
    _reasonCtrl.clear();
  }

  @override
  Widget build(BuildContext context) {
    const showDrawerWithBack = true;
    final shellLeading = ShellScaffoldScope.navigationLeading(
      context,
      showDrawerWithBack: showDrawerWithBack,
    );
    return Scaffold(
      appBar: AppBar(
        leading: shellLeading,
        leadingWidth: ShellScaffoldScope.navigationLeadingWidth(
          context,
          showDrawerWithBack: showDrawerWithBack,
        ),
        automaticallyImplyLeading: shellLeading == null,
        title: const Text('Leave Management'),
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.white,
        actions: ShellScaffoldScope.notificationActions(),
      ),
      body: LoadingOverlay(
        isLoading: _actionLoading,
        message: 'Submitting...',
        child: _loading
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.primary))
            : _error != null
                ? _buildError()
                : RefreshIndicator(
                    color: AppColors.primary,
                    onRefresh: _loadAll,
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        _buildBalanceCards(),
                        const SizedBox(height: 16),
                        _buildApplyButton(),
                        const SizedBox(height: 20),
                        _buildHistoryHeader(),
                        const SizedBox(height: 10),
                        if (_requests.isEmpty)
                          const Padding(
                            padding: EdgeInsets.only(top: 40),
                            child: EmptyState(
                              icon: Icons.beach_access_rounded,
                              title: 'No Leave Requests',
                              subtitle:
                                  'Your leave request history will appear here.',
                            ),
                          )
                        else
                          ..._requests.map(_leaveCard),
                      ],
                    ),
                  ),
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

  // ──────────────────── BALANCE CARDS ────────────────────

  Widget _buildBalanceCards() {
    final types = ['annual', 'sick', 'personal'];
    final icons = [
      Icons.wb_sunny_rounded,
      Icons.medical_services_rounded,
      Icons.person_rounded,
    ];
    final colors = [AppColors.primary, AppColors.danger, AppColors.info];

    return Row(
      children: List.generate(types.length, (i) {
        final bal = _balances.firstWhere(
          (b) => b.type.toLowerCase() == types[i],
          orElse: () =>
              LeaveBalance(type: types[i], entitled: 0, used: 0, remaining: 0),
        );
        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(
                left: i == 0 ? 0 : 5, right: i == types.length - 1 ? 0 : 5),
            child: _balanceCard(bal, icons[i], colors[i]),
          ),
        );
      }),
    );
  }

  Widget _balanceCard(LeaveBalance bal, IconData icon, Color color) {
    final label = LeaveRequest.leaveTypes[bal.type.toLowerCase()] ??
        bal.type.replaceRange(0, 1, bal.type[0].toUpperCase());
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(height: 10),
            Text(
              bal.remaining.toStringAsFixed(0),
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: color,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              'of ${bal.entitled.toStringAsFixed(0)}',
              style: const TextStyle(
                  fontSize: 11, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  // ──────────────────── APPLY BUTTON ────────────────────

  Widget _buildApplyButton() {
    return SizedBox(
      width: double.infinity,
      height: 50,
      child: FilledButton.icon(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primary,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
        onPressed: _showApplySheet,
        icon: const Icon(Icons.add_rounded, size: 20),
        label: const Text('Apply for Leave',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
      ),
    );
  }

  // ──────────────────── HISTORY ────────────────────

  Widget _buildHistoryHeader() {
    return Row(
      children: [
        const Icon(Icons.history_rounded, size: 20, color: AppColors.primary),
        const SizedBox(width: 8),
        const Expanded(
          child: Text(
            'Leave History',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
        ),
        Text(
          '${_requests.length} records',
          style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
        ),
      ],
    );
  }

  Widget _leaveCard(LeaveRequest r) {
    final typeLabel =
        LeaveRequest.leaveTypes[r.leaveType] ?? r.leaveType;
    return Card(
      elevation: 1,
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    typeLabel,
                    style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                        color: AppColors.textPrimary),
                  ),
                ),
                StatusBadge.fromStatus(r.status),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.date_range_rounded,
                    size: 16, color: AppColors.textSecondary),
                const SizedBox(width: 6),
                Text(
                  '${DateFormat('dd MMM').format(r.startDate)} – ${DateFormat('dd MMM yyyy').format(r.endDate)}',
                  style: const TextStyle(
                      fontSize: 13, color: AppColors.textSecondary),
                ),
                const Spacer(),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    '${r.daysCount} day${r.daysCount != 1 ? 's' : ''}',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ],
            ),
            if (r.reason != null && r.reason!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                r.reason!,
                style: const TextStyle(
                    fontSize: 13, color: AppColors.textSecondary),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            if (r.status == 'pending') ...[
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  style: TextButton.styleFrom(foregroundColor: AppColors.danger),
                  onPressed: () => _cancelLeave(r.id),
                  icon: const Icon(Icons.cancel_outlined, size: 18),
                  label: const Text('Cancel',
                      style: TextStyle(fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ──────────────────── APPLY SHEET ────────────────────

  void _showApplySheet() {
    _resetForm();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: _applyForm(),
      ),
    );
  }

  Widget _applyForm() {
    return StatefulBuilder(builder: (ctx, setSheetState) {
      return SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Apply for Leave',
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary),
                ),
                const SizedBox(height: 20),
                DropdownButtonFormField<String>(
                  value: _selectedType,
                  decoration: const InputDecoration(
                    labelText: 'Leave Type',
                    prefixIcon: Icon(Icons.category_rounded),
                    border: OutlineInputBorder(),
                  ),
                  items: LeaveRequest.leaveTypes.entries
                      .map((e) => DropdownMenuItem(
                          value: e.key, child: Text(e.value)))
                      .toList(),
                  onChanged: (v) {
                    if (v != null) setSheetState(() => _selectedType = v);
                  },
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        readOnly: true,
                        decoration: InputDecoration(
                          labelText: 'Start Date',
                          prefixIcon: const Icon(Icons.calendar_today_rounded),
                          border: const OutlineInputBorder(),
                          hintText: _startDate != null
                              ? DateFormat('dd/MM/yyyy').format(_startDate!)
                              : 'Select',
                        ),
                        controller: TextEditingController(
                          text: _startDate != null
                              ? DateFormat('dd/MM/yyyy').format(_startDate!)
                              : '',
                        ),
                        onTap: () async {
                          final picked = await showDatePicker(
                            context: ctx,
                            initialDate: _startDate ?? DateTime.now(),
                            firstDate: DateTime.now(),
                            lastDate: DateTime.now()
                                .add(const Duration(days: 365)),
                          );
                          if (picked != null) {
                            setSheetState(() => _startDate = picked);
                          }
                        },
                        validator: (_) =>
                            _startDate == null ? 'Select start date' : null,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        readOnly: true,
                        decoration: InputDecoration(
                          labelText: 'End Date',
                          prefixIcon: const Icon(Icons.event_rounded),
                          border: const OutlineInputBorder(),
                          hintText: _endDate != null
                              ? DateFormat('dd/MM/yyyy').format(_endDate!)
                              : 'Select',
                        ),
                        controller: TextEditingController(
                          text: _endDate != null
                              ? DateFormat('dd/MM/yyyy').format(_endDate!)
                              : '',
                        ),
                        onTap: () async {
                          final picked = await showDatePicker(
                            context: ctx,
                            initialDate:
                                _endDate ?? _startDate ?? DateTime.now(),
                            firstDate: _startDate ?? DateTime.now(),
                            lastDate: DateTime.now()
                                .add(const Duration(days: 365)),
                          );
                          if (picked != null) {
                            setSheetState(() => _endDate = picked);
                          }
                        },
                        validator: (_) =>
                            _endDate == null ? 'Select end date' : null,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _reasonCtrl,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Reason (required)',
                    alignLabelWithHint: true,
                    prefixIcon: Padding(
                        padding: EdgeInsets.only(bottom: 44),
                        child: Icon(Icons.notes_rounded)),
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) {
                      return 'Please enter a reason';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: _actionLoading ? null : _submitLeave,
                    child: const Text('Submit Request',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w600)),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    });
  }
}
