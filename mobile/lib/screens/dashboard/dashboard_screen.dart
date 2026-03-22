import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../models/dashboard.dart';
import '../../providers/dashboard_provider.dart';
import '../../widgets/common/shell_scaffold_scope.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    final provider = context.read<DashboardProvider>();
    provider.loadDashboard();
    provider.loadActivities();
  }

  Future<void> _onRefresh() async {
    final provider = context.read<DashboardProvider>();
    await Future.wait([
      provider.loadDashboard(),
      provider.loadActivities(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final shellLeading = ShellScaffoldScope.navigationLeading(context);
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        leading: shellLeading,
        automaticallyImplyLeading: shellLeading == null,
        title: const Text('Dashboard'),
        centerTitle: false,
        actions: [
          Consumer<DashboardProvider>(
            builder: (_, p, __) => _RangeChip(
              selected: p.range,
              onChanged: (r) => p.loadDashboard(range: r),
            ),
          ),
          const SizedBox(width: 8),
          ...ShellScaffoldScope.notificationActions(),
        ],
      ),
      body: Consumer<DashboardProvider>(
        builder: (context, provider, _) {
          if (provider.loading && provider.metrics == null) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            );
          }

          if (provider.error != null && provider.metrics == null) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.cloud_off_rounded,
                      size: 48, color: Colors.grey[400]),
                  const SizedBox(height: 12),
                  Text(
                    'Failed to load dashboard',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  FilledButton.tonal(
                    onPressed: _onRefresh,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: _onRefresh,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
              children: [
                if (provider.metrics != null)
                  _KpiGrid(metrics: provider.metrics!),
                const SizedBox(height: 20),
                if (provider.pipelineStages.isNotEmpty)
                  _PipelineChart(stages: provider.pipelineStages),
                const SizedBox(height: 20),
                _ActivitySection(activities: provider.activities),
              ],
            ),
          );
        },
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Range selector chip
// ---------------------------------------------------------------------------
class _RangeChip extends StatelessWidget {
  final String selected;
  final ValueChanged<String> onChanged;

  const _RangeChip({required this.selected, required this.onChanged});

  static const _options = {
    '7d': '7 Days',
    '30d': '30 Days',
    '90d': '90 Days',
  };

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<String>(
      onSelected: onChanged,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      offset: const Offset(0, 44),
      itemBuilder: (_) => _options.entries
          .map((e) => PopupMenuItem(
                value: e.key,
                child: Text(
                  e.value,
                  style: TextStyle(
                    fontWeight:
                        e.key == selected ? FontWeight.w600 : FontWeight.normal,
                    color: e.key == selected
                        ? AppColors.primary
                        : AppColors.textPrimary,
                  ),
                ),
              ))
          .toList(),
      child: Chip(
        avatar: const Icon(Icons.calendar_today, size: 16),
        label: Text(_options[selected] ?? '30 Days'),
        backgroundColor: AppColors.white,
        side: const BorderSide(color: AppColors.border),
        padding: const EdgeInsets.symmetric(horizontal: 4),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// KPI Grid — 2-column grid of metric cards
// ---------------------------------------------------------------------------
class _KpiGrid extends StatelessWidget {
  final DashboardMetrics metrics;

  const _KpiGrid({required this.metrics});

  @override
  Widget build(BuildContext context) {
    final currencyFmt =
        NumberFormat.compactCurrency(symbol: '\$', decimalDigits: 1);
    final numFmt = NumberFormat.compact();
    final pctFmt = NumberFormat('0.0');

    final cards = <_KpiData>[
      _KpiData('Total Leads', numFmt.format(metrics.totalLeads.value),
          metrics.totalLeads.delta, Icons.people_alt_rounded),
      _KpiData('Leads Contacted', numFmt.format(metrics.leadsContacted.value),
          metrics.leadsContacted.delta, Icons.phone_callback_rounded),
      _KpiData(
          'Conversion Rate',
          '${pctFmt.format(metrics.conversionRate.value)}%',
          metrics.conversionRate.delta,
          Icons.trending_up_rounded),
      _KpiData(
          'Pipeline Value',
          currencyFmt.format(metrics.pipelineValue.value),
          metrics.pipelineValue.delta,
          Icons.attach_money_rounded),
      _KpiData('Proposals Sent', numFmt.format(metrics.proposalsSent.value),
          metrics.proposalsSent.delta, Icons.description_rounded),
      _KpiData('Closed Won', numFmt.format(metrics.closedWon.value),
          metrics.closedWon.delta, Icons.emoji_events_rounded),
    ];

    return GridView.builder(
      itemCount: cards.length,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.55,
      ),
      itemBuilder: (_, i) => _KpiCard(data: cards[i]),
    );
  }
}

class _KpiData {
  final String title;
  final String value;
  final double delta;
  final IconData icon;
  _KpiData(this.title, this.value, this.delta, this.icon);
}

class _KpiCard extends StatelessWidget {
  final _KpiData data;
  const _KpiCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final isPositive = data.delta >= 0;
    final accentColor = isPositive ? AppColors.secondary : AppColors.danger;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: Stack(
          children: [
            Positioned(
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              child: Container(color: accentColor),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 14, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(data.icon,
                            size: 18, color: AppColors.primary),
                      ),
                      const Spacer(),
                      _DeltaBadge(delta: data.delta),
                    ],
                  ),
                  const Spacer(),
                  Text(
                    data.value,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    data.title,
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
          ],
        ),
      ),
    );
  }
}

class _DeltaBadge extends StatelessWidget {
  final double delta;
  const _DeltaBadge({required this.delta});

  @override
  Widget build(BuildContext context) {
    final isPositive = delta >= 0;
    final color = isPositive ? AppColors.success : AppColors.danger;
    final icon = isPositive ? Icons.arrow_upward : Icons.arrow_downward;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 2),
          Text(
            '${delta.abs().toStringAsFixed(1)}%',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Pipeline bar chart
// ---------------------------------------------------------------------------
class _PipelineChart extends StatelessWidget {
  final List<PipelineStage> stages;
  const _PipelineChart({required this.stages});

  @override
  Widget build(BuildContext context) {
    final maxVal =
        stages.fold<double>(0, (m, s) => s.count > m ? s.count.toDouble() : m);
    final currencyFmt =
        NumberFormat.compactCurrency(symbol: '\$', decimalDigits: 1);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Pipeline by Stage',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            height: 200,
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceAround,
                maxY: maxVal * 1.25,
                barTouchData: BarTouchData(
                  touchTooltipData: BarTouchTooltipData(
                    tooltipRoundedRadius: 8,
                    getTooltipItem: (group, gIdx, rod, rIdx) {
                      final stage = stages[group.x.toInt()];
                      return BarTooltipItem(
                        '${stage.label}\n${stage.count} leads\n${currencyFmt.format(stage.value)}',
                        const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      );
                    },
                  ),
                ),
                titlesData: FlTitlesData(
                  show: true,
                  topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 32,
                      getTitlesWidget: (v, meta) => Padding(
                        padding: const EdgeInsets.only(right: 4),
                        child: Text(
                          v.toInt().toString(),
                          style: const TextStyle(
                              fontSize: 10, color: AppColors.textSecondary),
                        ),
                      ),
                    ),
                  ),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 38,
                      getTitlesWidget: (v, meta) {
                        final idx = v.toInt();
                        if (idx < 0 || idx >= stages.length) {
                          return const SizedBox.shrink();
                        }
                        return Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            stages[idx].label.length > 6
                                ? '${stages[idx].label.substring(0, 6)}.'
                                : stages[idx].label,
                            style: const TextStyle(
                                fontSize: 10, color: AppColors.textSecondary),
                          ),
                        );
                      },
                    ),
                  ),
                ),
                borderData: FlBorderData(show: false),
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  getDrawingHorizontalLine: (_) => FlLine(
                    color: AppColors.divider.withOpacity(0.5),
                    strokeWidth: 1,
                  ),
                ),
                barGroups: List.generate(stages.length, (i) {
                  return BarChartGroupData(
                    x: i,
                    barRods: [
                      BarChartRodData(
                        toY: stages[i].count.toDouble(),
                        width: 22,
                        color: AppColors.primary.withOpacity(0.85),
                        borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(6)),
                        backDrawRodData: BackgroundBarChartRodData(
                          show: true,
                          toY: maxVal * 1.25,
                          color: AppColors.primary.withOpacity(0.04),
                        ),
                      ),
                    ],
                  );
                }),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Recent activity section
// ---------------------------------------------------------------------------
class _ActivitySection extends StatelessWidget {
  final List<ActivityItem> activities;
  const _ActivitySection({required this.activities});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Recent Activity',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          if (activities.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Text(
                  'No recent activity',
                  style: TextStyle(color: Colors.grey[500], fontSize: 14),
                ),
              ),
            )
          else
            ...activities.take(10).map((a) => _ActivityTile(activity: a)),
        ],
      ),
    );
  }
}

class _ActivityTile extends StatelessWidget {
  final ActivityItem activity;
  const _ActivityTile({required this.activity});

  IconData get _icon {
    switch (activity.type) {
      case 'lead_created':
        return Icons.person_add_rounded;
      case 'lead_updated':
      case 'stage_changed':
        return Icons.swap_horiz_rounded;
      case 'note_added':
        return Icons.sticky_note_2_rounded;
      case 'call':
        return Icons.phone_rounded;
      case 'email':
        return Icons.email_rounded;
      case 'document':
        return Icons.attach_file_rounded;
      default:
        return Icons.circle;
    }
  }

  Color get _iconColor {
    switch (activity.type) {
      case 'lead_created':
        return AppColors.success;
      case 'lead_updated':
      case 'stage_changed':
        return AppColors.info;
      case 'note_added':
        return AppColors.warning;
      default:
        return AppColors.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final timeFmt = DateFormat('d MMM, h:mm a');

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: _iconColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(_icon, size: 18, color: _iconColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  activity.description,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    if (activity.userName != null) ...[
                      Text(
                        activity.userName!,
                        style: const TextStyle(
                            fontSize: 11, color: AppColors.textSecondary),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        width: 3,
                        height: 3,
                        decoration: const BoxDecoration(
                          color: AppColors.textSecondary,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                    ],
                    if (activity.createdAt != null)
                      Text(
                        timeFmt.format(activity.createdAt!),
                        style: const TextStyle(
                            fontSize: 11, color: AppColors.textSecondary),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
