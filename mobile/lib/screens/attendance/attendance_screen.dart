import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../models/attendance.dart';
import '../../providers/auth_provider.dart';
import '../../services/attendance_service.dart';
import '../../utils/melbourne_time.dart';
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
    _editReasonCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final companyId = context.read<AuthProvider>().user?.companyId;
      final results = await Future.wait([
        _service.getTodayStatus(companyId: companyId),
        _service.getHistory(companyId: companyId),
        _service.getMyEditRequests(companyId: companyId),
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
          final diff = MelbourneTime.now().difference(checkIn);
          setState(() => _elapsed = diff.isNegative ? Duration.zero : diff);
        }
      });
    }
  }

  DateTime? _parseTime(String raw) {
    final trimmed = raw.trim();
    final hasDate = trimmed.contains('-') && trimmed.contains(':');

    if (hasDate) {
      final parsed = MelbourneTime.parseServerTimestamp(trimmed);
      if (parsed != null) return parsed;
    }

    try {
      final parsed = DateTime.parse(trimmed);
      return parsed;
    } catch (_) {
      try {
        final parts = trimmed.split(':');
        final now = MelbourneTime.now();
        return DateTime(
          now.year,
          now.month,
          now.day,
          int.parse(parts[0]),
          int.parse(parts[1]),
          parts.length > 2 ? int.parse(parts[2]) : 0,
        );
      } catch (_) {
        return null;
      }
    }
  }

  Future<Position> _getPosition() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw Exception('Location services are disabled. Please enable GPS.');
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw Exception('Location permission denied.');
      }
    }
    if (permission == LocationPermission.deniedForever) {
      throw Exception(
        'Location permissions are permanently denied. Please enable them in App Settings.',
      );
    }

    try {
      // Use 'high' instead of 'best' for faster locks on most devices
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 25),
        ),
      );
    } catch (e) {
      if (e is TimeoutException) {
        throw Exception(
          'Location request timed out. Please ensure you are in an open area with good GPS signal.',
        );
      }
      throw Exception('Could not determine location: $e');
    }
  }

  Future<void> _showLocationSettingsPrompt() async {
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Enable Location Access'),
        content: const Text(
          'Location permission has been permanently denied for this app. Please enable it in app settings to continue.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.of(context).pop();
              await Geolocator.openAppSettings();
            },
            child: const Text('Open Settings'),
          ),
        ],
      ),
    );
  }

  Future<void> _handleCheckIn() async {
    setState(() => _actionLoading = true);
    try {
      final pos = await _getPosition();
      final companyId = context.read<AuthProvider>().user?.companyId;
      final result = await _service.checkIn(
        pos.latitude,
        pos.longitude,
        companyId: companyId,
      );
      setState(() => _today = result);
      _startLiveTimer();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Checked in successfully'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      final message = e.toString().replaceFirst('Exception: ', '');
      if (message.contains('permanently denied')) {
        await _showLocationSettingsPrompt();
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Check-in failed: $message'),
            backgroundColor: AppColors.danger,
          ),
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
      final companyId = context.read<AuthProvider>().user?.companyId;
      final result = await _service.checkOut(
        pos.latitude,
        pos.longitude,
        companyId: companyId,
      );
      _liveTimer?.cancel();
      setState(() {
        _today = result;
        _elapsed = Duration.zero;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Checked out successfully'),
            backgroundColor: AppColors.success,
          ),
        );
      }
      _loadAll();
    } catch (e) {
      final message = e.toString().replaceFirst('Exception: ', '');
      if (message.contains('permanently denied')) {
        await _showLocationSettingsPrompt();
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Check-out failed: $message'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  /// Matches web: completed shift with fewer than 8 recorded hours may request a correction.
  bool _shortShiftNeedsEditRecord(AttendanceRecord r) {
    if (r.checkInTime == null || r.checkOutTime == null) return false;
    return _effectiveWorkedHours(
          checkInRaw: r.checkInTime,
          checkOutRaw: r.checkOutTime,
          apiHours: r.hoursWorked,
        ) <
        8;
  }

  bool _shortShiftNeedsEditToday(AttendanceToday? t) {
    if (t == null || !t.isCheckedOut) return false;
    return _effectiveWorkedHours(
          checkInRaw: t.checkInTime,
          checkOutRaw: t.checkOutTime,
          apiHours: t.hoursWorked,
        ) <
        8;
  }

  double _effectiveWorkedHours({
    required String? checkInRaw,
    required String? checkOutRaw,
    required double? apiHours,
  }) {
    if (apiHours != null && apiHours > 0) return apiHours;
    final checkIn = checkInRaw == null ? null : _parseTime(checkInRaw);
    final checkOut = checkOutRaw == null ? null : _parseTime(checkOutRaw);
    if (checkIn == null || checkOut == null) return apiHours ?? 0;
    final duration = checkOut.difference(checkIn);
    if (duration.isNegative) return apiHours ?? 0;
    return duration.inMinutes / 60.0;
  }

  AttendanceRecord? _recordFromToday(AttendanceToday t) {
    if (t.id == null) return null;
    final rawDate = t.date ?? DateFormat('yyyy-MM-dd').format(DateTime.now());
    final dateOnly = rawDate.split('T').first;
    return AttendanceRecord(
      id: t.id!,
      date: dateOnly,
      checkInTime: t.checkInTime,
      checkOutTime: t.checkOutTime,
      hoursWorked: t.hoursWorked,
    );
  }

  DateTime _recordDayFromString(String dateStr) {
    final p = dateStr.split('T').first;
    final d = DateTime.tryParse(p);
    if (d != null) return DateTime(d.year, d.month, d.day);
    return DateTime.now();
  }

  DateTime? _combinedDateTimeForRecord(AttendanceRecord r, String? timeRaw) {
    if (timeRaw == null || timeRaw.isEmpty) return null;
    final day = _recordDayFromString(r.date);
    final iso = DateTime.tryParse(timeRaw);
    if (iso != null) {
      return DateTime(
        day.year,
        day.month,
        day.day,
        iso.hour,
        iso.minute,
        iso.second,
      );
    }
    final parts = timeRaw.split(':');
    if (parts.length >= 2) {
      final h = int.tryParse(parts[0].trim()) ?? 0;
      final m = int.tryParse(parts[1].trim()) ?? 0;
      return DateTime(day.year, day.month, day.day, h, m);
    }
    return null;
  }

  String _toApiDatetimeLocal(DateTime dt) {
    String p2(int n) => n.toString().padLeft(2, '0');
    return '${dt.year}-${p2(dt.month)}-${p2(dt.day)}T${p2(dt.hour)}:${p2(dt.minute)}';
  }

  Future<void> _submitEditRequestForRecord(
    AttendanceRecord record,
    DateTime reqIn,
    DateTime reqOut,
  ) async {
    if (!_editFormKey.currentState!.validate()) return;
    if (!reqOut.isAfter(reqIn)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Check-out must be after check-in.'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
      return;
    }
    setState(() => _actionLoading = true);
    try {
      await _service.submitEditRequest({
        'attendanceId': record.id,
        'reqCheckIn': _toApiDatetimeLocal(reqIn),
        'reqCheckOut': _toApiDatetimeLocal(reqOut),
        'reason': _editReasonCtrl.text.trim(),
      });
      _editReasonCtrl.clear();
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Edit request submitted'),
            backgroundColor: AppColors.success,
          ),
        );
      }
      _loadAll();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed: $e'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  void _openEditRequestSheet(AttendanceRecord record) {
    _editReasonCtrl.clear();
    var draftIn =
        _combinedDateTimeForRecord(record, record.checkInTime) ??
        _recordDayFromString(record.date);
    var draftOut =
        _combinedDateTimeForRecord(record, record.checkOutTime) ??
        draftIn.add(const Duration(hours: 1));

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetCtx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(sheetCtx).viewInsets.bottom,
        ),
        child: StatefulBuilder(
          builder: (ctx, setModalState) {
            return SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                child: Form(
                  key: _editFormKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Center(
                        child: Container(
                          width: 40,
                          height: 4,
                          decoration: BoxDecoration(
                            color: Colors.grey[300],
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Request attendance edit',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Original — ${_fmtDate(record.date)}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Check in: ${_fmtTime(record.checkInTime)} · Check out: ${_fmtTime(record.checkOutTime)} · '
                              '${_effectiveWorkedHours(checkInRaw: record.checkInTime, checkOutRaw: record.checkOutTime, apiHours: record.hoursWorked).toStringAsFixed(2)} h',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text(
                          'Corrected check-in',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
                        subtitle: Text(
                          DateFormat('dd MMM yyyy, hh:mm a').format(draftIn),
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.primary,
                          ),
                        ),
                        trailing: const Icon(
                          Icons.schedule,
                          color: AppColors.primary,
                        ),
                        onTap: () async {
                          final t = await showTimePicker(
                            context: ctx,
                            initialTime: TimeOfDay(
                              hour: draftIn.hour,
                              minute: draftIn.minute,
                            ),
                          );
                          if (t != null) {
                            final day = _recordDayFromString(record.date);
                            draftIn = DateTime(
                              day.year,
                              day.month,
                              day.day,
                              t.hour,
                              t.minute,
                            );
                            setModalState(() {});
                          }
                        },
                      ),
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text(
                          'Corrected check-out',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
                        subtitle: Text(
                          DateFormat('dd MMM yyyy, hh:mm a').format(draftOut),
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.primary,
                          ),
                        ),
                        trailing: const Icon(
                          Icons.schedule,
                          color: AppColors.primary,
                        ),
                        onTap: () async {
                          final t = await showTimePicker(
                            context: ctx,
                            initialTime: TimeOfDay(
                              hour: draftOut.hour,
                              minute: draftOut.minute,
                            ),
                          );
                          if (t != null) {
                            final day = _recordDayFromString(record.date);
                            draftOut = DateTime(
                              day.year,
                              day.month,
                              day.day,
                              t.hour,
                              t.minute,
                            );
                            setModalState(() {});
                          }
                        },
                      ),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _editReasonCtrl,
                        maxLines: 3,
                        decoration: const InputDecoration(
                          labelText: 'Reason *',
                          alignLabelWithHint: true,
                          prefixIcon: Padding(
                            padding: EdgeInsets.only(bottom: 44),
                            child: Icon(Icons.notes_rounded),
                          ),
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) => (v == null || v.trim().isEmpty)
                            ? 'Enter a reason'
                            : null,
                      ),
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: _actionLoading
                                  ? null
                                  : () => Navigator.pop(context),
                              child: const Text('Cancel'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: FilledButton(
                              style: FilledButton.styleFrom(
                                backgroundColor: AppColors.primary,
                              ),
                              onPressed: _actionLoading
                                  ? null
                                  : () => _submitEditRequestForRecord(
                                      record,
                                      draftIn,
                                      draftOut,
                                    ),
                              child: const Text('Submit request'),
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
        ),
      ),
    );
  }

  void _showPickRecordForEditDialog() {
    final eligible = _history.where(_shortShiftNeedsEditRecord).toList();
    if (eligible.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'No eligible days in history. Corrections apply to completed shifts under 8 hours.',
          ),
        ),
      );
      return;
    }
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Choose attendance day'),
        content: SizedBox(
          width: double.maxFinite,
          child: ListView.builder(
            shrinkWrap: true,
            itemCount: eligible.length,
            itemBuilder: (_, i) {
              final r = eligible[i];
              return ListTile(
                title: Text(_fmtDate(r.date)),
                subtitle: Text(
                  '${_fmtTime(r.checkInTime)} – ${_fmtTime(r.checkOutTime)} · ${(r.hoursWorked ?? 0).toStringAsFixed(1)} h',
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  _openEditRequestSheet(r);
                },
              );
            },
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }

  String _fmtDuration(Duration d) {
    final h = d.inHours.toString().padLeft(2, '0');
    final m = (d.inMinutes % 60).toString().padLeft(2, '0');
    final s = (d.inSeconds % 60).toString().padLeft(2, '0');
    return '$h:$m:$s';
  }

  String _fmtTime(String? raw) {
    if (raw == null) return '--:--';
    final dt = _parseTimeForDisplay(raw);
    if (dt == null) return raw;
    return DateFormat.jm().format(dt);
  }

  DateTime? _parseTimeForDisplay(String raw) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return null;
    return _parseTime(trimmed);
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
          unselectedLabelColor: Colors.white70,
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
                child: CircularProgressIndicator(color: AppColors.primary),
              )
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
          if (_shortShiftNeedsEditToday(_today)) ...[
            const SizedBox(height: 16),
            _buildTodayEditAttendanceCta(),
          ],
        ],
      ),
    );
  }

  Widget _buildTodayEditAttendanceCta() {
    final rec = _recordFromToday(_today!);
    if (rec == null) return const SizedBox.shrink();
    return Card(
      color: const Color(0xFFFFF9C4),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFFDE68A)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Row(
              children: [
                Icon(
                  Icons.edit_calendar_outlined,
                  size: 20,
                  color: Color(0xFF92400E),
                ),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Shift complete but under 8 hours — you can request a time correction.',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF92400E),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: _actionLoading
                  ? null
                  : () => _openEditRequestSheet(rec),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF92400E),
                side: const BorderSide(color: Color(0xFFFDE68A)),
              ),
              icon: const Icon(Icons.edit_rounded, size: 18),
              label: const Text('Request attendance edit'),
            ),
          ],
        ),
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
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
          ),
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
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
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
    final hours = _effectiveWorkedHours(
      checkInRaw: _today?.checkInTime,
      checkOutRaw: _today?.checkOutTime,
      apiHours: _today?.hoursWorked,
    );
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      color: AppColors.success.withOpacity(0.06),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Row(
          children: [
            const Icon(
              Icons.check_circle_rounded,
              color: AppColors.success,
              size: 28,
            ),
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
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
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
    final needsEdit = _shortShiftNeedsEditRecord(r);
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.calendar_today_rounded,
                    color: AppColors.primary,
                    size: 20,
                  ),
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
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${_fmtTime(r.checkInTime)} – ${_fmtTime(r.checkOutTime)}',
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: needsEdit
                        ? const Color(0xFFFFF9C4)
                        : AppColors.primary.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${_effectiveWorkedHours(checkInRaw: r.checkInTime, checkOutRaw: r.checkOutTime, apiHours: r.hoursWorked).toStringAsFixed(1)}h',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                      color: needsEdit
                          ? const Color(0xFFD97706)
                          : AppColors.primary,
                    ),
                  ),
                ),
              ],
            ),
            if (needsEdit) ...[
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: _actionLoading
                      ? null
                      : () => _openEditRequestSheet(r),
                  icon: const Icon(Icons.edit_rounded, size: 18),
                  label: const Text('Request edit'),
                  style: TextButton.styleFrom(
                    foregroundColor: const Color(0xFF92400E),
                  ),
                ),
              ),
            ],
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
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Request a correction for a completed shift under 8 hours (same rules as the web app).',
                style: TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary.withOpacity(0.95),
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  onPressed: _actionLoading
                      ? null
                      : _showPickRecordForEditDialog,
                  icon: const Icon(Icons.playlist_add_check_rounded, size: 20),
                  label: const Text(
                    'Choose day to request edit',
                    style: TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            ],
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
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const Spacer(),
                StatusBadge.fromStatus(er.status),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                _editTimePill(
                  'Original',
                  '${_fmtTime(er.origCheckIn)} – ${_fmtTime(er.origCheckOut)}',
                ),
                const SizedBox(width: 8),
                const Icon(
                  Icons.arrow_forward_rounded,
                  size: 16,
                  color: AppColors.textSecondary,
                ),
                const SizedBox(width: 8),
                _editTimePill(
                  'Requested',
                  '${_fmtTime(er.reqCheckIn)} – ${_fmtTime(er.reqCheckOut)}',
                ),
              ],
            ),
            if (er.reason != null && er.reason!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                er.reason!,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            if (er.reviewerNote != null && er.reviewerNote!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: AppColors.info.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Reviewer: ${er.reviewerNote}',
                  style: const TextStyle(fontSize: 12, color: AppColors.info),
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
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}
