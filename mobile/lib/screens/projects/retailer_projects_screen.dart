import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:table_calendar/table_calendar.dart';
import '../../core/theme/app_colors.dart';
import '../../models/project.dart';
import '../../providers/projects_provider.dart';
import '../../services/projects_service.dart';
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
  final _service = ProjectsService();
  Timer? _debounce;
  String? _stageFilter;
  String _view = 'table';
  DateTime _calendarDay = DateTime.now();
  bool _calendarLoading = false;
  String _calendarProjectsKey = '';
  Map<int, DateTime> _retailerScheduleMap = const {};
  static const List<Map<String, String>> _flows = [
    {'id': 'inhouse', 'label': 'In-House Projects'},
    {'id': 'retailer', 'label': 'Retailer Projects'},
  ];
  static const List<String> _retailerStages = [
    'new',
    'site_inspection',
    'stage_one',
    'stage_two',
    'full_system',
    'cancelled',
    'scheduled',
    'to_be_rescheduled',
    'installation_in_progress',
    'installation_completed',
    'ces_certificate_applied',
    'ces_certificate_received',
    'ces_certificate_submitted',
    'done',
  ];
  static const Map<String, String> _retailerStageLabels = {
    'new': 'New',
    'site_inspection': 'Site Inspection',
    'stage_one': 'Stage One',
    'stage_two': 'Stage Two',
    'full_system': 'Full System',
    'cancelled': 'Cancelled',
    'scheduled': 'Scheduled',
    'to_be_rescheduled': 'To Be Rescheduled',
    'installation_in_progress': 'Installation In-Progress',
    'installation_completed': 'Installation Completed',
    'ces_certificate_applied': 'CES Certificate Applied',
    'ces_certificate_received': 'CES Certificate Received',
    'ces_certificate_submitted': 'CES Certificate Submitted',
    'done': 'Done',
  };

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
          _buildModuleTabs(),
          _buildViewTabs(),
          _buildFiltersPanel(),
          Expanded(
            child: Consumer<ProjectsProvider>(
              builder: (context, provider, _) {
                if (provider.retailerListLoading && provider.retailerProjects.isEmpty) {
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
                if (_view == 'calendar') {
                  _ensureRetailerSchedules(projects);
                  return _RetailerCalendarView(
                    projects: projects,
                    selectedDay: _calendarDay,
                    loading: _calendarLoading,
                    scheduleMap: _retailerScheduleMap,
                    onDayChanged: (d) => setState(() => _calendarDay = d),
                    onTap: _openDetail,
                    onRefresh: _refresh,
                  );
                }
                return RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: _refresh,
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
                    itemCount: projects.length,
                    separatorBuilder: (_, index) => const SizedBox(height: 10),
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
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.white,
        onPressed: () => context.push('${_basePath()}/projects/retailer/new'),
        icon: const Icon(Icons.add),
        label: const Text('New Retailer Project'),
      ),
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
            _buildSearchBar(),
            if (_view == 'table') _buildStageChips(),
          ],
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

  Widget _buildSearchBar() {
    return TextField(
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
          ..._retailerStages.map((stage) => _chip(
                _retailerStageLabels[stage] ?? stage,
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
    context.push('${_basePath()}/projects/retailer/${project.id}');
  }

  Widget _buildModuleTabs() {
    const active = 'retailer';
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
      default:
        context.go('$base/projects/retailer');
    }
  }

  void _ensureRetailerSchedules(List<Project> projects) {
    final ids = projects.map((p) => p.id).toList()..sort();
    final key = ids.join(',');
    if (key.isEmpty || key == _calendarProjectsKey) return;
    _calendarProjectsKey = key;
    Future<void>(() async {
      if (!mounted) return;
      setState(() => _calendarLoading = true);
      final next = <int, DateTime>{};
      for (final p in projects) {
        try {
          final data = await _service.getRetailerSchedule(p.id);
          final raw = data['scheduled_at'] ?? data['scheduled_date'];
          if (raw != null) {
            final parsed = DateTime.tryParse(raw.toString().replaceFirst(' ', 'T'));
            if (parsed != null) next[p.id] = parsed;
          }
        } catch (_) {}
      }
      if (!mounted) return;
      setState(() {
        _retailerScheduleMap = next;
        _calendarLoading = false;
      });
    });
  }
}

class _RetailerCalendarView extends StatelessWidget {
  final List<Project> projects;
  final DateTime selectedDay;
  final bool loading;
  final Map<int, DateTime> scheduleMap;
  final ValueChanged<DateTime> onDayChanged;
  final ValueChanged<Project> onTap;
  final Future<void> Function() onRefresh;

  const _RetailerCalendarView({
    required this.projects,
    required this.selectedDay,
    required this.loading,
    required this.scheduleMap,
    required this.onDayChanged,
    required this.onTap,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    DateTime norm(DateTime d) => DateTime(d.year, d.month, d.day);
    final eventsByDay = <DateTime, List<Project>>{};
    for (final p in projects) {
      final dt = scheduleMap[p.id];
      if (dt == null) continue;
      final key = norm(dt);
      eventsByDay.putIfAbsent(key, () => []).add(p);
    }

    final dayItems = projects.where((p) {
      final dt = scheduleMap[p.id];
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
          if (loading)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
            )
          else
          if (dayItems.isEmpty)
            const EmptyState(
              icon: Icons.event_busy_outlined,
              title: 'No retailer projects for this date',
              subtitle: 'Switch dates to check schedule.',
            )
          else
            ...dayItems.map((p) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _RetailerProjectCard(project: p, onTap: () => onTap(p)),
                )),
        ],
      ),
    );
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
