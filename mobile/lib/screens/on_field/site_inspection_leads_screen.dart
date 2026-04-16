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
  bool _initialLoadTriggered = false;
  String _viewMode = 'day'; // 'day', 'week', 'month'
  String _statusFilter = 'all'; // 'all', 'draft', 'submitted'

  
  // View constants for the new timeline
  static const double _hourHeight = 84.0;
  static const double _leftMargin = 60.0;
  static const int _startHour = 7;
  static const int _endHour = 20;

  final _timelineColors = const [
    Color(0xFF6D28D9), // purple
    Color(0xFF2563EB), // blue
    Color(0xFFEA580C), // orange
    Color(0xFF059669), // green
    Color(0xFFF97316), // amber
    Color(0xFFEC4899), // pink
  ];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialLoadTriggered) {
      _initialLoadTriggered = true;
      context.read<OnFieldProvider>().loadEventsForMonth(_focusedDay);
    }
  }

  void _load() {
    context.read<OnFieldProvider>().loadEventsForMonth(_focusedDay);
  }

  void _updateDay(DateTime day) {
    if (day.month != _selectedDay.month || day.year != _selectedDay.year) {
      _focusedDay = day;
      _load();
    }
    setState(() {
      _selectedDay = day;
      _focusedDay = day;
    });
  }

  void _setViewMode(String mode) {
    setState(() {
      _viewMode = mode;
      if (mode == 'week') _calendarFormat = CalendarFormat.week;
      if (mode == 'month') _calendarFormat = CalendarFormat.month;
    });
  }

  @override
  Widget build(BuildContext context) {
    final shellLeading = ShellScaffoldScope.navigationLeading(context);
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        leading: shellLeading,
        automaticallyImplyLeading: shellLeading == null,
        title: const Text('Site Inspections', style: TextStyle(fontWeight: FontWeight.w900)),
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.white,
        actions: ShellScaffoldScope.notificationActions(),
      ),
      body: Consumer<OnFieldProvider>(
        builder: (context, provider, _) {
          // Show loading spinner until the very first load has completed
          if (!provider.hasEverLoaded || (provider.loading && provider.events.isEmpty)) {
            return const Center(child: CircularProgressIndicator(color: AppColors.primary));
          }

          final allEvents = provider.events;
          final inspections = allEvents.where((e) => e.isSiteInspection).toList();
          final dayInspections = provider
              .eventsForDay(_selectedDay)
              .where((e) => e.isSiteInspection)
              .toList();

          // Status buckets similar to the web dashboard
          final drafts =
              inspections.where((e) => (e.status ?? '').toLowerCase() == 'draft').toList();
          final submitted = inspections
              .where((e) => (e.status ?? '').toLowerCase() == 'submitted')
              .toList();

          // Apply status filter to the visible day list
          final filteredDayInspections = dayInspections.where((e) {
            final s = (e.status ?? '').toLowerCase();
            if (_statusFilter == 'draft') return s == 'draft';
            if (_statusFilter == 'submitted') return s == 'submitted';
            return true;
          }).toList();

          return ListView(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            children: [
              const SizedBox(height: 8),
              _buildHeader(
                totalCount: inspections.length,
                draftCount: drafts.length,
                submittedCount: submitted.length,
              ),
              const SizedBox(height: 16),
              _buildStatusFilterChips(
                totalCount: inspections.length,
                draftCount: drafts.length,
                submittedCount: submitted.length,
              ),
              const SizedBox(height: 20),
              _buildViewToggle(),
              const SizedBox(height: 16),
              if (_viewMode == 'month' || _viewMode == 'week') ...[
                _buildCalendar(provider, inspections),
                const SizedBox(height: 24),
              ] else ...[

                _buildDayHeader(),
                const SizedBox(height: 16),
                _buildDayTimeline(dayInspections),
                const SizedBox(height: 20),
              ],
              Row(
                children: [
                   const Icon(Icons.list_alt_rounded, size: 16, color: AppColors.textSecondary),
                   const SizedBox(width: 8),
                   Text(
                     'Scheduled for ${DateFormat('dd MMM').format(_selectedDay)}',
                     style: const TextStyle(
                       fontWeight: FontWeight.w800,
                       fontSize: 13,
                       color: AppColors.textSecondary,
                     ),
                   ),
                ],
              ),
              const SizedBox(height: 12),
              if (filteredDayInspections.isEmpty)
                _buildEmptyState()
              else
                ...filteredDayInspections.map(_buildInspectionCard),
              const SizedBox(height: 100),
            ],
          );
        },
      ),
    );
  }

  Widget _buildHeader({
    required int totalCount,
    required int draftCount,
    required int submittedCount,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border.withOpacity(0.4)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10)],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: Colors.teal.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.assignment_outlined, color: Colors.teal, size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'INSPECTION TRACKER',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        color: Colors.teal,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const Text(
                      'Scheduled Workspace',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '$totalCount total · $draftCount draft · $submittedCount completed',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusFilterChips({
    required int totalCount,
    required int draftCount,
    required int submittedCount,
  }) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Row(
        children: [
          _statusChip(
            label: 'All',
            count: totalCount,
            isActive: _statusFilter == 'all',
            color: AppColors.textSecondary,
            onTap: () => setState(() => _statusFilter = 'all'),
          ),
          const SizedBox(width: 6),
          _statusChip(
            label: 'Draft',
            count: draftCount,
            isActive: _statusFilter == 'draft',
            color: Colors.amber[800] ?? Colors.orange,
            onTap: () => setState(() => _statusFilter = 'draft'),
          ),
          const SizedBox(width: 6),
          _statusChip(
            label: 'Completed',
            count: submittedCount,
            isActive: _statusFilter == 'submitted',
            color: Colors.teal[800] ?? Colors.teal,
            onTap: () => setState(() => _statusFilter = 'submitted'),
          ),
        ],
      ),
    );
  }

  Widget _statusChip({
    required String label,
    required int count,
    required bool isActive,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isActive ? Colors.white : Colors.white.withOpacity(0.0),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: isActive ? color : AppColors.border.withOpacity(0.6),
          ),
          boxShadow: isActive
              ? [
                  BoxShadow(
                    color: color.withOpacity(0.18),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: isActive ? color : AppColors.textSecondary,
              ),
            ),
            const SizedBox(width: 4),
            Text(
              count.toString(),
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: isActive ? color : AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCalendar(OnFieldProvider provider, List<OnFieldEvent> inspections) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.border.withOpacity(0.4)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10)],
      ),
      child: TableCalendar<OnFieldEvent>(
        firstDay: DateTime.utc(2023, 1, 1),
        lastDay: DateTime.utc(2030, 12, 31),
        focusedDay: _focusedDay,
        calendarFormat: _calendarFormat,
        rowHeight: 52,
        selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
        eventLoader: (day) => provider.eventsForDay(day).where((e) => e.isSiteInspection).toList(),
        startingDayOfWeek: StartingDayOfWeek.monday,
        calendarBuilders: CalendarBuilders(
          markerBuilder: (context, date, events) {
            if (events.isEmpty) return null;
            return Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: events.take(3).map((e) => Container(
                margin: const EdgeInsets.symmetric(horizontal: 1),
                width: 14,
                height: 3,
                decoration: BoxDecoration(color: Colors.teal, borderRadius: BorderRadius.circular(2)),
              )).toList(),
            );
          },
        ),
        calendarStyle: const CalendarStyle(
          selectedDecoration: BoxDecoration(color: Colors.teal, shape: BoxShape.circle),
          todayDecoration: BoxDecoration(color: Color(0x33008080), shape: BoxShape.circle),
          outsideDaysVisible: false,
        ),
        headerStyle: const HeaderStyle(formatButtonVisible: false, titleCentered: true),
        onDaySelected: (selected, focused) => setState(() { _selectedDay = selected; _focusedDay = focused; }),
        onPageChanged: (focused) { _focusedDay = focused; _load(); },
      ),
    );
  }

  Widget _buildViewToggle() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9).withOpacity(0.8),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Expanded(
            child: _toggleButton(
              'Day',
              _viewMode == 'day',
              () => _setViewMode('day'),
            ),
          ),
          const SizedBox(width: 4),
          Expanded(
            child: _toggleButton(
              'Week',
              _viewMode == 'week',
              () => _setViewMode('week'),
            ),
          ),
          const SizedBox(width: 4),
          Expanded(
            child: _toggleButton(
              'Month',
              _viewMode == 'month',
              () => _setViewMode('month'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _toggleButton(String title, bool isActive, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 40,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: isActive ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          boxShadow: isActive ? [
            BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, 2))
          ] : null,
        ),
        child: Text(
          title,
          style: TextStyle(
            fontSize: 14,
            fontWeight: isActive ? FontWeight.w900 : FontWeight.w700,
            color: isActive ? AppColors.primary : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }

  Widget _buildDayHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border.withOpacity(0.4)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8)],
      ),
      child: Row(
        children: [
          IconButton(
            tooltip: 'Previous day',
            icon: const Icon(Icons.chevron_left),
            onPressed: () => _updateDay(_selectedDay.subtract(const Duration(days: 1))),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Text(DateFormat('EEEE, dd MMM yyyy').format(_selectedDay), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: AppColors.textPrimary)),
                const SizedBox(height: 2),
                Text(DateFormat('yyyy-MM-dd').format(_selectedDay), style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Next day',
            icon: const Icon(Icons.chevron_right),
            onPressed: () => _updateDay(_selectedDay.add(const Duration(days: 1))),
          ),
        ],
      ),
    );
  }

  Widget _buildDayTimeline(List<OnFieldEvent> events) {
    // Determine bounds for the day
    int startHour = _startHour;
    int endHour = _endHour;

    if (events.isNotEmpty) {
       final sorted = [...events]..sort((a, b) => a.start.compareTo(b.start));
       final eStart = sorted.first.start.hour;
       final eEnd = (sorted.last.end ?? sorted.last.start.add(const Duration(hours: 1))).hour;
       if (eStart < startHour) startHour = eStart;
       if (eEnd + 1 > endHour) endHour = eEnd + 1;
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border.withOpacity(0.4)),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final totalWidth = constraints.maxWidth;
            final contentWidth = totalWidth - _leftMargin - 16;
            
            // Calculate stacks for overlap
            final positionedEvents = _calculatePositionedEvents(events, startHour);

            return SingleChildScrollView(
              padding: const EdgeInsets.symmetric(vertical: 20),
              physics: const NeverScrollableScrollPhysics(), // Scroll handled by main ListView
              child: Stack(
                children: [
                   // Hour markers background
                   Column(
                     children: List.generate(endHour - startHour + 1, (index) {
                       final hour = startHour + index;
                       return SizedBox(
                         height: _hourHeight,
                         child: Row(
                           children: [
                             SizedBox(
                               width: _leftMargin,
                               child: Padding(
                                 padding: const EdgeInsets.only(right: 8),
                                 child: Text(
                                   DateFormat('h a').format(DateTime(0, 1, 1, hour)),
                                   textAlign: TextAlign.right,
                                   style: const TextStyle(
                                     fontSize: 12,
                                     fontWeight: FontWeight.w800,
                                     color: AppColors.textSecondary,
                                   ),
                                 ),
                               ),
                             ),
                             Expanded(
                               child: Container(
                                 decoration: BoxDecoration(
                                   border: Border(
                                     top: BorderSide(
                                       color: index == 0 ? Colors.transparent : AppColors.border.withOpacity(0.3),
                                       width: 0.8,
                                     ),
                                   ),
                                 ),
                               ),
                             ),
                           ],
                         ),
                       );
                     }),
                   ),
                   
                   // Cards
                   ...positionedEvents.map((pe) {
                     final event = pe.event;
                     final color = _timelineColors[event.id % _timelineColors.length];
                     
                     return Positioned(
                       top: pe.top,
                       left: _leftMargin + (pe.columnIndex * (contentWidth / pe.totalColumns)),
                       width: (contentWidth / pe.totalColumns) - (pe.totalColumns > 1 ? 4 : 0),
                       height: pe.height.clamp(60.0, 500.0), // ensure it's at least 60px
                       child: _buildTimelineCardNew(event, color),
                     );
                   }),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  List<_PositionedEvent> _calculatePositionedEvents(List<OnFieldEvent> events, int minHour) {
    if (events.isEmpty) return [];
    
    final items = [...events]..sort((a, b) => a.start.compareTo(b.start));
    final List<_PositionedEvent> results = [];
    
    for (final event in items) {
      final startOffset = event.start.hour * 60 + event.start.minute;
      final dayStartOffset = minHour * 60;
      final top = ((startOffset - dayStartOffset) / 60) * _hourHeight;
      
      final duration = (event.end ?? event.start.add(const Duration(minutes: 60))).difference(event.start).inMinutes;
      final height = (duration / 60) * _hourHeight;
      
      results.add(_PositionedEvent(event: event, top: top, height: height, durationMinutes: duration, startMinutes: startOffset));
    }
    
    // Simple overlap algorithm
    for (int i = 0; i < results.length; i++) {
       final current = results[i];
       List<_PositionedEvent> overlapping = [current];
       
       // Find all that overlap with this one
       for (int j = 0; j < results.length; j++) {
         if (i == j) continue;
         final other = results[j];
         if (current.overlaps(other)) {
            overlapping.add(other);
         }
       }
       
       if (overlapping.length > 1) {
          overlapping.sort((a, b) => a.startMinutes.compareTo(b.startMinutes));
          for (int k = 0; k < overlapping.length; k++) {
            overlapping[k].totalColumns = overlapping.length;
            overlapping[k].columnIndex = k;
          }
       }
    }

    return results;
  }

  Widget _buildTimelineCardNew(OnFieldEvent event, Color color) {
    final start = event.start;
    final end = event.end ?? event.start.add(const Duration(minutes: 60));
    final timeStr = '${DateFormat('h:mm').format(start)} - ${DateFormat('h:mm a').format(end).toLowerCase()}';

    return InkWell(
      onTap: () {
        final loc = GoRouterState.of(context).matchedLocation;
        final base = loc.contains('/admin') ? '/admin/leads' : loc.contains('/dashboard') ? '/dashboard/leads' : '/employee/leads';
        context.push('$base/${event.leadId}/site-inspection');
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.15)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 4,
              margin: const EdgeInsets.symmetric(vertical: 2),
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: SingleChildScrollView(
                physics: const NeverScrollableScrollPhysics(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                       event.title,
                       style: TextStyle(
                         fontWeight: FontWeight.w900,
                         fontSize: 13,
                         color: color.withOpacity(0.9),
                         height: 1.2
                       ),
                       maxLines: 1,
                       overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      timeStr,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: color.withOpacity(0.7),
                      ),
                    ),
                    if (event.address != null) ...[
                       const SizedBox(height: 2),
                       Text(
                         event.address!,
                         style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                         maxLines: 1,
                         overflow: TextOverflow.ellipsis,
                       ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: AppColors.border.withOpacity(0.3))),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.assignment_turned_in_outlined, size: 40, color: AppColors.textSecondary.withOpacity(0.2)),
            const SizedBox(height: 12),
            Text('No inspections on this date', style: TextStyle(color: AppColors.textSecondary.withOpacity(0.6), fontWeight: FontWeight.w600, fontSize: 13)),
          ],
        ),
      ),
    );
  }

  Widget _buildInspectionCard(OnFieldEvent event) {
    final timeStr = DateFormat('hh:mm a').format(event.start);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: AppColors.border.withOpacity(0.3))),
      child: ListTile(
        onTap: () {
          final loc = GoRouterState.of(context).matchedLocation;
          final base = loc.contains('/admin') ? '/admin/leads' : loc.contains('/dashboard') ? '/dashboard/leads' : '/employee/leads';
          context.push('$base/${event.leadId}/site-inspection');
        },
        leading: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(color: Colors.teal.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
          child: const Icon(Icons.search_rounded, color: Colors.teal, size: 18),
        ),
        title: Text(event.title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
        subtitle: Text('$timeStr${event.address != null ? ' · ${event.address}' : ''}', style: const TextStyle(fontSize: 12)),
        trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppColors.textSecondary),
      ),
    );
  }
}

class _PositionedEvent {
  final OnFieldEvent event;
  final double top;
  final double height;
  final int durationMinutes;
  final int startMinutes;
  int columnIndex = 0;
  int totalColumns = 1;

  _PositionedEvent({
    required this.event,
    required this.top,
    required this.height,
    required this.durationMinutes,
    required this.startMinutes,
  });

  bool overlaps(_PositionedEvent other) {
    final thisEnd = startMinutes + durationMinutes;
    final otherEnd = other.startMinutes + other.durationMinutes;
    return (startMinutes < otherEnd && thisEnd > other.startMinutes);
  }
}
