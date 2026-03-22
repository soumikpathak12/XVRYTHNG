import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_colors.dart';
import '../../models/attendance.dart';
import '../../services/attendance_service.dart';
import '../../widgets/common/empty_state.dart';
import '../../widgets/common/loading_overlay.dart';
import '../../widgets/common/shell_scaffold_scope.dart';
import '../../widgets/common/status_badge.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen>
    with SingleTickerProviderStateMixin {
  final _service = AttendanceService();

  AttendanceToday? _today;
  List<AttendanceRecord> _history = [];
  List<AttendanceEditRequest> _editRequests = [];

  bool _loading = true;
  bool _actionLoading = false;
  String? _error;

  Timer? _liveTimer;
  Duration _elapsed = Duration.zero;

  late final TabController _tabController;

  // Edit request form
  final _editDateCtrl = TextEditingController();
  final _editCheckInCtrl = TextEditingController();
  final _editCheckOutCtrl = TextEditingController();
  final _editReasonCtrl = TextEditingController();
  final _editFormKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadAll();
  }

  @override
  void dispose() {
    _liveTimer?.cancel();
    _tabController.dispose();
    _editDateCtrl.dispose();
    _editCheckInCtrl.dispose();
    _editCheckOutCtrl.dispose();
    _editReasonCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _service.getTodayStatus(),
        _service.getHistory(),
        _service.getMyEditRequests(),
      ]);
      _today = results[0] as AttendanceToday?;
      _history = results[1] as List<AttendanceRecord>;
      _editRequests = results[2] as List<AttendanceEditRequest>;
      _startLiveTimer();
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _startLiveTimer() {
    _liveTimer?.cancel();
    if (_today != null && _today!.isCheckedIn && _today!.checkInTime != null) {
      _liveTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (!mounted) return;
        final checkIn = _parseTime(_today!.checkInTime!);
        if (checkIn != null) {
          setState(() => _elapsed = DateTime.now().difference(checkIn));
        }
      });
    }
  }

  DateTime? _parseTime(String raw) {
    try {
      return DateTime.parse(raw);
    } catch (_) {
      try {
        final parts = raw.split(':');
        final now = DateTime.now();
        return DateTime(now.year, now.month, now.day, int.parse(parts[0]),
            int.parse(parts[1]), parts.length > 2 ? int.parse(parts[2]) : 0);
      } catch (_) {
        return null;
      }
    }
  }

  Future<Position> _getPosition() async {
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw Exception('Location permission denied');
      }
    }
    if (permission == LocationPermission.deniedForever) {
      throw Exception(
          'Location permission permanently denied. Enable in settings.');
    }
    return Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
    );
  }

  Future<void> _handleCheckIn() async {
    setState(() => _actionLoading = true);
    try {
      final pos = await _getPosition();
      final result = await _service.checkIn(pos.latitude, pos.longitude);
      setState(() => _today = result);
      _startLiveTimer();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Checked in successfully'),
              backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Check-in failed: $e'),
              backgroundColor: AppColors.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<void> _handleCheckOut() async {
    setState(() => _actionLoading = true);
    try {
      final pos = await _getPosition();
      final result = await _service.checkOut(pos.latitude, pos.longitude);
      _liveTimer?.cancel();
      setState(() {
        _today = result;
        _elapsed = Duration.zero;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Checked out successfully'),
              backgroundColor: AppColors.success),
        );
      }
      _loadAll();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Check-out failed: $e'),
              backgroundColor: AppColors.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<void> _submitEditRequest() async {
    if (!_editFormKey.currentState!.validate()) return;
    setState(() => _actionLoading = true);
    try {
      await _service.submitEditRequest({
        'attendance_date': _editDateCtrl.text,
        'req_check_in': _editCheckInCtrl.text,
        'req_check_out': _editCheckOutCtrl.text,
        'reason': _editReasonCtrl.text,
      });
      _editDateCtrl.clear();
      _editCheckInCtrl.clear();
      _editCheckOutCtrl.clear();
      _editReasonCtrl.clear();
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Edit request submitted'),
              backgroundColor: AppColors.success),
        );
      }
      _loadAll();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Failed: $e'),
              backgroundColor: AppColors.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  String _fmtDuration(Duration d) {
    final h = d.inHours.toString().padLeft(2, '0');
    final m = (d.inMinutes % 60).toString().padLeft(2, '0');
    final s = (d.inSeconds % 60).toString().padLeft(2, '0');
    return '$h:$m:$s';
  }

  String _fmtTime(String? raw) {
    if (raw == null) return '--:--';
    final dt = _parseTime(raw);
    if (dt == null) return raw;
    return DateFormat.jm().format(dt);
  }

  String _fmtDate(String? raw) {
    if (raw == null) return '-';
    try {
      return DateFormat('dd MMM yyyy').format(DateTime.parse(raw));
    } catch (_) {
      return raw;
    }
  }

  @override
  Widget build(BuildContext context) {
    final shellLeading = ShellScaffoldScope.navigationLeading(context);
    return Scaffold(
      appBar: AppBar(
        leading: shellLeading,
        automaticallyImplyLeading: shellLeading == null,
        title: const Text('Attendance'),
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.white,
        actions: ShellScaffoldScope.notificationActions(),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.white,
          labelColor: AppColors.white,
          unselectedLabelColor: AppColors.white.withOpacity(0.6),
          tabs: const [
            Tab(text: 'Today'),
            Tab(text: 'History'),
            Tab(text: 'Edit Requests'),
          ],
        ),
      ),
      body: LoadingOverlay(
        isLoading: _actionLoading,
        message: 'Please wait...',
        child: _loading
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.primary))
            : _error != null
                ? _buildError()
                : TabBarView(
                    controller: _tabController,
                    children: [
                      _buildTodayTab(),
                      _buildHistoryTab(),
                      _buildEditRequestsTab(),
                    ],
                  ),
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.danger),
            const SizedBox(height: 12),
            Text(_error!, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: _loadAll,
              icon: const Icon(Icons.refresh, size: 18),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  // ──────────────────── TODAY TAB ────────────────────

  Widget _buildTodayTab() {
    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: _loadAll,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildStatusCard(),
          const SizedBox(height: 20),
          _buildActionButton(),
          if (_today != null && _today!.isCheckedOut) ...[
            const SizedBox(height: 20),
            _buildWorkedSummary(),
          ],
        ],
      ),
    );
  }

  Widget _buildStatusCard() {
    final isCheckedIn = _today?.isCheckedIn ?? false;
    final isCheckedOut = _today?.isCheckedOut ?? false;

    String statusText;
    Color statusColor;
    IconData statusIcon;

    if (isCheckedIn) {
      statusText = 'Checked In';
      statusColor = AppColors.success;
      statusIcon = Icons.login_rounded;
    } else if (isCheckedOut) {
      statusText = 'Checked Out';
      statusColor = AppColors.info;
      statusIcon = Icons.logout_rounded;
    } else {
      statusText = 'Not Checked In';
      statusColor = AppColors.warning;
      statusIcon = Icons.schedule_rounded;
    }

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(statusIcon, color: statusColor, size: 26),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        DateFormat('EEEE, dd MMM yyyy').format(DateTime.now()),
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        statusText,
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: statusColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const Divider(height: 28),
            Row(
              children: [
                _timeColumn(
                  'Check In',
                  _fmtTime(_today?.checkInTime),
                  Icons.arrow_downward_rounded,
                  AppColors.success,
                ),
                Container(width: 1, height: 40, color: AppColors.divider),
                _timeColumn(
                  'Check Out',
                  _fmtTime(_today?.checkOutTime),
                  Icons.arrow_upward_rounded,
                  AppColors.danger,
                ),
                if (isCheckedIn) ...[
                  Container(width: 1, height: 40, color: AppColors.divider),
                  _timeColumn(
                    'Working',
                    _fmtDuration(_elapsed),
                    Icons.timer_rounded,
                    AppColors.primary,
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _timeColumn(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 2),
          Text(label,
              style:
                  const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
        ],
      ),
    );
  }

  Widget _buildActionButton() {
    final isCheckedIn = _today?.isCheckedIn ?? false;
    final isCheckedOut = _today?.isCheckedOut ?? false;

    if (isCheckedOut) {
      return const SizedBox.shrink();
    }

    final isCheckIn = !isCheckedIn;
    final color = isCheckIn ? AppColors.success : const Color(0xFFE67E22);

    return SizedBox(
      height: 56,
      child: ElevatedButton.icon(
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: AppColors.white,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 3,
        ),
        onPressed: _actionLoading
            ? null
            : (isCheckIn ? _handleCheckIn : _handleCheckOut),
        icon: Icon(isCheckIn ? Icons.login_rounded : Icons.logout_rounded),
        label: Text(
          isCheckIn ? 'Check In' : 'Check Out',
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }

  Widget _buildWorkedSummary() {
    final hours = _today?.hoursWorked ?? 0;
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      color: AppColors.success.withOpacity(0.06),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Row(
          children: [
            const Icon(Icons.check_circle_rounded,
                color: AppColors.success, size: 28),
            const SizedBox(width: 14),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Day Complete',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${hours.toStringAsFixed(1)} hours worked',
                  style: const TextStyle(
                      fontSize: 13, color: AppColors.textSecondary),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ──────────────────── HISTORY TAB ────────────────────

  Widget _buildHistoryTab() {
    if (_history.isEmpty) {
      return const EmptyState(
        icon: Icons.history_rounded,
        title: 'No Attendance Records',
        subtitle: 'Your attendance history will appear here.',
      );
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: _loadAll,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _history.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) => _historyCard(_history[i]),
      ),
    );
  }

  Widget _historyCard(AttendanceRecord r) {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.08),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.calendar_today_rounded,
                  color: AppColors.primary, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _fmtDate(r.date),
                    style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                        color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${_fmtTime(r.checkInTime)} – ${_fmtTime(r.checkOutTime)}',
                    style: const TextStyle(
                        fontSize: 13, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.08),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '${(r.hoursWorked ?? 0).toStringAsFixed(1)}h',
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                  color: AppColors.primary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ──────────────────── EDIT REQUESTS TAB ────────────────────

  Widget _buildEditRequestsTab() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primary,
                side: const BorderSide(color: AppColors.primary),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              onPressed: () => _showEditRequestSheet(),
              icon: const Icon(Icons.edit_calendar_rounded, size: 20),
              label: const Text('Submit Edit Request',
                  style: TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
        ),
        Expanded(
          child: _editRequests.isEmpty
              ? const EmptyState(
                  icon: Icons.edit_note_rounded,
                  title: 'No Edit Requests',
                  subtitle: 'Submit a request to correct attendance records.',
                )
              : RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: _loadAll,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _editRequests.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (_, i) => _editRequestCard(_editRequests[i]),
                  ),
                ),
        ),
      ],
    );
  }

  Widget _editRequestCard(AttendanceEditRequest er) {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  _fmtDate(er.attendanceDate),
                  style: const TextStyle(
                      fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                ),
                const Spacer(),
                StatusBadge.fromStatus(er.status),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                _editTimePill('Original',
                    '${_fmtTime(er.origCheckIn)} – ${_fmtTime(er.origCheckOut)}'),
                const SizedBox(width: 8),
                const Icon(Icons.arrow_forward_rounded,
                    size: 16, color: AppColors.textSecondary),
                const SizedBox(width: 8),
                _editTimePill('Requested',
                    '${_fmtTime(er.reqCheckIn)} – ${_fmtTime(er.reqCheckOut)}'),
              ],
            ),
            if (er.reason != null && er.reason!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                er.reason!,
                style: const TextStyle(
                    fontSize: 13, color: AppColors.textSecondary),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            if (er.reviewerNote != null && er.reviewerNote!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.info.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Reviewer: ${er.reviewerNote}',
                  style: const TextStyle(
                      fontSize: 12, color: AppColors.info),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _editTimePill(String label, String value) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: const TextStyle(
                  fontSize: 11, color: AppColors.textSecondary)),
          const SizedBox(height: 2),
          Text(value,
              style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary)),
        ],
      ),
    );
  }

  void _showEditRequestSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: _editRequestForm(),
      ),
    );
  }

  Widget _editRequestForm() {
    return StatefulBuilder(builder: (ctx, setSheetState) {
      return SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
          child: Form(
            key: _editFormKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Attendance Edit Request',
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary),
                ),
                const SizedBox(height: 20),
                TextFormField(
                  controller: _editDateCtrl,
                  readOnly: true,
                  decoration: const InputDecoration(
                    labelText: 'Date',
                    prefixIcon: Icon(Icons.calendar_today_rounded),
                    border: OutlineInputBorder(),
                  ),
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: ctx,
                      initialDate: DateTime.now(),
                      firstDate:
                          DateTime.now().subtract(const Duration(days: 30)),
                      lastDate: DateTime.now(),
                    );
                    if (picked != null) {
                      _editDateCtrl.text =
                          DateFormat('yyyy-MM-dd').format(picked);
                      setSheetState(() {});
                    }
                  },
                  validator: (v) =>
                      (v == null || v.isEmpty) ? 'Select a date' : null,
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _editCheckInCtrl,
                        readOnly: true,
                        decoration: const InputDecoration(
                          labelText: 'Check In Time',
                          prefixIcon: Icon(Icons.login_rounded),
                          border: OutlineInputBorder(),
                        ),
                        onTap: () async {
                          final picked = await showTimePicker(
                            context: ctx,
                            initialTime: TimeOfDay.now(),
                          );
                          if (picked != null) {
                            _editCheckInCtrl.text =
                                '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
                            setSheetState(() {});
                          }
                        },
                        validator: (v) =>
                            (v == null || v.isEmpty) ? 'Required' : null,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        controller: _editCheckOutCtrl,
                        readOnly: true,
                        decoration: const InputDecoration(
                          labelText: 'Check Out Time',
                          prefixIcon: Icon(Icons.logout_rounded),
                          border: OutlineInputBorder(),
                        ),
                        onTap: () async {
                          final picked = await showTimePicker(
                            context: ctx,
                            initialTime: TimeOfDay.now(),
                          );
                          if (picked != null) {
                            _editCheckOutCtrl.text =
                                '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
                            setSheetState(() {});
                          }
                        },
                        validator: (v) =>
                            (v == null || v.isEmpty) ? 'Required' : null,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _editReasonCtrl,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Reason',
                    alignLabelWithHint: true,
                    prefixIcon:
                        Padding(padding: EdgeInsets.only(bottom: 44), child: Icon(Icons.notes_rounded)),
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Enter a reason' : null,
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: _actionLoading ? null : _submitEditRequest,
                    child: const Text('Submit Request',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w600)),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    });
  }
}
