import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/theme/app_colors.dart';
import '../../models/on_field_event.dart';
import '../../models/attendance.dart';
import '../../providers/on_field_provider.dart';
import '../../services/attendance_service.dart';
import '../../widgets/common/shell_scaffold_scope.dart';
import '../../widgets/common/loading_overlay.dart';

class OnFieldScreen extends StatefulWidget {
  const OnFieldScreen({super.key});

  @override
  State<OnFieldScreen> createState() => _OnFieldScreenState();
}

class _OnFieldScreenState extends State<OnFieldScreen> {
  final AttendanceService _attendanceService = AttendanceService();
  
  CalendarFormat _calendarFormat = CalendarFormat.month;
  DateTime _focusedDay = DateTime.now();
  DateTime _selectedDay = DateTime.now();
  final _dateFmt = DateFormat('EEEE, dd MMMM yyyy');
  
  AttendanceToday? _attStatus;
  bool _loadingAtt = true;
  bool _actionLoading = false;
  Duration _elapsed = Duration.zero;
  Timer? _liveTimer;

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  @override
  void dispose() {
    _liveTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadAll() async {
    _loadEvents();
    _loadAttendance();
  }

  void _loadEvents() {
    context.read<OnFieldProvider>().loadEventsForMonth(_focusedDay);
  }

  Future<void> _loadAttendance() async {
    setState(() => _loadingAtt = true);
    try {
      final status = await _attendanceService.getTodayStatus();
      setState(() {
        _attStatus = status;
        _loadingAtt = false;
      });
      _startLiveTimer();
    } catch (_) {
      setState(() => _loadingAtt = false);
    }
  }

  void _startLiveTimer() {
    _liveTimer?.cancel();
    if (_attStatus?.isCheckedIn == true && _attStatus?.checkInTime != null) {
      final checkIn = DateTime.tryParse(_attStatus!.checkInTime!) ?? DateTime.now();
      _liveTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (!mounted) return;
        setState(() => _elapsed = DateTime.now().difference(checkIn));
      });
    }
  }

  Future<void> _handleCheckAction(bool isCheckIn) async {
    setState(() => _actionLoading = true);
    try {
      // In a real app, we'd get GPS here, just using 0,0 for now as per AttendanceScreen pattern
      if (isCheckIn) {
        final res = await _attendanceService.checkIn(0, 0);
        setState(() => _attStatus = res);
      } else {
        final res = await _attendanceService.checkOut(0, 0);
        setState(() => _attStatus = res);
      }
      _startLiveTimer();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: AppColors.danger));
    } finally {
      setState(() => _actionLoading = false);
    }
  }

  void _onEventTap(OnFieldEvent event) {
    final loc = GoRouterState.of(context).matchedLocation;
    if (event.isSiteInspection && event.leadId != null) {
      final base = loc.contains('/admin') ? '/admin/leads' : loc.contains('/dashboard') ? '/dashboard/leads' : '/employee/leads';
      context.push('$base/${event.leadId}/site-inspection');
    } else if (event.type == 'installation' && event.jobId != null) {
      final base = loc.contains('/admin') ? '/admin/installation' : loc.contains('/dashboard') ? '/dashboard/installation' : '/employee/installation';
      context.push('$base/${event.jobId}');
    }
  }

  Future<void> _openDirections(String address) async {
    final url = Uri.parse('https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(address)}');
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final shellLeading = ShellScaffoldScope.navigationLeading(context);
    return Scaffold(
      appBar: AppBar(
        leading: shellLeading,
        title: const Text('On-Field'),
        actions: ShellScaffoldScope.notificationActions(),
      ),
      body: LoadingOverlay(
        isLoading: _actionLoading,
        child: RefreshIndicator(
          onRefresh: _loadAll,
          child: Consumer<OnFieldProvider>(
            builder: (context, provider, _) {
              final today = DateTime.now();
              final todayEvents = provider.eventsForDay(today);
              
              return ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _buildAttendanceHeader(),
                  const SizedBox(height: 24),
                  _buildSectionTitle("Today's Jobs", action: 'View Calendar', onAction: () {
                    // Quick jump to today in calendar
                    setState(() {
                      _selectedDay = today;
                      _focusedDay = today;
                    });
                  }),
                  const SizedBox(height: 12),
                  if (provider.loading && provider.events.isEmpty)
                    const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator(color: AppColors.primary)))
                  else if (todayEvents.isEmpty)
                    _buildEmptyJobs()
                  else
                    ...todayEvents.map(_buildTodayJobCard),
                  const SizedBox(height: 32),
                  _buildSectionTitle('Schedule Calendar'),
                  const SizedBox(height: 12),
                  _buildCalendar(provider),
                  const SizedBox(height: 16),
                  _buildSelectedDayEvents(provider),
                  const SizedBox(height: 80),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildAttendanceHeader() {
    final isCheckedIn = _attStatus?.isCheckedIn ?? false;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [AppColors.primary, AppColors.primary.withOpacity(0.85)]),
        borderRadius: BorderRadius.circular(18),
        boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('ACTIVE STATUS', style: TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1)),
                Text(isCheckedIn ? 'Checked In' : 'Not Checked In', style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900)),
                if (isCheckedIn)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text('Working: ${_elapsed.inHours}h ${(_elapsed.inMinutes % 60).toString().padLeft(2, '0')}m', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                  ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: () => _handleCheckAction(!isCheckedIn),
            style: ElevatedButton.styleFrom(
              backgroundColor: isCheckedIn ? Colors.orange : Colors.greenAccent[700],
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            ),
            child: Text(isCheckedIn ? 'Check Out' : 'Check In', style: const TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title, {String? action, VoidCallback? onAction}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title.toUpperCase(), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.textSecondary, letterSpacing: 0.5)),
        if (action != null)
          TextButton(onPressed: onAction, child: Text(action, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, decoration: TextDecoration.underline))),
      ],
    );
  }

  Widget _buildEmptyJobs() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.border)),
      child: const Center(child: Text('No jobs scheduled for today', style: TextStyle(color: AppColors.textSecondary, fontSize: 14))),
    );
  }

  Widget _buildTodayJobCard(OnFieldEvent event) {
    final isInspection = event.isSiteInspection;
    final timeStr = DateFormat('hh:mm a').format(event.start);
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: AppColors.border)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: (isInspection ? Colors.teal : Colors.blue).withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
                  child: Text(isInspection ? 'Site Inspection' : 'Installation', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: isInspection ? Colors.teal : Colors.blue)),
                ),
                const Spacer(),
                Text(timeStr, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textSecondary)),
              ],
            ),
            const SizedBox(height: 12),
            Text(event.title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
            if (event.address != null)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Row(children: [const Icon(Icons.location_on, size: 14, color: AppColors.primary), const SizedBox(width: 4), Expanded(child: Text(event.address!, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)))]),
              ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: event.address == null ? null : () => _openDirections(event.address!),
                    style: OutlinedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(25))),
                    child: const Text('Directions'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: () => _onEventTap(event),
                    style: FilledButton.styleFrom(backgroundColor: AppColors.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(25))),
                    child: const Text('Start Job'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCalendar(OnFieldProvider provider) {
    return Container(
      decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.border)),
      child: TableCalendar<OnFieldEvent>(
        firstDay: DateTime.utc(2023, 1, 1),
        lastDay: DateTime.utc(2030, 12, 31),
        focusedDay: _focusedDay,
        calendarFormat: _calendarFormat,
        selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
        eventLoader: (day) => provider.eventsForDay(day),
        startingDayOfWeek: StartingDayOfWeek.monday,
        calendarStyle: const CalendarStyle(
          todayDecoration: BoxDecoration(color: Color(0x33146b6b), shape: BoxShape.circle),
          todayTextStyle: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold),
          selectedDecoration: BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
          markerDecoration: BoxDecoration(color: AppColors.secondary, shape: BoxShape.circle),
        ),
        headerStyle: const HeaderStyle(formatButtonVisible: true, titleCentered: true),
        onDaySelected: (selected, focused) => setState(() { _selectedDay = selected; _focusedDay = focused; }),
        onFormatChanged: (format) => setState(() => _calendarFormat = format),
        onPageChanged: (focused) { _focusedDay = focused; _loadEvents(); },
      ),
    );
  }

  Widget _buildSelectedDayEvents(OnFieldProvider provider) {
    final events = provider.eventsForDay(_selectedDay);
    if (events.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 16, bottom: 8),
          child: Text('Events for ${DateFormat('dd MMM').format(_selectedDay)}', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.textSecondary)),
        ),
        ...events.map((e) => ListTile(
          onTap: () => _onEventTap(e),
          leading: CircleAvatar(backgroundColor: (e.isSiteInspection ? Colors.teal : Colors.blue).withOpacity(0.1), child: Icon(e.isSiteInspection ? Icons.search : Icons.build, size: 20, color: e.isSiteInspection ? Colors.teal : Colors.blue)),
          title: Text(e.title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          subtitle: Text(DateFormat('hh:mm a').format(e.start)),
          trailing: const Icon(Icons.chevron_right, size: 18),
        )),
      ],
    );
  }
}
