import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../models/on_field_event.dart';
import '../../providers/on_field_provider.dart';
import '../../widgets/common/shell_scaffold_scope.dart';

class SiteInspectionLeadsScreen extends StatefulWidget {
  const SiteInspectionLeadsScreen({super.key});

  @override
  State<SiteInspectionLeadsScreen> createState() => _SiteInspectionLeadsScreenState();
}

class _SiteInspectionLeadsScreenState extends State<SiteInspectionLeadsScreen> {
  CalendarFormat _calendarFormat = CalendarFormat.month;
  DateTime _focusedDay = DateTime.now();
  DateTime _selectedDay = DateTime.now();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  void _load() {
    context.read<OnFieldProvider>().loadEventsForMonth(_focusedDay);
  }

  @override
  Widget build(BuildContext context) {
    final shellLeading = ShellScaffoldScope.navigationLeading(context);
    return Scaffold(
      appBar: AppBar(
        leading: shellLeading,
        title: const Text('Site Inspections'),
        actions: ShellScaffoldScope.notificationActions(),
      ),
      body: Consumer<OnFieldProvider>(
        builder: (context, provider, _) {
          final allEvents = provider.events;
          final inspections = allEvents.where((e) => e.isSiteInspection).toList();
          final dayInspections = provider.eventsForDay(_selectedDay).where((e) => e.isSiteInspection).toList();

          return Column(
            children: [
              _buildHeader(),
              _buildCalendar(provider, inspections),
              const Divider(height: 1),
              Expanded(
                child: dayInspections.isEmpty
                    ? _buildEmptyState()
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: dayInspections.length,
                        itemBuilder: (context, idx) => _buildInspectionCard(dayInspections[idx]),
                      ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      color: AppColors.surface,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Your Scheduled Inspections', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
          const SizedBox(height: 4),
          const Text('Use the calendar to open and manage inspections.', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
        ],
      ),
    );
  }

  Widget _buildCalendar(OnFieldProvider provider, List<OnFieldEvent> inspections) {
    return TableCalendar<OnFieldEvent>(
      firstDay: DateTime.utc(2023, 1, 1),
      lastDay: DateTime.utc(2030, 12, 31),
      focusedDay: _focusedDay,
      calendarFormat: _calendarFormat,
      selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
      eventLoader: (day) => provider.eventsForDay(day).where((e) => e.isSiteInspection).toList(),
      startingDayOfWeek: StartingDayOfWeek.monday,
      calendarStyle: const CalendarStyle(
        selectedDecoration: BoxDecoration(color: Colors.teal, shape: BoxShape.circle),
        todayDecoration: BoxDecoration(color: Color(0x33008080), shape: BoxShape.circle),
        markerDecoration: BoxDecoration(color: Colors.teal, shape: BoxShape.circle),
      ),
      headerStyle: const HeaderStyle(formatButtonVisible: false, titleCentered: true),
      onDaySelected: (selected, focused) => setState(() { _selectedDay = selected; _focusedDay = focused; }),
      onPageChanged: (focused) { _focusedDay = focused; _load(); },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.assignment_turned_in_outlined, size: 48, color: AppColors.textSecondary.withOpacity(0.3)),
          const SizedBox(height: 12),
          Text('No inspections for ${DateFormat('dd MMM').format(_selectedDay)}', style: const TextStyle(color: AppColors.textSecondary)),
        ],
      ),
    );
  }

  Widget _buildInspectionCard(OnFieldEvent event) {
    final timeStr = DateFormat('hh:mm a').format(event.start);
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        onTap: () {
          final loc = GoRouterState.of(context).matchedLocation;
          final base = loc.contains('/admin') ? '/admin/leads' : loc.contains('/dashboard') ? '/dashboard/leads' : '/employee/leads';
          context.push('$base/${event.leadId}/site-inspection');
        },
        leading: const CircleAvatar(backgroundColor: Color(0x22008080), child: Icon(Icons.search, color: Colors.teal, size: 20)),
        title: Text(event.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        subtitle: Text('$timeStr${event.address != null ? ' · ${event.address}' : ''}'),
        trailing: const Icon(Icons.chevron_right, size: 18),
      ),
    );
  }
}
