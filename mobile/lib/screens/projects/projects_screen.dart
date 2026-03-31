import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:table_calendar/table_calendar.dart';
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
  String _view = 'table';
  String? _stageFilter;
  DateTime _calendarDay = DateTime.now();
  static const List<Map<String, String>> _flows = [
    {'id': 'inhouse', 'label': 'In-House Projects'},
    {'id': 'retailer', 'label': 'Retailer Projects'},
  ];

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
        title: const Text('In-House Projects'),
        actions: [
          ...ShellScaffoldScope.notificationActions(),
        ],
      ),
      body: Column(
        children: [
          _buildModuleTabs(),
          _buildViewTabs(),
          _buildFiltersPanel(),
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
                if (_view == 'calendar') {
                  return _CalendarView(
                    projects: provider.projects,
                    selectedDay: _calendarDay,
                    onDayChanged: (d) => setState(() => _calendarDay = d),
                    onTap: _openDetail,
                    onRefresh: _refresh,
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
        icon: const Icon(Icons.add_circle_outline),
        label: const Text('Create'),
        onPressed: () {
          _showCreateActions();
        },
      ),
    );
  }

  Widget _buildModuleTabs() {
    final active = _activeFlow();
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: _flows.map((flow) {
            final selected = active == flow['id'];
            return Expanded(
              child: InkWell(
                onTap: () => _goToFlow(flow['id']!),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  margin: const EdgeInsets.all(4),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: selected ? AppColors.primary : Colors.transparent,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    flow['label']!,
                    style: TextStyle(
                      color: selected ? Colors.white : AppColors.textSecondary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildViewTabs() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
      child: Row(
        children: [
          _viewChip('Table', 'table'),
          const SizedBox(width: 8),
          _viewChip('Calendar', 'calendar'),
        ],
      ),
    );
  }

  Widget _viewChip(String label, String key) {
    final selected = _view == key;
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => setState(() => _view = key),
      selectedColor: AppColors.primary.withOpacity(0.12),
      labelStyle: TextStyle(
        color: selected ? AppColors.primary : AppColors.textSecondary,
        fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
      ),
      side: BorderSide(color: selected ? AppColors.primary : AppColors.border),
    );
  }

  Widget _buildFiltersPanel() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 8),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          children: [
            _SearchBar(
              controller: _searchController,
              onChanged: _onSearchChanged,
            ),
            if (_view == 'table') _buildStageChips(),
          ],
        ),
      ),
    );
  }

  String _basePath() {
    final loc = GoRouterState.of(context).matchedLocation;
    if (loc.startsWith('/admin/')) return '/admin';
    if (loc.startsWith('/dashboard/')) return '/dashboard';
    return '/employee';
  }

  String _activeFlow() {
    final loc = GoRouterState.of(context).matchedLocation;
    if (loc.contains('/projects/retailer')) return 'retailer';
    return 'inhouse';
  }

  void _goToFlow(String id) {
    final base = _basePath();
    switch (id) {
      case 'retailer':
        context.go('$base/projects/retailer');
        break;
      default:
        context.go('$base/projects');
    }
  }

  void _showCreateActions() {
    showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.person_add_alt_1_outlined),
                title: const Text('Create Lead'),
                subtitle: const Text('Start in-house flow from a lead'),
                onTap: () {
                  Navigator.pop(ctx);
                  final base = _basePath();
                  if (base == '/admin' || base == '/dashboard') {
                    context.push('$base/leads/new');
                  }
                },
              ),
              ListTile(
                leading: const Icon(Icons.store_mall_directory_outlined),
                title: const Text('Create Project'),
                subtitle: const Text('Create retailer project'),
                onTap: () {
                  Navigator.pop(ctx);
                  final base = _basePath();
                  context.push('$base/projects/retailer/new');
                },
              ),
            ],
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

}

class _CalendarView extends StatelessWidget {
  final List<Project> projects;
  final DateTime selectedDay;
  final ValueChanged<DateTime> onDayChanged;
  final ValueChanged<Project> onTap;
  final Future<void> Function() onRefresh;

  const _CalendarView({
    required this.projects,
    required this.selectedDay,
    required this.onDayChanged,
    required this.onTap,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    DateTime norm(DateTime d) => DateTime(d.year, d.month, d.day);
    final eventsByDay = <DateTime, List<Project>>{};
    for (final p in projects) {
      final dt = p.scheduledAt ?? p.createdAt;
      if (dt == null) continue;
      final key = norm(dt);
      eventsByDay.putIfAbsent(key, () => []).add(p);
    }

    final dayItems = projects.where((p) {
      final dt = p.scheduledAt ?? p.createdAt;
      if (dt == null) return false;
      return dt.year == selectedDay.year &&
          dt.month == selectedDay.month &&
          dt.day == selectedDay.day;
    }).toList();

    return RefreshIndicator(
      onRefresh: onRefresh,
      color: AppColors.primary,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
        children: [
          Container(
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
            ),
            padding: const EdgeInsets.all(8),
            child: TableCalendar<Project>(
              firstDay: DateTime.utc(2020, 1, 1),
              lastDay: DateTime.utc(2100, 12, 31),
              focusedDay: selectedDay,
              currentDay: DateTime.now(),
              selectedDayPredicate: (d) => isSameDay(d, selectedDay),
              onDaySelected: (selected, focused) => onDayChanged(selected),
              startingDayOfWeek: StartingDayOfWeek.monday,
              availableCalendarFormats: const {CalendarFormat.month: 'Month'},
              calendarFormat: CalendarFormat.month,
              eventLoader: (day) => eventsByDay[norm(day)] ?? const [],
              calendarStyle: CalendarStyle(
                outsideDaysVisible: false,
                todayDecoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.15),
                  shape: BoxShape.circle,
                ),
                selectedDecoration: const BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
                markerDecoration: const BoxDecoration(
                  color: AppColors.success,
                  shape: BoxShape.circle,
                ),
                markersMaxCount: 3,
                markerSize: 5.5,
              ),
              headerStyle: const HeaderStyle(
                titleCentered: true,
                formatButtonVisible: false,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                const Icon(Icons.circle, size: 10, color: AppColors.success),
                const SizedBox(width: 8),
                Text(
                  '${dayItems.length} project${dayItems.length == 1 ? '' : 's'} on selected date',
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          if (dayItems.isEmpty)
            const EmptyState(
              icon: Icons.event_busy_outlined,
              title: 'No projects for this date',
              subtitle: 'Switch dates to check schedule.',
            )
          else
            ...dayItems.map((p) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _ProjectCard(project: p, onTap: () => onTap(p)),
                )),
        ],
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
    return TextField(
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
        separatorBuilder: (_, index) => const SizedBox(height: 10),
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

