import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../models/project.dart';
import '../../providers/projects_provider.dart';
import '../../widgets/common/empty_state.dart';
import '../../widgets/common/shell_scaffold_scope.dart';
import '../../widgets/common/status_badge.dart';

class RetailerProjectsScreen extends StatefulWidget {
  const RetailerProjectsScreen({super.key});

  @override
  State<RetailerProjectsScreen> createState() => _RetailerProjectsScreenState();
}

class _RetailerProjectsScreenState extends State<RetailerProjectsScreen> {
  final _searchController = TextEditingController();
  Timer? _debounce;
  String? _stageFilter;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProjectsProvider>().loadRetailerProjects();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      context
          .read<ProjectsProvider>()
          .loadRetailerProjects(search: query, stage: _stageFilter);
    });
  }

  Future<void> _refresh() =>
      context.read<ProjectsProvider>().loadRetailerProjects(
            search: _searchController.text,
            stage: _stageFilter,
          );

  @override
  Widget build(BuildContext context) {
    final shellLeading = ShellScaffoldScope.navigationLeading(context);
    return Scaffold(
      appBar: AppBar(
        leading: shellLeading,
        automaticallyImplyLeading: shellLeading == null,
        title: const Text('Retailer Projects'),
        actions: ShellScaffoldScope.notificationActions(),
      ),
      body: Column(
        children: [
          _buildSearchBar(),
          _buildStageChips(),
          Expanded(
            child: Consumer<ProjectsProvider>(
              builder: (context, provider, _) {
                if (provider.loading && provider.retailerProjects.isEmpty) {
                  return const Center(
                    child: CircularProgressIndicator(color: AppColors.primary),
                  );
                }
                if (provider.error != null && provider.retailerProjects.isEmpty) {
                  return EmptyState(
                    icon: Icons.error_outline,
                    title: 'Failed to load projects',
                    subtitle: provider.error,
                    actionLabel: 'Retry',
                    onAction: _refresh,
                  );
                }
                final projects = provider.retailerProjects;
                if (projects.isEmpty) {
                  return const EmptyState(
                    icon: Icons.storefront_outlined,
                    title: 'No retailer projects',
                    subtitle: 'Retailer projects will appear here.',
                  );
                }
                return RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: _refresh,
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
                    itemCount: projects.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) =>
                        _RetailerProjectCard(
                          project: projects[index],
                          onTap: () => _openDetail(projects[index]),
                        ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: TextField(
        controller: _searchController,
        onChanged: _onSearchChanged,
        decoration: InputDecoration(
          hintText: 'Search retailer projects...',
          prefixIcon: const Icon(Icons.search, color: AppColors.textSecondary),
          suffixIcon: _searchController.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear, size: 20),
                  onPressed: () {
                    _searchController.clear();
                    _onSearchChanged('');
                  },
                )
              : null,
          filled: true,
          fillColor: AppColors.surface,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
        ),
      ),
    );
  }

  Widget _buildStageChips() {
    return SizedBox(
      height: 48,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          _chip('All', _stageFilter == null, () {
            setState(() => _stageFilter = null);
            _refresh();
          }),
          ...Project.stages.map((stage) => _chip(
                Project.stageLabels[stage] ?? stage,
                _stageFilter == stage,
                () {
                  setState(() => _stageFilter = stage);
                  _refresh();
                },
              )),
        ],
      ),
    );
  }

  Widget _chip(String label, bool selected, VoidCallback onTap) {
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
        side: BorderSide(color: selected ? AppColors.primary : AppColors.border),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
    );
  }

  void _openDetail(Project project) {
    final loc = GoRouterState.of(context).matchedLocation;
    final base = loc.contains('/admin')
        ? '/admin/projects'
        : '/dashboard/projects';
    context.push('$base/${project.id}');
  }
}

class _RetailerProjectCard extends StatelessWidget {
  final Project project;
  final VoidCallback onTap;

  const _RetailerProjectCard({required this.project, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.border, width: 0.5),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.storefront, color: AppColors.primary, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          project.customerName,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 15,
                            color: AppColors.textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (project.suburb != null)
                          Text(
                            project.suburb!,
                            style: const TextStyle(
                              fontSize: 13,
                              color: AppColors.textSecondary,
                            ),
                          ),
                      ],
                    ),
                  ),
                  StatusBadge.fromStatus(project.stage),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  if (project.systemSummary != null) ...[
                    const Icon(Icons.solar_power_outlined,
                        size: 15, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        project.systemSummary!,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                  if (project.value != null) ...[
                    const Spacer(),
                    Text(
                      '\$${project.value!.toStringAsFixed(0)}',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ],
              ),
              if (project.assignees.isNotEmpty) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 4,
                  children: project.assignees
                      .take(3)
                      .map((a) => Chip(
                            label: Text(a, style: const TextStyle(fontSize: 11)),
                            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            visualDensity: VisualDensity.compact,
                            padding: EdgeInsets.zero,
                            labelPadding: const EdgeInsets.symmetric(horizontal: 6),
                            backgroundColor: AppColors.primary.withOpacity(0.08),
                            side: BorderSide.none,
                          ))
                      .toList(),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
