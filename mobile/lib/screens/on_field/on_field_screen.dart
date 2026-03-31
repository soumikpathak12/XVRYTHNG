import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../models/on_field_event.dart';
import '../../providers/on_field_provider.dart';
import '../../widgets/common/shell_scaffold_scope.dart';

class OnFieldScreen extends StatefulWidget {
  const OnFieldScreen({super.key});

  @override
  State<OnFieldScreen> createState() => _OnFieldScreenState();
}

class _OnFieldScreenState extends State<OnFieldScreen> {
  CalendarFormat _calendarFormat = CalendarFormat.month;
  DateTime _focusedDay = DateTime.now();
  DateTime _selectedDay = DateTime.now();
  final _dateFmt = DateFormat('EEEE, dd MMMM yyyy');

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadForMonth(_focusedDay);
    });
  }

  void _loadForMonth(DateTime month) {
    context.read<OnFieldProvider>().loadEventsForMonth(month);
  }

  void _onEventTap(OnFieldEvent event) {
    final loc = GoRouterState.of(context).matchedLocation;
    if (event.isSiteInspection && event.leadId != null) {
      final base = loc.contains('/admin')
          ? '/admin/leads'
          : loc.contains('/dashboard')
              ? '/dashboard/leads'
              : '/employee/leads';
      context.push('$base/${event.leadId}');
    } else if (event.isInstallation && event.jobId != null) {
      final base = loc.contains('/admin')
          ? '/admin/installation'
          : loc.contains('/dashboard')
              ? '/dashboard/installation'
              : '/employee/installation';
      context.push('$base/${event.jobId}');
    }
  }

  @override
  Widget build(BuildContext context) {
    final shellLeading = ShellScaffoldScope.navigationLeading(context);

    return Scaffold(
      appBar: AppBar(
        leading: shellLeading,
        automaticallyImplyLeading: shellLeading == null,
        title: const Text('Job Scheduling'),
        actions: [
          IconButton(
            icon: const Icon(Icons.today),
            tooltip: 'Today',
            onPressed: () => setState(() {
              _selectedDay = DateTime.now();
              _focusedDay = DateTime.now();
            }),
          ),
          ...ShellScaffoldScope.notificationActions(),
        ],
      ),
      body: Consumer<OnFieldProvider>(
        builder: (context, provider, _) {
          final dayEvents = provider.eventsForDay(_selectedDay);

          return Column(
            children: [
              _buildCalendar(provider),
              const Divider(height: 1, color: AppColors.divider),
              // Legend
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
                child: Row(
                  children: [
                    _legendDot(const Color(0xFF059669), 'Site Inspection'),
                    const SizedBox(width: 16),
                    _legendDot(const Color(0xFF2563EB), 'Installation'),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
                child: Row(
                  children: [
                    Text(
                      _dateFmt.format(_selectedDay),
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${dayEvents.length} event${dayEvents.length == 1 ? '' : 's'}',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: provider.loading && provider.events.isEmpty
                    ? const Center(
                        child: CircularProgressIndicator(
                            color: AppColors.primary))
                    : dayEvents.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.event_available,
                                    size: 48,
                                    color: AppColors.textSecondary
                                        .withOpacity(0.4)),
                                const SizedBox(height: 12),
                                const Text(
                                  'No activities scheduled',
                                  style: TextStyle(
                                    color: AppColors.textSecondary,
                                    fontSize: 15,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : ListView.separated(
                            padding:
                                const EdgeInsets.symmetric(horizontal: 16),
                            itemCount: dayEvents.length,
                            separatorBuilder: (context, index) =>
                                const SizedBox(height: 10),
                            itemBuilder: (_, i) =>
                                _buildEventCard(dayEvents[i]),
                          ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _legendDot(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(5),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }

  Widget _buildCalendar(OnFieldProvider provider) {
    return TableCalendar<OnFieldEvent>(
      firstDay: DateTime.utc(2023, 1, 1),
      lastDay: DateTime.utc(2030, 12, 31),
      focusedDay: _focusedDay,
      calendarFormat: _calendarFormat,
      selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
      eventLoader: (day) => provider.eventsForDay(day),
      startingDayOfWeek: StartingDayOfWeek.monday,
      calendarStyle: CalendarStyle(
        todayDecoration: BoxDecoration(
          color: AppColors.primary.withOpacity(0.2),
          shape: BoxShape.circle,
        ),
        todayTextStyle: const TextStyle(
          color: AppColors.primary,
          fontWeight: FontWeight.bold,
        ),
        selectedDecoration: const BoxDecoration(
          color: AppColors.primary,
          shape: BoxShape.circle,
        ),
        markerDecoration: const BoxDecoration(
          color: AppColors.secondary,
          shape: BoxShape.circle,
        ),
        markerSize: 6,
        markersMaxCount: 3,
        outsideDaysVisible: false,
      ),
      headerStyle: const HeaderStyle(
        formatButtonVisible: true,
        titleCentered: true,
        formatButtonShowsNext: false,
        formatButtonDecoration: BoxDecoration(
          border: Border.fromBorderSide(
              BorderSide(color: AppColors.primary)),
          borderRadius: BorderRadius.all(Radius.circular(12)),
        ),
        formatButtonTextStyle: TextStyle(
          color: AppColors.primary,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
      onDaySelected: (selected, focused) {
        setState(() {
          _selectedDay = selected;
          _focusedDay = focused;
        });
      },
      onFormatChanged: (format) {
        setState(() => _calendarFormat = format);
      },
      onPageChanged: (focused) {
        _focusedDay = focused;
        _loadForMonth(focused);
      },
    );
  }

  Widget _buildEventCard(OnFieldEvent event) {
    final color = event.isSiteInspection
        ? const Color(0xFF059669)
        : const Color(0xFF2563EB);
    final icon = event.isSiteInspection
        ? Icons.search_rounded
        : Icons.solar_power_rounded;
    final timeStr = DateFormat('hh:mm a').format(event.start);

    return GestureDetector(
      onTap: () => _onEventTap(event),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: color.withOpacity(0.06),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    event.title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      const Icon(Icons.access_time,
                          size: 13, color: AppColors.textSecondary),
                      const SizedBox(width: 4),
                      Text(
                        timeStr,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      if (event.address != null) ...[
                        const SizedBox(width: 8),
                        const Icon(Icons.location_on_outlined,
                            size: 13, color: AppColors.textSecondary),
                        const SizedBox(width: 3),
                        Expanded(
                          child: Text(
                            event.address!,
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ],
                  ),
                  if (event.assigneeName != null) ...[
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        const Icon(Icons.person_outline,
                            size: 13, color: AppColors.textSecondary),
                        const SizedBox(width: 4),
                        Text(
                          event.assigneeName!,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.textSecondary),
          ],
        ),
      ),
    );
  }
}
