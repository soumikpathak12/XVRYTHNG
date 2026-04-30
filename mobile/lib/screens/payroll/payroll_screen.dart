import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_colors.dart';
import '../../models/payroll_run.dart';
import '../../services/payroll_service.dart';
import '../../widgets/common/empty_state.dart';
import '../../widgets/common/shell_scaffold_scope.dart';

class PayrollScreen extends StatefulWidget {
  const PayrollScreen({super.key});

  @override
  State<PayrollScreen> createState() => _PayrollScreenState();
}

class _PayrollScreenState extends State<PayrollScreen> {
  final _service = PayrollService();
  final _currencyFmt = NumberFormat.currency(symbol: '\$');

  List<PayrollRunSummary> _runs = [];
  PayrollRun? _selectedRun;
  PayrollRun? _calculatedRun;
  int? _selectedRunId;
  bool _loading = true;
  bool _calculating = false;
  bool _saving = false;
  String? _error;
  String _periodType = 'monthly';
  late DateTime _periodStart;
  late DateTime _periodEnd;

  @override
  void initState() {
    super.initState();
    _setDefaultPeriod();
    _loadRuns();
  }

  void _setDefaultPeriod() {
    final now = DateTime.now();
    _periodStart = DateTime(now.year, now.month, 1);
    _periodEnd = DateTime(now.year, now.month + 1, 0);
  }

  void _applyPeriodTypeDefaults(String periodType) {
    final now = DateTime.now();
    if (periodType == 'weekly') {
      final monday = now.subtract(Duration(days: now.weekday - 1));
      _periodStart = DateTime(monday.year, monday.month, monday.day);
      _periodEnd = _periodStart.add(const Duration(days: 6));
    } else if (periodType == 'fortnightly') {
      final day = now.day;
      final startDay = day <= 15 ? 1 : 16;
      final endDay =
          day <= 15 ? 15 : DateTime(now.year, now.month + 1, 0).day;
      _periodStart = DateTime(now.year, now.month, startDay);
      _periodEnd = DateTime(now.year, now.month, endDay);
    } else {
      _periodStart = DateTime(now.year, now.month, 1);
      _periodEnd = DateTime(now.year, now.month + 1, 0);
    }
  }

  Future<void> _loadRuns() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final runs = await _service.getPayrollRuns();
      _runs = runs;

      if (runs.isEmpty) {
        _selectedRun = null;
        _selectedRunId = null;
      } else {
        final hasSelected =
            _selectedRunId != null && runs.any((r) => r.id == _selectedRunId);
        _selectedRunId = hasSelected ? _selectedRunId : runs.first.id;
        await _loadRunDetails(_selectedRunId!);
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadRunDetails(int runId) async {
    final details = await _service.getPayrollRunDetails(runId);
    _selectedRun = details;
  }

  Future<void> _calculatePayroll() async {
    setState(() {
      _calculating = true;
      _error = null;
    });
    try {
      final calculated = await _service.calculatePayroll(
        periodStart: DateFormat('yyyy-MM-dd').format(_periodStart),
        periodEnd: DateFormat('yyyy-MM-dd').format(_periodEnd),
        periodType: _periodType,
      );
      if (!mounted) return;
      setState(() {
        _calculatedRun = calculated;
        _selectedRun = calculated;
      });
    } catch (_) {
      if (!mounted) return;
      _showSnack('Failed to calculate payroll');
    } finally {
      if (mounted) setState(() => _calculating = false);
    }
  }

  Future<void> _saveCalculatedRun() async {
    if (_calculatedRun == null) return;
    setState(() => _saving = true);
    try {
      await _service.savePayrollRun(_toPayrollData(_calculatedRun!));
      if (!mounted) return;
      _showSnack('Payroll run saved');
      setState(() => _calculatedRun = null);
      await _loadRuns();
    } catch (_) {
      if (!mounted) return;
      _showSnack('Failed to save payroll run');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Map<String, dynamic> _toPayrollData(PayrollRun run) {
    return {
      'periodStart': run.periodStart,
      'periodEnd': run.periodEnd,
      'periodType': run.periodType,
      'totalPayrollAmount': run.totalPayrollAmount,
      'totalEmployees': run.totalEmployees,
      'totalHours': run.totalHours,
      'overtimeHours': run.overtimeHours,
      'details': run.details
          .map(
            (d) => {
              'employeeId': d.employeeId,
              'employeeName': d.employeeName,
              'regularHours': d.regularHours,
              'overtimeHours': d.overtimeHours,
              'hourlyRate': d.hourlyRate,
              'overtimeRate': d.overtimeRate,
              'grossPay': d.grossPay,
              'deductions': d.deductions,
              'taxDeductions': d.taxDeductions,
              'otherDeductions': d.otherDeductions,
              'netPay': d.netPay,
              'superGuaranteeAmount': d.superGuaranteeAmount,
            },
          )
          .toList(),
    };
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _pickDate(bool isStart) async {
    final initial = isStart ? _periodStart : _periodEnd;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2015),
      lastDate: DateTime(2100),
    );
    if (picked == null) return;
    setState(() {
      if (isStart) {
        _periodStart = picked;
        if (_periodEnd.isBefore(picked)) _periodEnd = picked;
      } else {
        _periodEnd = picked;
        if (_periodStart.isAfter(picked)) _periodStart = picked;
      }
    });
  }

  String _formatDateLabel(String date) {
    try {
      final dt = DateTime.parse(date);
      return DateFormat('dd MMM yyyy').format(dt);
    } catch (_) {
      return date;
    }
  }

  @override
  Widget build(BuildContext context) {
    final shellLeading = ShellScaffoldScope.navigationLeading(context);
    return Scaffold(
      appBar: AppBar(
        leading: shellLeading,
        automaticallyImplyLeading: shellLeading == null,
        title: const Text('Payroll'),
        actions: ShellScaffoldScope.notificationActions(),
      ),
      body: RefreshIndicator(
        onRefresh: _loadRuns,
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
            FilledButton(onPressed: _loadRuns, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildPeriodSection(),
        const SizedBox(height: 16),
        _buildRunsSelector(),
        const SizedBox(height: 16),
        if (_selectedRun != null || _calculatedRun != null) _buildRunHeader(),
        if (_selectedRun != null || _calculatedRun != null)
          const SizedBox(height: 16),
        _buildSummaryCards(),
        const SizedBox(height: 20),
        const Text(
          'Employee Records',
          style: TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 16,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        if ((_calculatedRun ?? _selectedRun) == null ||
            (_calculatedRun ?? _selectedRun)!.details.isEmpty)
          const EmptyState(
            icon: Icons.receipt_long,
            title: 'No Payroll Records',
            subtitle: 'Run details will appear here after you select a payroll run.',
          )
        else
          ...(_calculatedRun ?? _selectedRun)!.details.map(_buildRecordCard),
      ],
    );
  }

  Widget _buildRunsSelector() {
    if (_runs.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: const Text(
          'No saved payroll runs yet. Calculate and save below.',
          style: TextStyle(
            color: AppColors.textSecondary,
            fontWeight: FontWeight.w500,
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: _selectedRunId?.toString(),
          isExpanded: true,
          icon: const Icon(Icons.calendar_month, color: AppColors.primary),
          items: _runs
              .map((run) => DropdownMenuItem<String>(
                    value: run.id.toString(),
                    child: Text(
                      run.displayLabel,
                      style: const TextStyle(fontWeight: FontWeight.w500),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ))
              .toList(),
          onChanged: (v) {
            if (v != null) {
              final runId = int.tryParse(v);
              if (runId == null) return;
              setState(() => _selectedRunId = runId);
              _loadRunDetails(runId).then((_) {
                if (mounted) setState(() => _calculatedRun = null);
              });
            }
          },
        ),
      ),
    );
  }

  Widget _buildPeriodSection() {
    final dateFmt = DateFormat('yyyy-MM-dd');
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Payroll Period',
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 16,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _periodType,
            decoration: const InputDecoration(
              labelText: 'Period Type',
              border: OutlineInputBorder(),
              isDense: true,
            ),
            items: const [
              DropdownMenuItem(value: 'weekly', child: Text('Weekly')),
              DropdownMenuItem(value: 'fortnightly', child: Text('Fortnightly')),
              DropdownMenuItem(value: 'monthly', child: Text('Monthly')),
            ],
            onChanged: (v) {
              if (v == null) return;
              setState(() {
                _periodType = v;
                _applyPeriodTypeDefaults(v);
              });
            },
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _pickDate(true),
                  icon: const Icon(Icons.event),
                  label: Text('Start ${dateFmt.format(_periodStart)}'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _pickDate(false),
                  icon: const Icon(Icons.event_available),
                  label: Text('End ${dateFmt.format(_periodEnd)}'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: _calculating ? null : _calculatePayroll,
                  child: Text(
                    _calculating ? 'Calculating...' : 'Calculate Payroll',
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: (_calculatedRun == null || _saving)
                      ? null
                      : _saveCalculatedRun,
                  child: Text(_saving ? 'Saving...' : 'Save Payroll Run'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRunHeader() {
    final run = _calculatedRun ?? _selectedRun!;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primary.withOpacity(0.15)),
      ),
      child: Text(
        '${run.periodType.toUpperCase()} • ${_formatDateLabel(run.periodStart)} - ${_formatDateLabel(run.periodEnd)}',
        style: const TextStyle(
          color: AppColors.textPrimary,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildSummaryCards() {
    final run = _calculatedRun ?? _selectedRun;
    if (run == null) {
      return const SizedBox.shrink();
    }
    final cards = [
      _SummaryItem('Total Payroll', _currencyFmt.format(run.totalPayrollAmount),
          Icons.account_balance_wallet, AppColors.primary),
      _SummaryItem('Employees', run.totalEmployees.toString(),
          Icons.people, AppColors.warning),
      _SummaryItem('Total Hours', '${run.totalHours.toStringAsFixed(1)}h',
          Icons.schedule, AppColors.success),
      _SummaryItem('Overtime Hours', '${run.overtimeHours.toStringAsFixed(1)}h',
          Icons.receipt_long, AppColors.warning),
    ];

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.6,
      children: cards
          .map((c) => Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: c.color.withOpacity(0.06),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: c.color.withOpacity(0.15)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(c.icon, size: 22, color: c.color),
                    const SizedBox(height: 8),
                    Text(
                      c.value,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: c.color,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      c.title,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ))
          .toList(),
    );
  }

  Widget _buildRecordCard(PayrollDetail record) {
    final name = record.employeeName;
    final gross = record.grossPay;
    final net = record.netPay;
    final tax = record.taxDeductions;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 0,
      color: AppColors.surface,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 20,
                  backgroundColor: AppColors.primary.withOpacity(0.1),
                  child: Text(
                    name.isNotEmpty ? name[0].toUpperCase() : '?',
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 15,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        'Hours ${record.regularHours.toStringAsFixed(1)}h • OT ${record.overtimeHours.toStringAsFixed(1)}h',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  _currencyFmt.format(net),
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: AppColors.success,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            const Divider(height: 1, color: AppColors.divider),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _PayField(label: 'Gross', value: _currencyFmt.format(gross)),
                _PayField(label: 'Tax', value: _currencyFmt.format(tax)),
                _PayField(label: 'Net', value: _currencyFmt.format(net)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryItem {
  final String title;
  final String value;
  final IconData icon;
  final Color color;
  const _SummaryItem(this.title, this.value, this.icon, this.color);
}

class _PayField extends StatelessWidget {
  final String label;
  final String value;
  const _PayField({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            color: AppColors.textSecondary,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
      ],
    );
  }
}
