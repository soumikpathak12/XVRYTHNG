import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../models/installation_job.dart';
import '../../providers/installation_provider.dart';
import '../../widgets/common/empty_state.dart';
import '../../widgets/common/shell_scaffold_scope.dart';
import '../../widgets/common/status_badge.dart';

class InstallationListScreen extends StatefulWidget {
  const InstallationListScreen({super.key});

  @override
  State<InstallationListScreen> createState() => _InstallationListScreenState();
}

class _InstallationListScreenState extends State<InstallationListScreen> {
  String _selectedStatus = 'all';
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<InstallationProvider>().loadJobs();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<InstallationJob> _filterJobs(List<InstallationJob> jobs) {
    var filtered = jobs;
    if (_selectedStatus != 'all') {
      filtered = filtered.where((j) => j.status == _selectedStatus).toList();
    }
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      filtered = filtered.where((j) {
        return j.customerName.toLowerCase().contains(q) ||
            (j.address?.toLowerCase().contains(q) ?? false) ||
            (j.suburb?.toLowerCase().contains(q) ?? false) ||
            (j.systemType?.toLowerCase().contains(q) ?? false) ||
            j.teamNames.any((t) => t.toLowerCase().contains(q));
      }).toList();
    }
    return filtered;
  }

  _TimeGroup _getTimeGroup(DateTime? date) {
    if (date == null) return _TimeGroup.upcoming;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final jobDay = DateTime(date.year, date.month, date.day);
    final diff = jobDay.difference(today).inDays;

    if (diff < 0) return _TimeGroup.past;
    if (diff == 0) return _TimeGroup.today;
    if (diff <= 7 - today.weekday) return _TimeGroup.thisWeek;
    return _TimeGroup.upcoming;
  }

  Map<_TimeGroup, List<InstallationJob>> _groupJobs(
      List<InstallationJob> jobs) {
    final map = <_TimeGroup, List<InstallationJob>>{};
    for (final job in jobs) {
      final group = _getTimeGroup(job.scheduledDate);
      (map[group] ??= []).add(job);
    }
    for (final list in map.values) {
      list.sort((a, b) {
        final da = a.scheduledDate ?? DateTime(2100);
        final db = b.scheduledDate ?? DateTime(2100);
        return da.compareTo(db);
      });
    }
    return map;
  }

  @override
  Widget build(BuildContext context) {
    final shellLeading = ShellScaffoldScope.navigationLeading(context);
    return Scaffold(
      appBar: AppBar(
        leading: shellLeading,
        automaticallyImplyLeading: shellLeading == null,
        title: const Text('Installation'),
        actions: ShellScaffoldScope.notificationActions(),
      ),
      body: Consumer<InstallationProvider>(
        builder: (context, provider, _) {
          final filtered = _filterJobs(provider.jobs);
          final grouped = _groupJobs(filtered);

          return RefreshIndicator(
          color: AppColors.primary,
          onRefresh: provider.loadJobs,
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: _buildFilterSection(provider),
              ),
              SliverToBoxAdapter(child: _buildSearchBar()),
              if (provider.loading && provider.jobs.isEmpty)
                const SliverFillRemaining(
                  child: Center(
                    child:
                        CircularProgressIndicator(color: AppColors.primary),
                  ),
                )
              else if (filtered.isEmpty)
                SliverFillRemaining(
                  child: EmptyState(
                    icon: Icons.construction_rounded,
                    title: _searchQuery.isNotEmpty
                        ? 'No matching jobs'
                        : 'No installation jobs',
                    subtitle: _searchQuery.isNotEmpty
                        ? 'Try a different search term'
                        : 'Jobs will appear here once scheduled',
                  ),
                )
              else
                ..._buildGroupedSlivers(grouped),
              const SliverPadding(padding: EdgeInsets.only(bottom: 100)),
            ],
          ),
        );
        },
      ),
    );
  }

  Widget _buildFilterSection(InstallationProvider provider) {
    final allCount = provider.jobs.length;
    final filters = <_FilterChipData>[
      _FilterChipData('all', 'All', allCount),
      _FilterChipData('scheduled', 'Scheduled', provider.scheduledCount),
      _FilterChipData(
          'in_progress', 'In Progress', provider.inProgressCount),
      _FilterChipData(
          'paused',
          'Paused',
          provider.jobs.where((j) => j.status == 'paused').length),
      _FilterChipData('completed', 'Completed', provider.completedCount),
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
      child: SizedBox(
        height: 40,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: filters.length,
          separatorBuilder: (_, __) => const SizedBox(width: 8),
          itemBuilder: (_, i) {
            final f = filters[i];
            final selected = _selectedStatus == f.value;
            return FilterChip(
              selected: selected,
              label: Text('${f.label} (${f.count})'),
              labelStyle: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: selected ? AppColors.white : AppColors.textSecondary,
              ),
              backgroundColor: AppColors.surface,
              selectedColor: AppColors.primary,
              checkmarkColor: AppColors.white,
              side: BorderSide(
                color: selected ? AppColors.primary : AppColors.border,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 4),
              onSelected: (_) {
                setState(() => _selectedStatus = f.value);
              },
            );
          },
        ),
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: 'Search jobs...',
          hintStyle:
              const TextStyle(color: AppColors.disabled, fontSize: 14),
          prefixIcon: const Icon(Icons.search, color: AppColors.textSecondary),
          suffixIcon: _searchQuery.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear, size: 20),
                  onPressed: () {
                    _searchController.clear();
                    setState(() => _searchQuery = '');
                  },
                )
              : null,
          filled: true,
          fillColor: AppColors.surface,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
          ),
        ),
        onChanged: (v) => setState(() => _searchQuery = v.trim()),
      ),
    );
  }

  List<Widget> _buildGroupedSlivers(
      Map<_TimeGroup, List<InstallationJob>> grouped) {
    final order = [
      _TimeGroup.today,
      _TimeGroup.thisWeek,
      _TimeGroup.upcoming,
      _TimeGroup.past,
    ];
    final widgets = <Widget>[];
    for (final group in order) {
      final jobs = grouped[group];
      if (jobs == null || jobs.isEmpty) continue;
      widgets.add(
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(
              children: [
                Icon(group.icon, size: 18, color: group.color),
                const SizedBox(width: 8),
                Text(
                  group.label,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: group.color,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: group.color.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${jobs.length}',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: group.color,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
      widgets.add(
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          sliver: SliverList.separated(
            itemCount: jobs.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (_, i) => _JobCard(job: jobs[i]),
          ),
        ),
      );
    }
    return widgets;
  }
}

class _JobCard extends StatelessWidget {
  final InstallationJob job;
  const _JobCard({required this.job});

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('EEE, dd MMM yyyy');
    final scheduledLabel = job.scheduledDate != null
        ? dateFormat.format(job.scheduledDate!)
        : 'Not scheduled';
    final timeLabel = job.scheduledTime ?? '';

    return Material(
      color: AppColors.white,
      borderRadius: BorderRadius.circular(14),
      elevation: 0,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => _openDetail(context),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border.withOpacity(0.6)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      job.customerName,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  StatusBadge.fromStatus(job.status),
                ],
              ),
              if (job.address != null && job.address!.isNotEmpty) ...[
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Icons.location_on_outlined,
                        size: 15, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        [job.address, job.suburb]
                            .where((s) => s != null && s.isNotEmpty)
                            .join(', '),
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 10),
              Row(
                children: [
                  _InfoChip(
                    icon: Icons.calendar_today_outlined,
                    label: scheduledLabel,
                  ),
                  if (timeLabel.isNotEmpty) ...[
                    const SizedBox(width: 12),
                    _InfoChip(
                      icon: Icons.access_time_outlined,
                      label: timeLabel,
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  if (job.systemSizeKw != null)
                    _InfoChip(
                      icon: Icons.solar_power_outlined,
                      label:
                          '${job.systemSizeKw!.toStringAsFixed(job.systemSizeKw! == job.systemSizeKw!.roundToDouble() ? 0 : 1)} kW',
                    ),
                  if (job.systemType != null &&
                      job.systemType!.isNotEmpty) ...[
                    const SizedBox(width: 12),
                    _InfoChip(
                      icon: Icons.category_outlined,
                      label: job.systemType!,
                    ),
                  ],
                  const Spacer(),
                  if (job.teamNames.isNotEmpty)
                    _TeamAvatars(names: job.teamNames),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openDetail(BuildContext context) {
    Navigator.of(context).pushNamed('/installation/${job.id}');
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
        Icon(icon, size: 14, color: AppColors.textSecondary),
        const SizedBox(width: 4),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: AppColors.textSecondary,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

class _TeamAvatars extends StatelessWidget {
  final List<String> names;
  const _TeamAvatars({required this.names});

  @override
  Widget build(BuildContext context) {
    final display = names.take(3).toList();
    final overflow = names.length - 3;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < display.length; i++)
          Padding(
            padding: EdgeInsets.only(left: i == 0 ? 0 : 4),
            child: Tooltip(
              message: display[i],
              child: CircleAvatar(
                radius: 13,
                backgroundColor: _avatarColor(i),
                child: Text(
                  _initials(display[i]),
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: AppColors.white,
                  ),
                ),
              ),
            ),
          ),
        if (overflow > 0)
          Padding(
            padding: const EdgeInsets.only(left: 4),
            child: CircleAvatar(
              radius: 13,
              backgroundColor: AppColors.disabled,
              child: Text(
                '+$overflow',
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: AppColors.white,
                ),
              ),
            ),
          ),
      ],
    );
  }

  String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  Color _avatarColor(int index) {
    const palette = [AppColors.primary, AppColors.info, AppColors.secondary];
    return palette[index % palette.length];
  }
}

enum _TimeGroup {
  today('Today', Icons.today_rounded, AppColors.primary),
  thisWeek('This Week', Icons.date_range_rounded, AppColors.info),
  upcoming('Upcoming', Icons.upcoming_rounded, AppColors.secondary),
  past('Past', Icons.history_rounded, AppColors.textSecondary);

  final String label;
  final IconData icon;
  final Color color;
  const _TimeGroup(this.label, this.icon, this.color);
}

class _FilterChipData {
  final String value;
  final String label;
  final int count;
  const _FilterChipData(this.value, this.label, this.count);
}
