import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_colors.dart';
import '../../models/referral.dart';
import '../../services/referrals_service.dart';
import '../../widgets/common/empty_state.dart';
import '../../widgets/common/shell_scaffold_scope.dart';
import '../../widgets/common/status_badge.dart';

class ReferralsScreen extends StatefulWidget {
  const ReferralsScreen({super.key});

  @override
  State<ReferralsScreen> createState() => _ReferralsScreenState();
}

class _ReferralsScreenState extends State<ReferralsScreen> {
  final _service = ReferralsService();
  final _dateFmt = DateFormat('dd MMM yyyy');

  List<Referral> _referrals = [];
  ReferralCounts _counts = ReferralCounts();
  bool _loading = true;
  String? _error;
  String _statusFilter = '';

  static const _filters = [
    {'label': 'All', 'value': ''},
    {'label': 'Pending', 'value': 'pending'},
    {'label': 'In Progress', 'value': 'in_progress'},
    {'label': 'Converted', 'value': 'converted'},
    {'label': 'Bonus Paid', 'value': 'bonus_paid'},
    {'label': 'Lost', 'value': 'lost'},
  ];

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
      final results = await Future.wait([
        _service.getReferrals(
            status: _statusFilter.isEmpty ? null : _statusFilter),
        _service.getCounts(),
      ]);
      _referrals = results[0] as List<Referral>;
      _counts = results[1] as ReferralCounts;
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markBonusPaid(Referral r) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Mark Bonus Paid'),
        content: Text(
          'Mark bonus of \$${r.bonusAmount?.toStringAsFixed(2) ?? '0.00'} '
          'as paid to ${r.referrerName ?? 'Referrer'}?',
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Confirm')),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await _service.markBonusPaid(r.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Bonus marked as paid')),
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
        title: const Text('Referrals'),
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
        _buildMetricCards(),
        const SizedBox(height: 16),
        _buildFilterChips(),
        const SizedBox(height: 16),
        if (_referrals.isEmpty)
          const EmptyState(
            icon: Icons.people_outline,
            title: 'No Referrals Found',
            subtitle: 'Referrals matching the current filter will appear here.',
          )
        else
          ..._referrals.map(_buildReferralCard),
      ],
    );
  }

  Widget _buildMetricCards() {
    final metrics = [
      _MetricData('Total', _counts.total, Icons.groups, AppColors.primary),
      _MetricData('Pending', _counts.pending, Icons.hourglass_empty,
          AppColors.warning),
      _MetricData('Converted', _counts.converted, Icons.check_circle_outline,
          AppColors.success),
      _MetricData(
          'Bonus Paid', _counts.bonusPaid, Icons.payments, AppColors.info),
    ];

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.7,
      children: metrics.map((m) => _MetricCard(data: m)).toList(),
    );
  }

  Widget _buildFilterChips() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: _filters.map((f) {
          final selected = _statusFilter == f['value'];
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              label: Text(f['label']!),
              selected: selected,
              onSelected: (_) {
                setState(() => _statusFilter = f['value']!);
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

  Widget _buildReferralCard(Referral r) {
    final statusLabel =
        Referral.statusLabels[r.status] ?? r.status;
    final showPayAction =
        r.status == 'converted' && !r.bonusPaid;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 0,
      color: AppColors.surface,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 20,
                  backgroundColor: AppColors.primary.withOpacity(0.1),
                  child: Text(
                    (r.referrerName ?? '?')[0].toUpperCase(),
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
                        r.referrerName ?? 'Unknown Referrer',
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 15,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Referred: ${r.referredName ?? 'Unknown'}',
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                StatusBadge(
                  label: statusLabel,
                  color: StatusBadge.fromStatus(r.status).color,
                  textColor: StatusBadge.fromStatus(r.status).textColor,
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(height: 1, color: AppColors.divider),
            const SizedBox(height: 12),
            Row(
              children: [
                _InfoChip(
                  icon: Icons.payments_outlined,
                  label: '\$${r.bonusAmount?.toStringAsFixed(2) ?? '0.00'}',
                ),
                const SizedBox(width: 16),
                if (r.systemType != null)
                  _InfoChip(
                    icon: Icons.solar_power_outlined,
                    label: r.systemType!,
                  ),
                const Spacer(),
                Text(
                  r.createdAt != null ? _dateFmt.format(r.createdAt!) : '',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
            if (showPayAction) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => _markBonusPaid(r),
                  icon: const Icon(Icons.paid, size: 18),
                  label: const Text('Mark Bonus Paid'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.success,
                    side: const BorderSide(color: AppColors.success),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _MetricData {
  final String title;
  final int value;
  final IconData icon;
  final Color color;
  const _MetricData(this.title, this.value, this.icon, this.color);
}

class _MetricCard extends StatelessWidget {
  final _MetricData data;
  const _MetricCard({required this.data});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: data.color.withOpacity(0.06),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: data.color.withOpacity(0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            children: [
              Icon(data.icon, size: 20, color: data.color),
              const Spacer(),
              Text(
                data.value.toString(),
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: data.color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            data.title,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  const _InfoChip({required this.icon, required this.label});

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
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
