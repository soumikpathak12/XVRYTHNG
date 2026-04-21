import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dio/dio.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_colors.dart';
import '../../core/config/api_config.dart';
import '../../providers/projects_provider.dart';
import '../../services/projects_service.dart';
import '../../services/employees_service.dart';
import '../../services/installation_service.dart';
import '../../services/expense_service.dart';
import '../../models/project.dart';
import '../../models/expense.dart';
import '../../models/employee.dart';
import '../../models/installation_job.dart';
import 'project_edit_screen.dart';
import '../../widgets/common/status_badge.dart';
import '../../widgets/common/empty_state.dart';
import '../../widgets/common/file_picker_bottom_sheet.dart';
import '../../widgets/common/shell_scaffold_scope.dart';
import '../../widgets/common/project_milestone_progress.dart';

class ProjectDetailScreen extends StatefulWidget {
  final int projectId;

  const ProjectDetailScreen({super.key, required this.projectId});

  @override
  State<ProjectDetailScreen> createState() => _ProjectDetailScreenState();
}

class _ProjectDetailScreenState extends State<ProjectDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _service = ProjectsService();
  final _employeesService = EmployeesService();
  Map<String, dynamic>? _schedule;
  List<int> _assigneeIds = const [];
  Map<int, String> _assigneeNames = const {};
  List<InstallationJob> _installationJobs = const [];
  bool _updatingScheduleAssign = false;
  List<Map<String, dynamic>> _notes = const [];
  List<Map<String, dynamic>> _documents = const [];
  bool _isStageUpdating = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 7, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProjectsProvider>().loadProjectDetail(widget.projectId);
      _loadAux();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Project Details'),
        actions: [
          Consumer<ProjectsProvider>(
            builder: (context, provider, _) {
              final data = _resolveData(provider);
              final stage = (data['stage'] ?? 'new').toString();
              return PopupMenuButton<String>(
                tooltip: 'Change status',
                initialValue: stage,
                enabled: !_isStageUpdating,
                onSelected: (next) async {
                  if (next == stage) return;
                  try {
                    final allow = await _canMoveToStage(data, stage, next);
                    if (!allow) return;
                    setState(() => _isStageUpdating = true);
                    await context.read<ProjectsProvider>().updateProjectStage(
                      widget.projectId,
                      next,
                    );
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Project status updated'),
                        backgroundColor: AppColors.success,
                      ),
                    );
                  } catch (e) {
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Failed to update status: $e')),
                    );
                  } finally {
                    if (mounted) setState(() => _isStageUpdating = false);
                  }
                },
                itemBuilder: (_) => Project.stages
                    .map(
                      (s) => PopupMenuItem(
                        value: s,
                        child: Text(Project.stageLabels[s] ?? s),
                      ),
                    )
                    .toList(),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Row(
                    children: [
                      StatusBadge.fromStatus(stage),
                      const SizedBox(width: 6),
                      const Icon(Icons.arrow_drop_down),
                    ],
                  ),
                ),
              );
            },
          ),
          IconButton(
            tooltip: 'Edit',
            icon: const Icon(Icons.edit_outlined),
            onPressed: () async {
              final provider = context.read<ProjectsProvider>();
              final data = _resolveData(provider);
              final ok = await Navigator.of(context).push<bool>(
                MaterialPageRoute(
                  builder: (_) => ProjectEditScreen(
                    projectId: widget.projectId,
                    initialData: data,
                  ),
                ),
              );
              if (ok == true && context.mounted) {
                await context.read<ProjectsProvider>().loadProjectDetail(
                  widget.projectId,
                );
                await _loadAux();
              }
            },
          ),
          ...ShellScaffoldScope.notificationActions(),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.white,
          unselectedLabelColor: Colors.white70,
          indicatorColor: AppColors.white,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Financial'),
            Tab(text: 'Schedule & Assign'),
            Tab(text: 'Expenses'),
            Tab(text: 'Documents'),
            Tab(text: 'Communication'),
            Tab(text: 'Activity'),
          ],
        ),
      ),
      body: Consumer<ProjectsProvider>(
        builder: (context, provider, _) {
          if (provider.detailLoading && provider.projectDetail == null) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            );
          }
          if (provider.error != null && provider.projectDetail == null) {
            return EmptyState(
              icon: Icons.error_outline,
              title: 'Failed to load project',
              subtitle: provider.error,
              actionLabel: 'Retry',
              onAction: () => provider.loadProjectDetail(widget.projectId),
            );
          }
          final data = _resolveData(provider);
          return TabBarView(
            controller: _tabController,
            children: [
              _OverviewTab(data: data),
              _FinancialTab(data: data),
              _ScheduleAssignTab(
                data: data,
                schedule: _schedule,
                assigneeIds: _assigneeIds,
                assigneeNames: _assigneeNames,
                installationJobs: _installationJobs,
                onEdit: _updatingScheduleAssign
                    ? null
                    : () => _openScheduleAssignEditor(data),
              ),
              _ExpensesTab(projectId: widget.projectId),
              _DocumentsTab(
                projectId: widget.projectId,
                data: {...data, 'documents': _documents},
              ),
              _CommunicationTab(data: {...data, 'communications': _notes}),
              _TimelineTab(data: data),
            ],
          );
        },
      ),
    );
  }

  Map<String, dynamic> _resolveData(ProjectsProvider provider) {
    final detail = provider.projectDetail;
    if (detail == null) return {};
    return (detail['data'] is Map)
        ? Map<String, dynamic>.from(detail['data'])
        : detail;
  }

  Future<void> _loadAux() async {
    try {
      final out = await Future.wait([
        _service.getScheduleAssign(widget.projectId),
        _service.getProjectNotes(widget.projectId),
        _service.getProjectDocuments(widget.projectId),
        _employeesService.listEmployees(),
        InstallationService().listJobsByProject(widget.projectId),
      ]);
      if (!mounted) return;
      final sched = out[0] as Map<String, dynamic>;
      final notes = out[1] as List<Map<String, dynamic>>;
      final docs = out[2] as List<Map<String, dynamic>>;
      final employees = out[3] as List<Employee>;
      final jobs = out[4] as List<InstallationJob>;
      final idsRaw = sched['assignees'];
      final nameMap = <int, String>{
        for (final e in employees) e.id: e.fullName.trim(),
      };
      setState(() {
        _schedule = sched['schedule'] is Map
            ? Map<String, dynamic>.from(sched['schedule'])
            : null;
        _assigneeIds = idsRaw is List
            ? idsRaw
                  .map((e) => int.tryParse(e.toString()) ?? 0)
                  .where((e) => e > 0)
                  .toList()
            : const [];
        _assigneeNames = nameMap;
        _notes = notes;
        _documents = docs;
        _installationJobs = jobs;
      });
    } catch (_) {}
  }

  Future<void> _openScheduleAssignEditor(Map<String, dynamic> data) async {
    final scheduledRaw = _schedule?['scheduled_at'] ?? data['scheduled_at'];
    final parsed = _tryParseDateTime(scheduledRaw);

    final jobs = _installationJobs
        .where((j) => j.projectId == widget.projectId && j.scheduledDate != null)
        .toList()
      ..sort((a, b) {
        final da = DateTime(
          a.scheduledDate!.year,
          a.scheduledDate!.month,
          a.scheduledDate!.day,
        );
        final db = DateTime(
          b.scheduledDate!.year,
          b.scheduledDate!.month,
          b.scheduledDate!.day,
        );
        return da.compareTo(db);
      });

    DateTime? selectedDate =
        jobs.isNotEmpty ? jobs.first.scheduledDate : parsed;
    TimeOfDay? selectedTime;
    if (jobs.isNotEmpty && (jobs.first.scheduledTime ?? '').isNotEmpty) {
      final t = jobs.first.scheduledTime!.split(':');
      selectedTime = TimeOfDay(
        hour: int.tryParse(t.first) ?? 0,
        minute: t.length > 1 ? (int.tryParse(t[1]) ?? 0) : 0,
      );
    } else if (parsed != null) {
      selectedTime = TimeOfDay(hour: parsed.hour, minute: parsed.minute);
    }

    final notesCtrl = TextEditingController(
      text: _schedule?['notes']?.toString() ?? '',
    );
    Set<int> parseTeamMemberIds(InstallationJob job) {
      final rawIds = job.raw?['team_member_ids'];
      if (rawIds == null) return <int>{};
      return rawIds
          .toString()
          .split(',')
          .map((e) => int.tryParse(e.trim()) ?? 0)
          .where((e) => e > 0)
          .toSet();
    }

    final selectedAssignees = jobs.isNotEmpty
        ? parseTeamMemberIds(jobs.first)
        : _assigneeIds.toSet();
    final bool initialMultiDay = jobs.length > 1;
    bool bookConsecutiveDays = initialMultiDay;
    int consecutiveDays = initialMultiDay
        ? jobs.length.clamp(2, 5)
        : 2;
    bool copyAssigneesFromDay1 = true;
    bool copyTimeFromDay1 = true;
    final Map<int, Set<int>> followingDayAssignees = {};
    final Map<int, TimeOfDay?> followingDayTimes = {};

    for (var i = 1; i < jobs.length && i < 5; i++) {
      followingDayAssignees[i] = parseTeamMemberIds(jobs[i]);
      final ts = jobs[i].scheduledTime;
      if (ts != null && ts.isNotEmpty) {
        final parts = ts.split(':');
        followingDayTimes[i] = TimeOfDay(
          hour: int.tryParse(parts.first) ?? 0,
          minute: parts.length > 1 ? (int.tryParse(parts[1]) ?? 0) : 0,
        );
      }
    }
    if (jobs.length > 1) {
      final sortedDay1 = [...selectedAssignees]..sort();
      copyAssigneesFromDay1 = true;
      for (var i = 1; i < consecutiveDays; i++) {
        final s = <int>{...?followingDayAssignees[i]};
        final sorted = [...s]..sort();
        if (sorted.length != sortedDay1.length) {
          copyAssigneesFromDay1 = false;
          break;
        }
        for (var k = 0; k < sorted.length; k++) {
          if (sorted[k] != sortedDay1[k]) {
            copyAssigneesFromDay1 = false;
            break;
          }
        }
        if (!copyAssigneesFromDay1) break;
      }
      copyTimeFromDay1 = true;
      for (var i = 1; i < consecutiveDays; i++) {
        final t = followingDayTimes[i];
        if (t == null ||
            selectedTime == null ||
            t.hour != selectedTime.hour ||
            t.minute != selectedTime.minute) {
          copyTimeFromDay1 = false;
          break;
        }
      }
    }

    Future<void> pickDate(StateSetter setSheetState) async {
      final now = DateTime.now();
      final picked = await showDatePicker(
        context: context,
        initialDate: selectedDate ?? now,
        firstDate: DateTime(now.year - 1),
        lastDate: DateTime(now.year + 5),
      );
      if (picked != null) {
        setSheetState(() => selectedDate = picked);
      }
    }

    Future<void> pickTime(StateSetter setSheetState) async {
      final picked = await showTimePicker(
        context: context,
        initialTime: selectedTime ?? TimeOfDay.now(),
      );
      if (picked != null) {
        setSheetState(() => selectedTime = picked);
      }
    }

    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (sheetCtx) {
        return StatefulBuilder(
          builder: (sheetCtx, setSheetState) {
            final media = MediaQuery.of(sheetCtx);
            final dateLabel = selectedDate == null
                ? 'Choose date'
                : DateFormat('dd/MM/yyyy').format(selectedDate!);
            final timeLabel = selectedTime == null
                ? 'Choose time'
                : selectedTime!.format(sheetCtx);
            return Padding(
              padding: EdgeInsets.fromLTRB(
                16,
                16,
                16,
                media.viewInsets.bottom + 20,
              ),
              child: SafeArea(
                top: false,
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        'Update Schedule & Assign',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      CheckboxListTile(
                        contentPadding: EdgeInsets.zero,
                        value: bookConsecutiveDays,
                        title: const Text('Book consecutive days'),
                        dense: true,
                        onChanged: (v) {
                          setSheetState(() {
                            bookConsecutiveDays = v == true;
                            if (bookConsecutiveDays && consecutiveDays < 2) {
                              consecutiveDays = 2;
                            }
                          });
                        },
                      ),
                      if (bookConsecutiveDays) ...[
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            const Text(
                              'Days',
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(width: 10),
                            DropdownButton<int>(
                              value: consecutiveDays.clamp(2, 5),
                              items: const [
                                DropdownMenuItem(value: 2, child: Text('2')),
                                DropdownMenuItem(value: 3, child: Text('3')),
                                DropdownMenuItem(value: 4, child: Text('4')),
                                DropdownMenuItem(value: 5, child: Text('5')),
                              ],
                              onChanged: (v) {
                                if (v == null) return;
                                setSheetState(() => consecutiveDays = v);
                              },
                            ),
                          ],
                        ),
                        CheckboxListTile(
                          contentPadding: EdgeInsets.zero,
                          value: copyTimeFromDay1,
                          title: const Text('Copy time from Day 1'),
                          dense: true,
                          onChanged: (v) {
                            setSheetState(() => copyTimeFromDay1 = v == true);
                          },
                        ),
                      ],
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => pickDate(setSheetState),
                              icon: const Icon(Icons.calendar_today_outlined),
                              label: Text(dateLabel),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => pickTime(setSheetState),
                              icon: const Icon(Icons.access_time_outlined),
                              label: Text(timeLabel),
                            ),
                          ),
                        ],
                      ),
                      if (bookConsecutiveDays && !copyTimeFromDay1) ...[
                        const SizedBox(height: 10),
                        const Text(
                          'Scheduled Time (Following days)',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        ...List.generate(consecutiveDays - 1, (i) {
                          final offset = i + 1;
                          final dayDate = selectedDate == null
                              ? null
                              : selectedDate!.add(Duration(days: offset));
                          final dayLabel = dayDate == null
                              ? 'Day ${offset + 1}'
                              : 'Day ${offset + 1} — ${DateFormat('yyyy-MM-dd').format(dayDate)}';
                          final t = followingDayTimes[offset];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: OutlinedButton.icon(
                              onPressed: () async {
                                final picked = await showTimePicker(
                                  context: context,
                                  initialTime: t ?? selectedTime ?? TimeOfDay.now(),
                                );
                                if (picked != null) {
                                  setSheetState(() => followingDayTimes[offset] = picked);
                                }
                              },
                              icon: const Icon(Icons.access_time_outlined),
                              label: Text(
                                '$dayLabel  •  ${t == null ? '--:--' : t.format(sheetCtx)}',
                              ),
                            ),
                          );
                        }),
                      ],
                      const SizedBox(height: 12),
                      TextField(
                        controller: notesCtrl,
                        minLines: 2,
                        maxLines: 4,
                        decoration: const InputDecoration(
                          labelText: 'Notes',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 14),
                      if (bookConsecutiveDays) ...[
                        CheckboxListTile(
                          contentPadding: EdgeInsets.zero,
                          value: copyAssigneesFromDay1,
                          title: const Text('Copy assignees from Day 1'),
                          dense: true,
                          onChanged: (v) {
                            setSheetState(
                              () => copyAssigneesFromDay1 = v == true,
                            );
                          },
                        ),
                        const SizedBox(height: 8),
                      ],
                      const Text(
                        'Assignees (Day 1)',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      if (_assigneeNames.isEmpty)
                        const Text(
                          'No employees found',
                          style: TextStyle(color: AppColors.textSecondary),
                        )
                      else ...[
                        DropdownButtonFormField<int>(
                          value: null,
                          decoration: const InputDecoration(
                            labelText: 'Add assignee',
                            border: OutlineInputBorder(),
                          ),
                          items: _assigneeNames.entries
                              .map(
                                (entry) => DropdownMenuItem<int>(
                                  value: entry.key,
                                  child: Text(
                                    entry.value.isEmpty
                                        ? '#${entry.key}'
                                        : '${entry.value} (#${entry.key})',
                                  ),
                                ),
                              )
                              .toList(),
                          onChanged: (pickedId) {
                            if (pickedId == null) return;
                            setSheetState(() => selectedAssignees.add(pickedId));
                          },
                        ),
                        const SizedBox(height: 8),
                        if (selectedAssignees.isEmpty)
                          const Text(
                            'No assignee selected',
                            style: TextStyle(color: AppColors.textSecondary),
                          )
                        else
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: selectedAssignees.map((id) {
                              final label = _assigneeNames[id];
                              return Chip(
                                label: Text(
                                  (label == null || label.isEmpty)
                                      ? '#$id'
                                      : '$label (#$id)',
                                ),
                                onDeleted: () =>
                                    setSheetState(() => selectedAssignees.remove(id)),
                              );
                            }).toList(),
                          ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            OutlinedButton(
                              onPressed: () => setSheetState(
                                () => selectedAssignees
                                  ..clear()
                                  ..addAll(_assigneeNames.keys),
                              ),
                              child: const Text('Select all'),
                            ),
                            const SizedBox(width: 8),
                            OutlinedButton(
                              onPressed: () =>
                                  setSheetState(() => selectedAssignees.clear()),
                              child: const Text('Clear'),
                            ),
                          ],
                        ),
                      ],
                      if (bookConsecutiveDays && !copyAssigneesFromDay1) ...[
                        const SizedBox(height: 8),
                        const Text(
                          'Assignees (Following days)',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        ...List.generate(consecutiveDays - 1, (i) {
                          final offset = i + 1;
                          final dayDate = selectedDate == null
                              ? null
                              : selectedDate!.add(Duration(days: offset));
                          final dayLabel = dayDate == null
                              ? 'Day ${offset + 1}'
                              : 'Day ${offset + 1} — ${DateFormat('yyyy-MM-dd').format(dayDate)}';
                          final daySet = followingDayAssignees[offset] ?? <int>{};
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                dayLabel,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                              const SizedBox(height: 4),
                              if (_assigneeNames.isEmpty)
                                const Text(
                                  'No employees found',
                                  style: TextStyle(color: AppColors.textSecondary),
                                )
                              else ...[
                                DropdownButtonFormField<int>(
                                  value: null,
                                  decoration: const InputDecoration(
                                    labelText: 'Add assignee',
                                    border: OutlineInputBorder(),
                                  ),
                                  items: _assigneeNames.entries
                                      .map(
                                        (entry) => DropdownMenuItem<int>(
                                          value: entry.key,
                                          child: Text(
                                            entry.value.isEmpty
                                                ? '#${entry.key}'
                                                : '${entry.value} (#${entry.key})',
                                          ),
                                        ),
                                      )
                                      .toList(),
                                  onChanged: (pickedId) {
                                    if (pickedId == null) return;
                                    setSheetState(() {
                                      final target =
                                          followingDayAssignees[offset] ?? <int>{};
                                      target.add(pickedId);
                                      followingDayAssignees[offset] = target;
                                    });
                                  },
                                ),
                                const SizedBox(height: 8),
                                if (daySet.isEmpty)
                                  const Text(
                                    'No assignee selected',
                                    style: TextStyle(color: AppColors.textSecondary),
                                  )
                                else
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: daySet.map((id) {
                                      final label = _assigneeNames[id];
                                      return Chip(
                                        label: Text(
                                          (label == null || label.isEmpty)
                                              ? '#$id'
                                              : '$label (#$id)',
                                        ),
                                        onDeleted: () {
                                          setSheetState(() {
                                            final target = followingDayAssignees[offset] ?? <int>{};
                                            target.remove(id);
                                            followingDayAssignees[offset] = target;
                                          });
                                        },
                                      );
                                    }).toList(),
                                  ),
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    OutlinedButton(
                                      onPressed: () {
                                        setSheetState(() {
                                          followingDayAssignees[offset] = {
                                            ..._assigneeNames.keys,
                                          };
                                        });
                                      },
                                      child: const Text('Select all'),
                                    ),
                                    const SizedBox(width: 8),
                                    OutlinedButton(
                                      onPressed: () {
                                        setSheetState(() {
                                          followingDayAssignees[offset] = <int>{};
                                        });
                                      },
                                      child: const Text('Clear'),
                                    ),
                                  ],
                                ),
                              ],
                              const SizedBox(height: 6),
                            ],
                          );
                        }),
                      ],
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => Navigator.pop(sheetCtx, false),
                              child: const Text('Cancel'),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: FilledButton(
                              onPressed: () {
                                if (selectedDate == null ||
                                    selectedTime == null) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text(
                                        'Please choose date and time',
                                      ),
                                      backgroundColor: AppColors.danger,
                                    ),
                                  );
                                  return;
                                }
                                if (bookConsecutiveDays && !copyTimeFromDay1) {
                                  for (var i = 1; i < consecutiveDays; i++) {
                                    if (followingDayTimes[i] == null) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Text(
                                            'Please choose time for Day ${i + 1}',
                                          ),
                                          backgroundColor: AppColors.danger,
                                        ),
                                      );
                                      return;
                                    }
                                  }
                                }
                                Navigator.pop(sheetCtx, true);
                              },
                              child: const Text('Save'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );

    if (saved != true || !mounted) {
      notesCtrl.dispose();
      return;
    }
    if (selectedDate == null || selectedTime == null) {
      notesCtrl.dispose();
      return;
    }

    final timeFormatted =
        '${selectedTime!.hour.toString().padLeft(2, '0')}:${selectedTime!.minute.toString().padLeft(2, '0')}';

    try {
      setState(() => _updatingScheduleAssign = true);
      final scheduleDays = <Map<String, dynamic>>[];
      final totalDays = bookConsecutiveDays ? consecutiveDays : 1;
      for (var i = 0; i < totalDays; i++) {
        final dayDate = selectedDate!.add(Duration(days: i));
        final dayTime = i == 0
            ? selectedTime
            : (copyTimeFromDay1
                ? selectedTime
                : followingDayTimes[i]);
        final dayTimeFormatted =
            '${dayTime!.hour.toString().padLeft(2, '0')}:${dayTime.minute.toString().padLeft(2, '0')}';
        final dayAssignees = i == 0
            ? selectedAssignees
            : (copyAssigneesFromDay1
                ? selectedAssignees
                : (followingDayAssignees[i] ?? <int>{}));
        scheduleDays.add({
          'date': DateFormat('yyyy-MM-dd').format(dayDate),
          'time': dayTimeFormatted,
          'assignees': dayAssignees.toList(),
        });
      }

      await _service.updateScheduleAssign(widget.projectId, {
        'date': DateFormat('yyyy-MM-dd').format(selectedDate!),
        'time': timeFormatted,
        'notes': notesCtrl.text.trim().isEmpty ? null : notesCtrl.text.trim(),
        'assignees': selectedAssignees.toList(),
        if (bookConsecutiveDays) 'schedule_days': scheduleDays,
      });
      if (!mounted) return;
      await context.read<ProjectsProvider>().loadProjectDetail(
        widget.projectId,
      );
      await _loadAux();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Schedule & assignees updated'),
          backgroundColor: AppColors.success,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to update schedule/assign: $e'),
          backgroundColor: AppColors.danger,
        ),
      );
    } finally {
      notesCtrl.dispose();
      if (mounted) setState(() => _updatingScheduleAssign = false);
    }
  }

  DateTime? _tryParseDateTime(dynamic value) {
    if (value == null) return null;
    final raw = value.toString().trim();
    if (raw.isEmpty) return null;
    return DateTime.tryParse(raw.replaceFirst(' ', 'T'));
  }

  Future<bool> _canMoveToStage(
    Map<String, dynamic> data,
    String currentStage,
    String nextStage,
  ) async {
    final order = Project.stages;
    final from = order.indexOf(currentStage);
    final to = order.indexOf(nextStage);
    final isForwardMove = from != -1 && to != -1 && to > from;

    if (isForwardMove) {
      final preApprovalRef =
          (data['lead_pre_approval_reference_no'] ??
                  data['pre_approval_reference_no'] ??
                  '')
              .toString()
              .trim();
      final solarVic =
          data['lead_solar_vic_eligibility'] ?? data['solar_vic_eligibility'];
      final hasSolarVic = solarVic != null && solarVic.toString().isNotEmpty;

      if (preApprovalRef.isEmpty || !hasSolarVic) {
        if (!mounted) return false;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Pre-approval reference number and Solar Vic eligibility are required before moving to the next stage.',
            ),
            backgroundColor: AppColors.danger,
          ),
        );
        return false;
      }
    }

    final gridIdx = order.indexOf('grid_connection_initiated');
    if (from != -1 && to != -1 && gridIdx != -1 && to > gridIdx) {
      final postInstallRef = (data['post_install_reference_no'] ?? '')
          .toString()
          .trim();
      if (postInstallRef.isEmpty) {
        if (!mounted) return false;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Post-install reference number is required before moving past GRID Connection Initiated.',
            ),
            backgroundColor: AppColors.danger,
          ),
        );
        return false;
      }
      final docs = await _service.getProjectDocuments(widget.projectId);
      if (docs.isEmpty) {
        if (!mounted) return false;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Upload at least one project document before moving past GRID Connection Initiated.',
            ),
            backgroundColor: AppColors.danger,
          ),
        );
        return false;
      }
    }
    return true;
  }
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------
class _OverviewTab extends StatelessWidget {
  final Map<String, dynamic> data;

  const _OverviewTab({required this.data});

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) {
      return const EmptyState(
        icon: Icons.info_outline,
        title: 'No project data',
      );
    }

    final stage = (data['stage'] ?? 'new').toString();
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeader(context, stage),
          const SizedBox(height: 20),
          ProjectMilestoneProgress(currentStage: stage),
          // Summary cards matching web app Overview layout
          _buildSummaryCards(data),
          const SizedBox(height: 16),
          _SectionCard(
            title: 'Project Information',
            icon: Icons.inventory_2_outlined,
            children: [
              _DetailRow('Project ID', (data['id'] ?? '-').toString()),
              _DetailRow(
                'Stage',
                Project.stageLabels[data['stage']?.toString()] ??
                    data['stage']?.toString() ??
                    '-',
              ),
              _DetailRow(
                'Expected Completion',
                _read(data, const ['expected_completion_date']),
              ),
              _DetailRow('Created', _formatDate(data['created_at'])),
            ],
          ),
          const SizedBox(height: 12),
          _SectionCard(
            title: 'Customer Details',
            icon: Icons.person_outline,
            children: [
              _DetailRow(
                'Customer',
                _read(data, const ['customer_name', 'customerName']),
              ),
              _DetailRow('Email', _read(data, const ['lead_email', 'email'])),
              _DetailRow('Phone', _read(data, const ['lead_phone', 'phone'])),
              _DetailRow(
                'Suburb',
                _read(data, const ['lead_suburb', 'suburb']),
              ),
              _DetailRow(
                'Source',
                _read(data, const ['lead_source', 'source']),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _SectionCard(
            title: 'System Specifications',
            icon: Icons.solar_power_outlined,
            children: [
              _DetailRow(
                'System Size',
                _read(data, const ['lead_system_size_kw', 'system_size_kw']),
              ),
              _DetailRow(
                'System Type',
                _read(data, const ['lead_system_type', 'system_type']),
              ),
              _DetailRow(
                'Value',
                _formatCurrency(
                  data['lead_value_amount'] ??
                      data['value_amount'] ??
                      data['value'],
                ),
              ),
              _DetailRow(
                'PV Inverter',
                _read(data, const [
                  'lead_pv_inverter_brand',
                  'pv_inverter_brand',
                ]),
              ),
              _DetailRow(
                'PV Panel',
                _read(data, const ['lead_pv_panel_brand', 'pv_panel_brand']),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _SectionCard(
            title: 'Property Characteristics',
            icon: Icons.home_work_outlined,
            children: [
              _DetailRow(
                'House Storey',
                _read(data, const ['lead_house_storey', 'house_storey']),
              ),
              _DetailRow(
                'Roof Type',
                _read(data, const ['lead_roof_type', 'roof_type']),
              ),
              _DetailRow(
                'Meter Phase',
                _read(data, const ['lead_meter_phase', 'meter_phase']),
              ),
              _DetailRow(
                '2nd Storey Access',
                _boolLabel(data['lead_access_to_second_storey']),
              ),
              _DetailRow(
                'Inverter Access',
                _boolLabel(data['lead_access_to_inverter']),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _SectionCard(
            title: 'Utility Information',
            icon: Icons.electric_bolt_outlined,
            children: [
              _DetailRow(
                'Pre-Approval Ref',
                _read(data, const [
                  'lead_pre_approval_reference_no',
                  'pre_approval_reference_no',
                ]),
              ),
              _DetailRow(
                'Post-Install Ref',
                _read(data, const ['post_install_reference_no']),
              ),
              _DetailRow(
                'Energy Retailer',
                _read(data, const ['lead_energy_retailer', 'energy_retailer']),
              ),
              _DetailRow(
                'Energy Distributor',
                _read(data, const [
                  'lead_energy_distributor',
                  'energy_distributor',
                ]),
              ),
              _DetailRow(
                'Solar Vic Eligibility',
                _boolLabel(data['lead_solar_vic_eligibility']),
              ),
              _DetailRow(
                'NMI Number',
                _read(data, const ['lead_nmi_number', 'nmi_number']),
              ),
              _DetailRow(
                'Meter Number',
                _read(data, const ['lead_meter_number', 'meter_number']),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context, String stage) {
    return Row(
      children: [
        Expanded(
          child: Text(
            data['customer_name'] ?? data['customerName'] ?? 'Project',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
        ),
        StatusBadge.fromStatus(stage),
      ],
    );
  }

  Widget _buildSummaryCards(Map<String, dynamic> data) {
    final location = _read(data, const ['lead_suburb', 'suburb', 'address']);
    final systemSizeRaw = data['lead_system_size_kw'] ?? data['system_size_kw'];
    final systemSize = systemSizeRaw != null ? '$systemSizeRaw kW' : '—';
    final costRaw = data['approved_expense_total'];
    final cost = costRaw != null ? _formatCurrency(costRaw) : '—';

    return Row(
      children: [
        Expanded(
          child: _SummaryStatCard(
            icon: Icons.location_on_outlined,
            label: 'Location',
            value: location,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _SummaryStatCard(
            icon: Icons.solar_power_outlined,
            label: 'System Size',
            value: systemSize,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _SummaryStatCard(
            icon: Icons.attach_money,
            label: 'Cost',
            value: cost,
          ),
        ),
      ],
    );
  }

  String _read(Map<String, dynamic> m, List<String> keys) {
    for (final k in keys) {
      final v = m[k];
      if (v != null && v.toString().trim().isNotEmpty) return v.toString();
    }
    return '-';
  }

  String _boolLabel(dynamic v) {
    if (v == null || v.toString().isEmpty) return '-';
    if (v is bool) return v ? 'Yes' : 'No';
    final s = v.toString().toLowerCase();
    return (s == '1' || s == 'true')
        ? 'Yes'
        : (s == '0' || s == 'false' ? 'No' : v.toString());
  }

  String _formatCurrency(dynamic val) {
    if (val == null) return '-';
    final num v = val is num ? val : num.tryParse(val.toString()) ?? 0;
    return '\$${v.toStringAsFixed(0)}';
  }

  String _formatDate(dynamic val) {
    if (val == null) return '-';
    final dt = DateTime.tryParse(val.toString());
    if (dt == null) return val.toString();
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}

class _FinancialTab extends StatelessWidget {
  final Map<String, dynamic> data;
  const _FinancialTab({required this.data});

  @override
  Widget build(BuildContext context) {
    final revenue =
        data['lead_value_amount'] ?? data['value_amount'] ?? data['value'];
    final cost = data['approved_expense_total'];
    final r = (revenue is num)
        ? revenue.toDouble()
        : double.tryParse('${revenue ?? 0}') ?? 0;
    final c = (cost is num)
        ? cost.toDouble()
        : double.tryParse('${cost ?? 0}') ?? 0;
    final margin = r - c;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: _SectionCard(
        title: 'Financial',
        icon: Icons.attach_money,
        children: [
          _DetailRow('Estimated Revenue', _fmt(r)),
          _DetailRow('Approved Cost', _fmt(c)),
          _DetailRow('Gross Margin', _fmt(margin)),
        ],
      ),
    );
  }

  String _fmt(double v) => '\$${v.toStringAsFixed(0)}';
}

// ---------------------------------------------------------------------------
// Expenses Tab
// ---------------------------------------------------------------------------
class _ExpensesTab extends StatefulWidget {
  final int projectId;
  const _ExpensesTab({required this.projectId});

  @override
  State<_ExpensesTab> createState() => _ExpensesTabState();
}

class _ExpensesTabState extends State<_ExpensesTab>
    with AutomaticKeepAliveClientMixin {
  final _installationService = InstallationService();
  final _expenseService = ExpenseService();
  bool _loading = true;
  List<Expense> _expenses = [];
  String? _error;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _loadExpenses();
  }

  Future<void> _loadExpenses() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      // 1. Fetch installation jobs linked to this project
      final projectJobs = await _installationService.listJobsByProject(
        widget.projectId,
      );

      // 2. Fetch expenses for each job
      final allExpenses = <Expense>[];
      for (final job in projectJobs) {
        try {
          final jobExpenses = await _expenseService.getJobExpenses(job.id);
          allExpenses.addAll(jobExpenses);
        } catch (_) {
          // Skip jobs that fail
        }
      }

      // Also try fetching the current user's own expenses for this project
      // via the /my endpoint, in case there are expenses not linked to a job
      try {
        final myExpenses = await _expenseService.getMyExpenses();
        // Add any expenses not already in the list
        final existingIds = allExpenses.map((e) => e.id).toSet();
        for (final exp in myExpenses) {
          if (!existingIds.contains(exp.id)) {
            // Only include expenses matching this project by name
            final pName = exp.projectName ?? '';
            if (pName.toLowerCase().contains('installation job') ||
                exp.projectId == widget.projectId) {
              allExpenses.add(exp);
              existingIds.add(exp.id);
            }
          }
        }
      } catch (_) {}

      // Sort by date descending
      allExpenses.sort((a, b) {
        final da = a.createdAt ?? DateTime(2000);
        final db = b.createdAt ?? DateTime(2000);
        return db.compareTo(da);
      });

      if (!mounted) return;
      setState(() {
        _expenses = allExpenses;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }
    if (_error != null) {
      return EmptyState(
        icon: Icons.error_outline,
        title: 'Failed to load expenses',
        subtitle: _error,
        actionLabel: 'Retry',
        onAction: _loadExpenses,
      );
    }
    if (_expenses.isEmpty) {
      return const EmptyState(
        icon: Icons.receipt_long_outlined,
        title: 'No expenses yet',
        subtitle:
            'Expense claims linked to this project\'s installation jobs will appear here.',
      );
    }

    final currencyFmt = NumberFormat.currency(symbol: '\$', decimalDigits: 2);
    final approvedTotal = _expenses
        .where((e) => e.status == 'approved')
        .fold<double>(0, (sum, e) => sum + e.amount);
    final pendingTotal = _expenses
        .where((e) => e.status == 'pending')
        .fold<double>(0, (sum, e) => sum + e.amount);

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: _loadExpenses,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Summary row
          Row(
            children: [
              Expanded(
                child: _ExpenseSummaryCard(
                  label: 'Approved',
                  value: currencyFmt.format(approvedTotal),
                  color: AppColors.success,
                  icon: Icons.check_circle_outline,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _ExpenseSummaryCard(
                  label: 'Pending',
                  value: currencyFmt.format(pendingTotal),
                  color: AppColors.warning,
                  icon: Icons.hourglass_empty_rounded,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _ExpenseSummaryCard(
                  label: 'Total Claims',
                  value: '${_expenses.length}',
                  color: AppColors.primary,
                  icon: Icons.receipt_long_outlined,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text(
            'Expense Claims',
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          ..._expenses.map((expense) {
            final desc = expense.description?.trim().isNotEmpty == true
                ? expense.description!
                : (Expense.categoryLabels[expense.category] ??
                      expense.category);
            final isApproved = expense.status == 'approved';
            final isPending = expense.status == 'pending';
            final isRejected = expense.status == 'rejected';
            final receiptUrl = expense.receiptPath == null
                ? null
                : expense.receiptPath!.startsWith('http')
                ? expense.receiptPath!
                : '${ApiConfig.baseUrl}${expense.receiptPath}';
            final isImage =
                receiptUrl != null &&
                (receiptUrl.toLowerCase().contains('.png') ||
                    receiptUrl.toLowerCase().contains('.jpg') ||
                    receiptUrl.toLowerCase().contains('.jpeg') ||
                    receiptUrl.toLowerCase().contains('.gif') ||
                    receiptUrl.toLowerCase().contains('.webp') ||
                    receiptUrl.contains('/uploads/'));

            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isRejected
                      ? AppColors.danger.withOpacity(0.3)
                      : AppColors.border.withOpacity(0.6),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (receiptUrl != null)
                        ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            width: 44,
                            height: 44,
                            color: AppColors.surface,
                            child: isImage
                                ? Image.network(
                                    receiptUrl,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => const Icon(
                                      Icons.broken_image_outlined,
                                      color: AppColors.disabled,
                                    ),
                                  )
                                : const Icon(
                                    Icons.picture_as_pdf_outlined,
                                    color: AppColors.textSecondary,
                                  ),
                          ),
                        )
                      else
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.08),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(
                            Icons.receipt_outlined,
                            size: 20,
                            color: AppColors.primary,
                          ),
                        ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              desc,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              [
                                if (expense.employeeName != null)
                                  expense.employeeName!,
                                if (expense.expenseDate != null)
                                  DateFormat(
                                    'dd MMM yyyy',
                                  ).format(expense.expenseDate!),
                              ].join(' · '),
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            currencyFmt.format(expense.amount),
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: isApproved
                                  ? AppColors.success
                                  : isRejected
                                  ? AppColors.danger
                                  : AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          StatusBadge.fromStatus(expense.status),
                        ],
                      ),
                    ],
                  ),
                  if (isPending)
                    Container(
                      margin: const EdgeInsets.only(top: 10),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.warning.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: AppColors.warning.withOpacity(0.2),
                        ),
                      ),
                      child: const Text(
                        'Awaiting manager approval. Full details and receipt visible after approval.',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                  if (isRejected &&
                      expense.reviewerNote != null &&
                      expense.reviewerNote!.isNotEmpty)
                    Container(
                      margin: const EdgeInsets.only(top: 10),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.danger.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: AppColors.danger.withOpacity(0.2),
                        ),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(
                            Icons.info_outline,
                            size: 16,
                            color: AppColors.danger,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              expense.reviewerNote!,
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            );
          }),
          const SizedBox(height: 40),
        ],
      ),
    );
  }
}

class _ExpenseSummaryCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final IconData icon;

  const _ExpenseSummaryCard({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: color,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _ScheduleAssignTab extends StatelessWidget {
  final Map<String, dynamic> data;
  final Map<String, dynamic>? schedule;
  final List<int> assigneeIds;
  final Map<int, String> assigneeNames;
  final List<InstallationJob> installationJobs;
  final VoidCallback? onEdit;
  const _ScheduleAssignTab({
    required this.data,
    required this.schedule,
    required this.assigneeIds,
    required this.assigneeNames,
    required this.installationJobs,
    this.onEdit,
  });

  @override
  Widget build(BuildContext context) {
    final projectId = int.tryParse('${data['id'] ?? ''}');
    final dayJobs = installationJobs
        .where((j) => projectId != null && j.projectId == projectId && j.scheduledDate != null)
        .toList()
      ..sort((a, b) {
        final ad = a.scheduledDate!;
        final bd = b.scheduledDate!;
        return DateTime(ad.year, ad.month, ad.day).compareTo(
          DateTime(bd.year, bd.month, bd.day),
        );
      });

    String formatAssigneesForJob(InstallationJob j) {
      final idsRaw = j.raw?['team_member_ids'];
      final ids = idsRaw == null
          ? <int>[]
          : idsRaw
                .toString()
                .split(',')
                .map((e) => int.tryParse(e.trim()) ?? 0)
                .where((e) => e > 0)
                .toList();
      if (ids.isEmpty) return '-';
      return ids
          .map((id) {
            final name = assigneeNames[id]?.trim() ?? '';
            return name.isEmpty ? '#$id' : '$name (#$id)';
          })
          .join(', ');
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          _SectionCard(
            title: 'Schedule',
            icon: Icons.calendar_today_outlined,
            trailing: FilledButton.icon(
              onPressed: onEdit,
              icon: const Icon(Icons.edit_calendar_outlined, size: 16),
              label: const Text('Edit'),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                minimumSize: Size.zero,
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
              ),
            ),
            children: [
              _DetailRow(
                'Status',
                schedule?['status']?.toString() ??
                    data['schedule_status']?.toString() ??
                    '-',
              ),
              _DetailRow(
                'Scheduled At',
                _fmt(schedule?['scheduled_at'] ?? data['scheduled_at']),
              ),
              _DetailRow('Notes', schedule?['notes']?.toString() ?? '-'),
            ],
          ),
          const SizedBox(height: 12),
          _SectionCard(
            title: 'Assign',
            icon: Icons.group_outlined,
            children: [
              if (dayJobs.isEmpty)
                _DetailRow(
                  'Assignees',
                  assigneeIds.isEmpty
                      ? '-'
                      : assigneeIds
                            .map((id) {
                              final name = assigneeNames[id]?.trim() ?? '';
                              return name.isEmpty ? '#$id' : '$name (#$id)';
                            })
                            .join(', '),
                )
              else
                ...dayJobs.map((j) {
                  final d = j.scheduledDate!;
                  final dayLabel =
                      '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
                  return _DetailRow('Day $dayLabel', formatAssigneesForJob(j));
                }),
            ],
          ),
        ],
      ),
    );
  }

  String _fmt(dynamic v) {
    if (v == null) return '-';
    final dt = DateTime.tryParse(v.toString().replaceFirst(' ', 'T'));
    if (dt == null) return v.toString();
    return '${dt.day}/${dt.month}/${dt.year} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}

// ---------------------------------------------------------------------------
// Documents Tab
// ---------------------------------------------------------------------------
class _DocumentsTab extends StatelessWidget {
  final int projectId;
  final Map<String, dynamic> data;

  const _DocumentsTab({required this.projectId, required this.data});

  @override
  Widget build(BuildContext context) {
    final docs = data['documents'];
    final docList = (docs is List) ? docs : [];

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              const Icon(Icons.folder_outlined, color: AppColors.primary),
              const SizedBox(width: 8),
              Text(
                'Documents (${docList.length})',
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 16,
                  color: AppColors.textPrimary,
                ),
              ),
              const Spacer(),
              FilledButton.icon(
                onPressed: () => _uploadDocument(context),
                icon: const Icon(Icons.upload_file, size: 18),
                label: const Text('Upload'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: docList.isEmpty
              ? const EmptyState(
                  icon: Icons.description_outlined,
                  title: 'No documents yet',
                  subtitle: 'Upload project documents here.',
                )
              : ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: docList.length,
                  separatorBuilder: (_, index) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final doc = docList[index];
                    return ListTile(
                      leading: _docIcon(doc['file_name'] ?? ''),
                      title: Text(
                        doc['file_name'] ?? doc['name'] ?? 'Document',
                        style: const TextStyle(fontSize: 14),
                      ),
                      subtitle: Text(
                        doc['uploaded_at'] ?? doc['created_at'] ?? '',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      trailing: const Icon(
                        Icons.download_outlined,
                        color: AppColors.primary,
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _docIcon(String name) {
    final ext = name.split('.').last.toLowerCase();
    IconData icon;
    Color color;
    switch (ext) {
      case 'pdf':
        icon = Icons.picture_as_pdf;
        color = AppColors.danger;
        break;
      case 'jpg':
      case 'jpeg':
      case 'png':
        icon = Icons.image_outlined;
        color = AppColors.info;
        break;
      case 'doc':
      case 'docx':
        icon = Icons.article_outlined;
        color = AppColors.primary;
        break;
      default:
        icon = Icons.insert_drive_file_outlined;
        color = AppColors.textSecondary;
    }
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Icon(icon, color: color, size: 22),
    );
  }

  Future<void> _uploadDocument(BuildContext context) async {
    final result = await showFilePickerSheet(context);
    if (result == null || !context.mounted) return;

    final formData = FormData.fromMap({
      'document': await MultipartFile.fromFile(
        result.file.path,
        filename: result.name,
      ),
    });

    try {
      await ProjectsService().uploadProjectDocument(projectId, formData);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Document uploaded'),
            backgroundColor: AppColors.success,
          ),
        );
        context.read<ProjectsProvider>().loadProjectDetail(projectId);
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Upload failed: $e'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Timeline Tab
// ---------------------------------------------------------------------------
class _TimelineTab extends StatelessWidget {
  final Map<String, dynamic> data;

  const _TimelineTab({required this.data});

  @override
  Widget build(BuildContext context) {
    final timeline = data['timeline'] ?? data['activities'];
    final events = (timeline is List) ? timeline : [];

    if (events.isEmpty) {
      return const EmptyState(
        icon: Icons.timeline,
        title: 'No timeline events',
        subtitle: 'Activity will appear here as the project progresses.',
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: events.length,
      itemBuilder: (context, index) {
        final event = events[index] is Map ? events[index] : {};
        final isLast = index == events.length - 1;
        return _TimelineItem(
          title: event['title'] ?? event['action'] ?? 'Activity',
          description: event['description'] ?? event['note'] ?? '',
          date: event['created_at'] ?? event['date'] ?? '',
          isLast: isLast,
        );
      },
    );
  }
}

class _TimelineItem extends StatelessWidget {
  final String title;
  final String description;
  final String date;
  final bool isLast;

  const _TimelineItem({
    required this.title,
    required this.description,
    required this.date,
    required this.isLast,
  });

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 24,
            child: Column(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.white, width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withOpacity(0.3),
                        blurRadius: 4,
                      ),
                    ],
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(width: 2, color: AppColors.divider),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  if (description.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      description,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                  if (date.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      date,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.disabled,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Communication Tab
// ---------------------------------------------------------------------------
class _CommunicationTab extends StatelessWidget {
  final Map<String, dynamic> data;

  const _CommunicationTab({required this.data});

  @override
  Widget build(BuildContext context) {
    final comms = data['communications'] ?? data['messages'] ?? data['notes'];
    final messages = (comms is List) ? comms : [];

    if (messages.isEmpty) {
      return const EmptyState(
        icon: Icons.chat_bubble_outline,
        title: 'No messages yet',
        subtitle: 'Communication history will appear here.',
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: messages.length,
      separatorBuilder: (_, index) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final msg = messages[index] is Map ? messages[index] : {};
        return Card(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: AppColors.border, width: 0.5),
          ),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 16,
                      backgroundColor: AppColors.primary.withOpacity(0.1),
                      child: Text(
                        (msg['sender'] ?? msg['from'] ?? '?')
                                .toString()
                                .isNotEmpty
                            ? (msg['sender'] ?? msg['from'] ?? '?')
                                  .toString()[0]
                                  .toUpperCase()
                            : '?',
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        msg['sender'] ?? msg['from'] ?? 'Unknown',
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    Text(
                      msg['created_at'] ?? msg['date'] ?? '',
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  msg['message'] ?? msg['body'] ?? msg['content'] ?? '',
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Shared widgets
// ---------------------------------------------------------------------------
class _SectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Widget? trailing;
  final List<Widget> children;

  const _SectionCard({
    required this.title,
    required this.icon,
    this.trailing,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.border, width: 0.5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 20, color: AppColors.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                if (trailing != null) trailing!,
              ],
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _DetailRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 128,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          const Padding(
            padding: EdgeInsets.only(right: 10),
            child: Text(
              ':',
              style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Compact stat card used in the Overview summary row (Location, System Size, Cost).
/// Mirrors the web app's `lead-detail-card` design.
class _SummaryStatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _SummaryStatCard({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: AppColors.primary),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
