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

class ProjectsScreen extends StatefulWidget {
  const ProjectsScreen({super.key});

  @override
  State<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends State<ProjectsScreen> {
  final _searchController = TextEditingController();
  Timer? _debounce;
  bool _isKanban = false;
  String? _stageFilter;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProjectsProvider>().loadProjects();
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
          .loadProjects(search: query, stage: _stageFilter);
    });
  }

  Future<void> _refresh() =>
      context.read<ProjectsProvider>().loadProjects(
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
        title: const Text('Projects'),
        actions: [
          IconButton(
            tooltip: _isKanban ? 'List view' : 'Kanban view',
            icon: Icon(_isKanban ? Icons.view_list_rounded : Icons.view_column_rounded),
            onPressed: () => setState(() => _isKanban = !_isKanban),
          ),
          ...ShellScaffoldScope.notificationActions(),
        ],
      ),
      body: Column(
        children: [
          _SearchBar(
            controller: _searchController,
            onChanged: _onSearchChanged,
          ),
          if (!_isKanban) _buildStageChips(),
          Expanded(
            child: Consumer<ProjectsProvider>(
              builder: (context, provider, _) {
                if (provider.loading && provider.projects.isEmpty) {
                  return const Center(
                    child: CircularProgressIndicator(color: AppColors.primary),
                  );
                }
                if (provider.error != null && provider.projects.isEmpty) {
                  return EmptyState(
                    icon: Icons.error_outline,
                    title: 'Failed to load projects',
                    subtitle: provider.error,
                    actionLabel: 'Retry',
                    onAction: _refresh,
                  );
                }
                if (_isKanban) {
                  return _KanbanView(
                    projectsByStage: provider.projectsByStage,
                    onRefresh: _refresh,
                    onTap: _openDetail,
                    onStageChange: _changeStage,
                  );
                }
                return _ListView(
                  projects: provider.projects,
                  onRefresh: _refresh,
                  onTap: _openDetail,
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.white,
        icon: const Icon(Icons.add),
        label: const Text('New Project'),
        onPressed: () {
          // Navigate to project creation when ready
        },
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
          _StageChip(
            label: 'All',
            selected: _stageFilter == null,
            onTap: () {
              setState(() => _stageFilter = null);
              _refresh();
            },
          ),
          ...Project.stages.map((stage) => _StageChip(
                label: Project.stageLabels[stage] ?? stage,
                selected: _stageFilter == stage,
                onTap: () {
                  setState(() => _stageFilter = stage);
                  _refresh();
                },
              )),
        ],
      ),
    );
  }

  void _openDetail(Project project) {
    final loc = GoRouterState.of(context).matchedLocation;
    final base = loc.contains('/admin')
        ? '/admin/projects'
        : loc.contains('/dashboard')
            ? '/dashboard/projects'
            : '/employee/projects';
    context.push('$base/${project.id}');
  }

  Future<void> _changeStage(Project project, String newStage) async {
    try {
      await context.read<ProjectsProvider>().updateProjectStage(project.id, newStage);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                '${project.customerName} moved to ${Project.stageLabels[newStage]}'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update stage: $e'), backgroundColor: AppColors.danger),
        );
      }
    }
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
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        decoration: InputDecoration(
          hintText: 'Search projects...',
          prefixIcon: const Icon(Icons.search, color: AppColors.textSecondary),
          suffixIcon: controller.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear, size: 20),
                  onPressed: () {
                    controller.clear();
                    onChanged('');
                  },
                )
              : null,
          filled: true,
          fillColor: AppColors.surface,
          contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
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
// Stage filter chip
// ---------------------------------------------------------------------------
class _StageChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _StageChip({
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
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// List view
// ---------------------------------------------------------------------------
class _ListView extends StatelessWidget {
  final List<Project> projects;
  final Future<void> Function() onRefresh;
  final ValueChanged<Project> onTap;

  const _ListView({
    required this.projects,
    required this.onRefresh,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    if (projects.isEmpty) {
      return EmptyState(
        icon: Icons.solar_power_outlined,
        title: 'No projects found',
        subtitle: 'Projects you create will appear here.',
      );
    }
    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: onRefresh,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
        itemCount: projects.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) =>
            _ProjectCard(project: projects[index], onTap: () => onTap(projects[index])),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Project card
// ---------------------------------------------------------------------------
class _ProjectCard extends StatelessWidget {
  final Project project;
  final VoidCallback onTap;

  const _ProjectCard({required this.project, required this.onTap});

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
                  Expanded(
                    child: Text(
                      project.customerName,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  StatusBadge.fromStatus(project.stage),
                ],
              ),
              const SizedBox(height: 8),
              if (project.suburb != null || project.address != null)
                _infoRow(Icons.location_on_outlined,
                    project.suburb ?? project.address ?? ''),
              if (project.systemSummary != null)
                _infoRow(Icons.solar_power_outlined, project.systemSummary!),
              if (project.value != null)
                _infoRow(Icons.attach_money, '\$${project.value!.toStringAsFixed(0)}'),
              if (project.assignees.isNotEmpty) ...[
                const SizedBox(height: 6),
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

  Widget _infoRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AppColors.textSecondary),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Kanban view
// ---------------------------------------------------------------------------
class _KanbanView extends StatelessWidget {
  final Map<String, List<Project>> projectsByStage;
  final Future<void> Function() onRefresh;
  final ValueChanged<Project> onTap;
  final Future<void> Function(Project, String) onStageChange;

  const _KanbanView({
    required this.projectsByStage,
    required this.onRefresh,
    required this.onTap,
    required this.onStageChange,
  });

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: onRefresh,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: SizedBox(
          height: MediaQuery.of(context).size.height * 0.72,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            itemCount: Project.stages.length,
            itemBuilder: (context, index) {
              final stage = Project.stages[index];
              final projects = projectsByStage[stage] ?? [];
              return _KanbanColumn(
                stage: stage,
                projects: projects,
                onTap: onTap,
                onStageChange: onStageChange,
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
  final List<Project> projects;
  final ValueChanged<Project> onTap;
  final Future<void> Function(Project, String) onStageChange;

  const _KanbanColumn({
    required this.stage,
    required this.projects,
    required this.onTap,
    required this.onStageChange,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 280,
      margin: const EdgeInsets.only(right: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 8),
            child: Row(
              children: [
                StatusBadge.fromStatus(stage),
                const SizedBox(width: 8),
                Text(
                  '(${projects.length})',
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.divider),
          Expanded(
            child: projects.isEmpty
                ? const Center(
                    child: Text(
                      'No projects',
                      style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(8),
                    itemCount: projects.length,
                    itemBuilder: (context, i) => _KanbanCard(
                      project: projects[i],
                      onTap: () => onTap(projects[i]),
                      onStageChange: onStageChange,
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

class _KanbanCard extends StatelessWidget {
  final Project project;
  final VoidCallback onTap;
  final Future<void> Function(Project, String) onStageChange;

  const _KanbanCard({
    required this.project,
    required this.onTap,
    required this.onStageChange,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 1,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: InkWell(
        onTap: onTap,
        onLongPress: () => _showStageMenu(context),
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                project.customerName,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                  color: AppColors.textPrimary,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              if (project.suburb != null) ...[
                const SizedBox(height: 4),
                Text(
                  project.suburb!,
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
              if (project.value != null) ...[
                const SizedBox(height: 4),
                Text(
                  '\$${project.value!.toStringAsFixed(0)}',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
              ],
              if (project.assignees.isNotEmpty) ...[
                const SizedBox(height: 6),
                Row(
                  children: [
                    ...project.assignees.take(2).map(
                          (a) => Container(
                            margin: const EdgeInsets.only(right: 4),
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(a, style: const TextStyle(fontSize: 10, color: AppColors.primary)),
                          ),
                        ),
                    if (project.assignees.length > 2)
                      Text(
                        '+${project.assignees.length - 2}',
                        style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  void _showStageMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40, height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Move "${project.customerName}" to…',
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
              ),
              const SizedBox(height: 8),
              ...Project.stages
                  .where((s) => s != project.stage)
                  .map((s) => ListTile(
                        leading: StatusBadge.fromStatus(s),
                        title: Text(Project.stageLabels[s] ?? s),
                        dense: true,
                        onTap: () {
                          Navigator.pop(ctx);
                          onStageChange(project, s);
                        },
                      )),
            ],
          ),
        ),
      ),
    );
  }
}
