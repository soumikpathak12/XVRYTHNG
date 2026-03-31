import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../models/pm_dashboard.dart';
import '../../providers/financial_provider.dart';
import '../../widgets/common/shell_scaffold_scope.dart';

class PmDashboardScreen extends StatefulWidget {
  const PmDashboardScreen({super.key});

  @override
  State<PmDashboardScreen> createState() => _PmDashboardScreenState();
}

class _PmDashboardScreenState extends State<PmDashboardScreen> {
  static const List<Map<String, String>> _flows = [
    {'id': 'dashboard', 'label': 'Dashboard'},
    {'id': 'inhouse', 'label': 'In-House Projects'},
    {'id': 'retailer', 'label': 'Retailer Projects'},
  ];
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FinancialProvider>().loadDashboard();
    });
  }

  Future<void> _refresh() =>
      context.read<FinancialProvider>().loadDashboard();

  @override
  Widget build(BuildContext context) {
    final shellLeading = ShellScaffoldScope.navigationLeading(context);
    return Scaffold(
      appBar: AppBar(
        leading: shellLeading,
        automaticallyImplyLeading: shellLeading == null,
        title: const Text('PM Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _refresh,
          ),
          ...ShellScaffoldScope.notificationActions(),
        ],
      ),
      body: Consumer<FinancialProvider>(
        builder: (context, provider, _) {
          if (provider.dashboardLoading && provider.dashboard == null) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            );
          }
          if (provider.dashboardError != null && provider.dashboard == null) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error_outline,
                      size: 48, color: AppColors.danger),
                  const SizedBox(height: 12),
                  Text(provider.dashboardError!,
                      style: const TextStyle(color: AppColors.textSecondary)),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: _refresh,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          final dash = provider.dashboard;
          if (dash == null) {
            return const Center(child: Text('No data available'));
          }

          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildFlowTabs(),
                const SizedBox(height: 12),
                _buildStatCards(dash),
                const SizedBox(height: 20),
                if (dash.alerts.isNotEmpty) ...[
                  _buildComplianceAlerts(dash.alerts),
                  const SizedBox(height: 20),
                ],
                _buildProjectsByStatus(dash.projectsByStatus),
                const SizedBox(height: 20),
                _buildProfitability(dash),
                const SizedBox(height: 20),
                if (dash.recentInhouse.isNotEmpty) ...[
                  _buildRecentProjects(
                      'Recent In-house Projects', dash.recentInhouse),
                  const SizedBox(height: 20),
                ],
                if (dash.recentRetailer.isNotEmpty)
                  _buildRecentProjects(
                      'Recent Retailer Projects', dash.recentRetailer),
                const SizedBox(height: 80),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildFlowTabs() {
    return Wrap(
      spacing: 8,
      children: _flows.map((flow) {
        final selected = flow['id'] == 'dashboard';
        return ChoiceChip(
          label: Text(flow['label']!),
          selected: selected,
          onSelected: (_) => _goToFlow(flow['id']!),
          selectedColor: AppColors.primary.withOpacity(0.12),
          labelStyle: TextStyle(
            color: selected ? AppColors.primary : AppColors.textSecondary,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
          ),
          side: BorderSide(color: selected ? AppColors.primary : AppColors.border),
        );
      }).toList(),
    );
  }

  String _basePath() {
    final loc = GoRouterState.of(context).matchedLocation;
    if (loc.startsWith('/admin/')) return '/admin';
    if (loc.startsWith('/dashboard/')) return '/dashboard';
    return '/employee';
  }

  void _goToFlow(String id) {
    final base = _basePath();
    switch (id) {
      case 'inhouse':
        context.go('$base/projects');
        break;
      case 'retailer':
        context.go('$base/projects/retailer');
        break;
      default:
        context.go('$base/pm-dashboard');
    }
  }

  Widget _buildStatCards(PmDashboard dash) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.65,
      children: [
        _StatCard(
          label: 'Active Projects',
          value: '${dash.totalActive}',
          icon: Icons.folder_outlined,
          color: AppColors.primary,
        ),
        _StatCard(
          label: 'In-house',
          value: '${dash.activeInhouse}',
          icon: Icons.home_work_outlined,
          color: AppColors.info,
        ),
        _StatCard(
          label: 'Retailer',
          value: '${dash.activeRetailer}',
          icon: Icons.store_outlined,
          color: AppColors.secondary,
        ),
        _StatCard(
          label: 'Installations',
          value: '${dash.upcomingInstallations}',
          icon: Icons.solar_power_outlined,
          color: AppColors.success,
        ),
        _StatCard(
          label: 'Total Value',
          value: '\$${_formatCurrency(dash.totalProjectValue)}',
          icon: Icons.attach_money_rounded,
          color: AppColors.warning,
        ),
        _StatCard(
          label: 'Alerts',
          value: '${dash.complianceAlerts}',
          icon: Icons.warning_amber_rounded,
          color: dash.complianceAlerts > 0
              ? AppColors.danger
              : AppColors.success,
        ),
      ],
    );
  }

  Widget _buildComplianceAlerts(List<ComplianceAlert> alerts) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.danger.withOpacity(0.05),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.danger.withOpacity(0.2)),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.warning_rounded,
                  color: AppColors.danger, size: 20),
              const SizedBox(width: 8),
              const Text(
                'Compliance Alerts',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.danger,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '${alerts.length}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ...alerts.map((alert) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      alert.severity == 'critical'
                          ? Icons.error
                          : Icons.info_outline,
                      size: 16,
                      color: alert.severity == 'critical'
                          ? AppColors.danger
                          : AppColors.warning,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        alert.message,
                        style: const TextStyle(
                            fontSize: 13, color: AppColors.textPrimary),
                      ),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }

  Widget _buildProjectsByStatus(Map<String, int> statusMap) {
    if (statusMap.isEmpty) return const SizedBox.shrink();

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Projects by Status',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          ...statusMap.entries.map((entry) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: _statusColor(entry.key),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        _humanizeStatus(entry.key),
                        style: const TextStyle(
                            fontSize: 13, color: AppColors.textPrimary),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: _statusColor(entry.key).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '${entry.value}',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: _statusColor(entry.key),
                        ),
                      ),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }

  Widget _buildProfitability(PmDashboard dash) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Profitability',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          _profitRow('Total Revenue', dash.totalRevenue, AppColors.success),
          _profitRow('Total Costs', dash.totalCosts, AppColors.danger),
          const Divider(height: 16),
          _profitRow('Gross Margin', dash.grossMargin,
              dash.grossMargin >= 0 ? AppColors.success : AppColors.danger),
          _profitRow('Avg. Project Value', dash.avgProjectValue,
              AppColors.primary),
        ],
      ),
    );
  }

  Widget _profitRow(String label, double value, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: const TextStyle(
                  fontSize: 13, color: AppColors.textSecondary)),
          Text(
            '\$${_formatCurrency(value)}',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentProjects(
      String title, List<Map<String, dynamic>> projects) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 10),
          ...projects.take(5).map((p) => Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            p['customer_name'] ??
                                p['customerName'] ??
                                'Unknown',
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          if (p['suburb'] != null)
                            Text(
                              p['suburb'],
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                              ),
                            ),
                        ],
                      ),
                    ),
                    if (p['stage'] != null)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: _statusColor(p['stage']).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          _humanizeStatus(p['stage']),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: _statusColor(p['stage']),
                          ),
                        ),
                      ),
                  ],
                ),
              )),
        ],
      ),
    );
  }

  String _formatCurrency(double value) {
    if (value >= 1000000) {
      return '${(value / 1000000).toStringAsFixed(1)}M';
    }
    if (value >= 1000) {
      return '${(value / 1000).toStringAsFixed(1)}K';
    }
    return value.toStringAsFixed(0);
  }

  String _humanizeStatus(String status) {
    return status
        .replaceAll('_', ' ')
        .split(' ')
        .map((w) => w.isNotEmpty
            ? '${w[0].toUpperCase()}${w.substring(1)}'
            : '')
        .join(' ');
  }

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'new':
      case 'pending':
        return AppColors.info;
      case 'in_progress':
      case 'active':
        return AppColors.primary;
      case 'completed':
      case 'done':
        return AppColors.success;
      case 'cancelled':
      case 'rejected':
        return AppColors.danger;
      case 'on_hold':
        return AppColors.warning;
      default:
        return AppColors.textSecondary;
    }
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withOpacity(0.06),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withOpacity(0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 22),
          const Spacer(),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
