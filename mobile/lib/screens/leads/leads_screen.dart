import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../models/lead.dart';
import '../../providers/leads_provider.dart';
import '../../widgets/common/empty_state.dart';
import '../../widgets/common/shell_scaffold_scope.dart';
import '../../widgets/common/status_badge.dart';

class LeadsScreen extends StatefulWidget {
  const LeadsScreen({super.key});

  @override
  State<LeadsScreen> createState() => _LeadsScreenState();
}

class _LeadsScreenState extends State<LeadsScreen> {
  final _searchCtrl = TextEditingController();
  Timer? _debounce;
  bool _kanbanView = false;

  @override
  void initState() {
    super.initState();
    context.read<LeadsProvider>().loadLeads();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      context.read<LeadsProvider>().loadLeads(search: query);
    });
  }

  String get _routePrefix {
    final loc = GoRouterState.of(context).matchedLocation;
    if (loc.startsWith('/admin')) return '/admin';
    if (loc.startsWith('/dashboard')) return '/dashboard';
    if (loc.startsWith('/employee')) return '/employee';
    return '/admin';
  }

  void _openLead(int id) => context.go('$_routePrefix/leads/$id');
  void _addLead() => context.go('$_routePrefix/leads/new');

  Future<void> _onRefresh() => context.read<LeadsProvider>().loadLeads(
        search: _searchCtrl.text,
      );

  @override
  Widget build(BuildContext context) {
    final shellLeading = ShellScaffoldScope.navigationLeading(context);
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        leading: shellLeading,
        automaticallyImplyLeading: shellLeading == null,
        title: const Text('Leads'),
        centerTitle: false,
        actions: [
          IconButton(
            tooltip: _kanbanView ? 'List view' : 'Kanban view',
            icon: Icon(
              _kanbanView ? Icons.view_list_rounded : Icons.view_kanban_rounded,
            ),
            onPressed: () => setState(() => _kanbanView = !_kanbanView),
          ),
          const SizedBox(width: 4),
          ...ShellScaffoldScope.notificationActions(),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addLead,
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add),
        label: const Text('New Lead'),
      ),
      body: Column(
        children: [
          _SearchBar(
            controller: _searchCtrl,
            onChanged: _onSearchChanged,
          ),
          if (!_kanbanView)
            Consumer<LeadsProvider>(
              builder: (context, provider, _) {
                return SizedBox(
                  height: 48,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                    children: [
                      _LeadStageChip(
                        label: 'All',
                        selected: provider.stageFilter == null,
                        onTap: () => provider.setStageFilter(null),
                      ),
                      ...Lead.stages.map(
                        (stage) => _LeadStageChip(
                          label: Lead.stageLabels[stage] ?? stage,
                          selected: provider.stageFilter == stage,
                          onTap: () => provider.setStageFilter(stage),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          Expanded(
            child: Consumer<LeadsProvider>(
              builder: (context, provider, _) {
                if (provider.loading && provider.leads.isEmpty) {
                  return const Center(
                    child:
                        CircularProgressIndicator(color: AppColors.primary),
                  );
                }

                if (provider.leads.isEmpty) {
                  String subtitle;
                  if (provider.searchQuery.isNotEmpty) {
                    subtitle = 'Try a different search term';
                  } else if (provider.stageFilter != null) {
                    subtitle =
                        'No leads in this stage — pick another chip or tap All';
                  } else {
                    subtitle =
                        'Tap the button below to create your first lead';
                  }
                  return EmptyState(
                    icon: Icons.people_outline_rounded,
                    title: 'No leads found',
                    subtitle: subtitle,
                    actionLabel: 'Add Lead',
                    onAction: _addLead,
                  );
                }

                if (_kanbanView) {
                  return _KanbanView(
                    leadsByStage: provider.leadsByStage,
                    onTapLead: _openLead,
                    onRefresh: _onRefresh,
                  );
                }

                return _ListView(
                  leads: provider.leads,
                  onTapLead: _openLead,
                  onRefresh: _onRefresh,
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Stage filter chips (list view)
// ---------------------------------------------------------------------------
class _LeadStageChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _LeadStageChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onTap(),
        selectedColor: AppColors.primary.withOpacity(0.15),
        checkmarkColor: AppColors.primary,
        labelStyle: TextStyle(
          color: selected ? AppColors.primary : AppColors.textSecondary,
          fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
          fontSize: 13,
        ),
        side: BorderSide(
          color: selected ? AppColors.primary : AppColors.border,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Search bar
// ---------------------------------------------------------------------------
class _SearchBar extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  const _SearchBar({required this.controller, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.white,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        decoration: InputDecoration(
          hintText: 'Search leads...',
          hintStyle: const TextStyle(color: AppColors.textSecondary),
          prefixIcon:
              const Icon(Icons.search, color: AppColors.textSecondary),
          suffixIcon: ValueListenableBuilder<TextEditingValue>(
            valueListenable: controller,
            builder: (_, v, __) {
              if (v.text.isEmpty) return const SizedBox.shrink();
              return IconButton(
                icon: const Icon(Icons.close, size: 20),
                onPressed: () {
                  controller.clear();
                  onChanged('');
                },
              );
            },
          ),
          filled: true,
          fillColor: AppColors.surface,
          contentPadding: const EdgeInsets.symmetric(vertical: 0),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// List view
// ---------------------------------------------------------------------------
class _ListView extends StatelessWidget {
  final List<Lead> leads;
  final ValueChanged<int> onTapLead;
  final Future<void> Function() onRefresh;

  const _ListView({
    required this.leads,
    required this.onTapLead,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: onRefresh,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
        itemCount: leads.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) => _LeadCard(
          lead: leads[i],
          onTap: () => onTapLead(leads[i].id),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Lead card (shared between list and kanban)
// ---------------------------------------------------------------------------
class _LeadCard extends StatelessWidget {
  final Lead lead;
  final VoidCallback onTap;
  final bool compact;

  const _LeadCard({
    required this.lead,
    required this.onTap,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final currFmt = NumberFormat.currency(symbol: '\$', decimalDigits: 0);

    return Material(
      color: AppColors.white,
      borderRadius: BorderRadius.circular(12),
      elevation: 0,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: EdgeInsets.all(compact ? 12 : 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border.withOpacity(0.6)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      lead.customerName,
                      style: TextStyle(
                        fontSize: compact ? 14 : 15,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  StatusBadge.fromStatus(lead.stage),
                ],
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 16,
                runSpacing: 4,
                children: [
                  if (lead.suburb != null && lead.suburb!.isNotEmpty)
                    _InfoChip(Icons.location_on_outlined, lead.suburb!),
                  if (lead.systemSize != null && lead.systemSize!.isNotEmpty)
                    _InfoChip(Icons.solar_power_outlined, lead.systemSize!),
                  if (lead.value != null)
                    _InfoChip(Icons.attach_money,
                        currFmt.format(lead.value!)),
                  if (lead.source != null && lead.source!.isNotEmpty)
                    _InfoChip(Icons.campaign_outlined, lead.source!),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String text;

  const _InfoChip(this.icon, this.text);

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: AppColors.textSecondary),
        const SizedBox(width: 4),
        Text(
          text,
          style: const TextStyle(
            fontSize: 12,
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Kanban view
// ---------------------------------------------------------------------------
class _KanbanView extends StatelessWidget {
  final Map<String, List<Lead>> leadsByStage;
  final ValueChanged<int> onTapLead;
  final Future<void> Function() onRefresh;

  const _KanbanView({
    required this.leadsByStage,
    required this.onTapLead,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    final activeStages = Lead.stages
        .where((s) => (leadsByStage[s]?.isNotEmpty ?? false) || true)
        .toList();

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: onRefresh,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: SizedBox(
          height: MediaQuery.of(context).size.height * 0.72,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            itemCount: activeStages.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (_, i) {
              final stage = activeStages[i];
              final leads = leadsByStage[stage] ?? [];
              return _KanbanColumn(
                stage: stage,
                leads: leads,
                onTapLead: onTapLead,
              );
            },
          ),
        ),
      ),
    );
  }
}

class _KanbanColumn extends StatelessWidget {
  final String stage;
  final List<Lead> leads;
  final ValueChanged<int> onTapLead;

  const _KanbanColumn({
    required this.stage,
    required this.leads,
    required this.onTapLead,
  });

  @override
  Widget build(BuildContext context) {
    final label = Lead.stageLabels[stage] ?? stage;

    return SizedBox(
      width: 280,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.border.withOpacity(0.5)),
            ),
            child: Row(
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${leads.length}',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: leads.isEmpty
                ? Center(
                    child: Text(
                      'No leads',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[400],
                      ),
                    ),
                  )
                : ListView.separated(
                    itemCount: leads.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) => _LeadCard(
                      lead: leads[i],
                      onTap: () => onTapLead(leads[i].id),
                      compact: true,
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
