import 'package:flutter/material.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_colors.dart';
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

  final Map<DateTime, List<_FieldEvent>> _events = {};

  @override
  void initState() {
    super.initState();
    _seedSampleEvents();
  }

  void _seedSampleEvents() {
    final today = DateTime.now();
    final normalised = DateTime(today.year, today.month, today.day);
    _events[normalised] = [
      _FieldEvent(
        title: 'Site Inspection - Lot 24',
        time: '09:00 AM',
        type: _EventType.inspection,
      ),
      _FieldEvent(
        title: 'Panel Installation - 12 Maple St',
        time: '01:00 PM',
        type: _EventType.installation,
      ),
    ];
    _events[normalised.add(const Duration(days: 1))] = [
      _FieldEvent(
        title: 'Client Meeting - Solar Design',
        time: '10:30 AM',
        type: _EventType.meeting,
      ),
    ];
  }

  List<_FieldEvent> _eventsForDay(DateTime day) {
    final key = DateTime(day.year, day.month, day.day);
    return _events[key] ?? [];
  }

  @override
  Widget build(BuildContext context) {
    final dayEvents = _eventsForDay(_selectedDay);
    final shellLeading = ShellScaffoldScope.navigationLeading(context);

    return Scaffold(
      appBar: AppBar(
        leading: shellLeading,
        automaticallyImplyLeading: shellLeading == null,
        title: const Text('On-Field Schedule'),
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
      body: Column(
        children: [
          _buildCalendar(),
          const Divider(height: 1, color: AppColors.divider),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
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
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
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
            child: dayEvents.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.event_available,
                            size: 48,
                            color: AppColors.textSecondary.withOpacity(0.4)),
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
                :                   ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: dayEvents.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 10),
                    itemBuilder: (_, i) => _buildEventCard(dayEvents[i]),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildCalendar() {
    return TableCalendar(
      firstDay: DateTime.utc(2023, 1, 1),
      lastDay: DateTime.utc(2030, 12, 31),
      focusedDay: _focusedDay,
      calendarFormat: _calendarFormat,
      selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
      eventLoader: _eventsForDay,
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
      },
    );
  }

  Widget _buildEventCard(_FieldEvent event) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: event.type.color.withOpacity(0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: event.type.color.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: event.type.color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(event.type.icon, color: event.type.color, size: 22),
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
                      event.time,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, color: AppColors.textSecondary),
        ],
      ),
    );
  }
}

enum _EventType {
  inspection(Icons.search, AppColors.info),
  installation(Icons.solar_power, AppColors.success),
  meeting(Icons.groups, AppColors.primary);

  final IconData icon;
  final Color color;
  const _EventType(this.icon, this.color);
}

class _FieldEvent {
  final String title;
  final String time;
  final _EventType type;

  const _FieldEvent({
    required this.title,
    required this.time,
    required this.type,
  });
}
