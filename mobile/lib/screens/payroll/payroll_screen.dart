import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_colors.dart';
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

  Map<String, dynamic> _summary = {};
  List<Map<String, dynamic>> _records = [];
  bool _loading = true;
  String? _error;

  String _selectedPeriod = '';
  final List<String> _periods = [];

  @override
  void initState() {
    super.initState();
    _initPeriods();
    _load();
  }

  void _initPeriods() {
    final now = DateTime.now();
    for (int i = 0; i < 12; i++) {
      final d = DateTime(now.year, now.month - i);
      _periods.add(DateFormat('yyyy-MM').format(d));
    }
    _selectedPeriod = _periods.first;
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _service.getPayrollSummary(period: _selectedPeriod),
        _service.getPayrollRecords(period: _selectedPeriod),
      ]);
      _summary = results[0] as Map<String, dynamic>;
      _records = results[1] as List<Map<String, dynamic>>;
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _formatPeriodLabel(String period) {
    try {
      final dt = DateFormat('yyyy-MM').parse(period);
      return DateFormat('MMMM yyyy').format(dt);
    } catch (_) {
      return period;
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
        _buildPeriodSelector(),
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
        if (_records.isEmpty)
          const EmptyState(
            icon: Icons.receipt_long,
            title: 'No Payroll Records',
            subtitle: 'Records for the selected period will appear here.',
          )
        else
          ..._records.map(_buildRecordCard),
      ],
    );
  }

  Widget _buildPeriodSelector() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: _selectedPeriod,
          isExpanded: true,
          icon: const Icon(Icons.calendar_month, color: AppColors.primary),
          items: _periods
              .map((p) => DropdownMenuItem(
                    value: p,
                    child: Text(
                      _formatPeriodLabel(p),
                      style: const TextStyle(fontWeight: FontWeight.w500),
                    ),
                  ))
              .toList(),
          onChanged: (v) {
            if (v != null) {
              setState(() => _selectedPeriod = v);
              _load();
            }
          },
        ),
      ),
    );
  }

  Widget _buildSummaryCards() {
    final totalGross = (_summary['totalGross'] ?? 0).toDouble();
    final totalNet = (_summary['totalNet'] ?? 0).toDouble();
    final totalTax = (_summary['totalTax'] ?? 0).toDouble();
    final employeeCount = _summary['employeeCount'] ?? _records.length;

    final cards = [
      _SummaryItem('Total Gross', _currencyFmt.format(totalGross),
          Icons.account_balance_wallet, AppColors.primary),
      _SummaryItem('Total Net', _currencyFmt.format(totalNet),
          Icons.payments, AppColors.success),
      _SummaryItem('Total Tax', _currencyFmt.format(totalTax),
          Icons.receipt_long, AppColors.warning),
      _SummaryItem('Employees', employeeCount.toString(),
          Icons.people, AppColors.info),
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

  Widget _buildRecordCard(Map<String, dynamic> record) {
    final name = record['employeeName'] ?? record['name'] ?? 'Employee';
    final gross = (record['grossPay'] ?? record['gross'] ?? 0).toDouble();
    final net = (record['netPay'] ?? record['net'] ?? 0).toDouble();
    final tax = (record['tax'] ?? 0).toDouble();
    final role = record['role'] ?? record['position'] ?? '';

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
                      if (role.isNotEmpty)
                        Text(
                          role,
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
