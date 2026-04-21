import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/theme/app_colors.dart';
import '../../core/storage/secure_storage.dart';
import '../../models/company.dart';
import '../../models/on_field_event.dart';
import '../../models/attendance.dart';
import '../../providers/auth_provider.dart';
import '../../providers/on_field_provider.dart';
import '../../services/attendance_service.dart';
import '../../services/companies_service.dart';
import '../../utils/melbourne_time.dart';
import '../../widgets/common/attendance_lunch_break_sheet.dart';
import '../../widgets/common/shell_scaffold_scope.dart';
import '../../widgets/common/loading_overlay.dart';

class OnFieldScreen extends StatefulWidget {
  const OnFieldScreen({super.key});

  @override
  State<OnFieldScreen> createState() => _OnFieldScreenState();
}

class _OnFieldScreenState extends State<OnFieldScreen> {
  final AttendanceService _attendanceService = AttendanceService();
  final CompaniesService _companiesService = CompaniesService();

  CalendarFormat _calendarFormat = CalendarFormat.month;
  DateTime _focusedDay = DateTime.now();
  DateTime _selectedDay = DateTime.now();
  final _dateFmt = DateFormat('EEEE, dd MMMM yyyy');
  // Default to daily view
  bool _isMonthView = false;

  AttendanceToday? _attStatus;
  bool _loadingAtt = true;
  bool _actionLoading = false;
  Duration _elapsed = Duration.zero;
  Timer? _liveTimer;
  bool _initialLoadTriggered = false;
  bool _loadingCompanyContext = false;
  List<Company> _companies = [];
  int? _selectedCompanyId;
  bool _companyContextBootstrapped = false;

  @override
  void initState() {
    super.initState();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_companyContextBootstrapped) {
      _companyContextBootstrapped = true;
      _bootstrapCompanyContext();
    }
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
    final companyId = _effectiveCompanyId;
    if (companyId == null && _isSuperAdmin) return;
    context.read<OnFieldProvider>().loadEventsForMonth(
      _focusedDay,
      companyId: companyId,
      assignedOnly: context.read<AuthProvider>().user?.isOnFieldRole == true ||
          context.read<AuthProvider>().user?.isFieldAgent == true,
    );
  }

  void _setSelectedDay(DateTime day) {
    final monthChanged =
        _focusedDay.year != day.year || _focusedDay.month != day.month;
    setState(() {
      _selectedDay = day;
      _focusedDay = day;
    });
    if (monthChanged) _loadEvents();
  }

  Future<void> _loadAttendance() async {
    setState(() => _loadingAtt = true);
    try {
      final companyId = _effectiveCompanyId;
      if (companyId == null) {
        setState(() {
          _attStatus = null;
          _loadingAtt = false;
        });
        return;
      }
      final status = await _attendanceService.getTodayStatus(
        companyId: companyId,
      );
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
      final checkIn =
          MelbourneTime.parseServerTimestamp(_attStatus!.checkInTime!) ??
          MelbourneTime.now();
      _elapsed = MelbourneTime.now().difference(checkIn);
      _liveTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (!mounted) return;
        final diff = MelbourneTime.now().difference(checkIn);
        setState(() => _elapsed = diff.isNegative ? Duration.zero : diff);
      });
    }
  }

  String _formatElapsed(Duration duration) {
    final totalSeconds = duration.inSeconds;
    final hours = totalSeconds ~/ 3600;
    final minutes = (totalSeconds % 3600) ~/ 60;
    final seconds = totalSeconds % 60;
    return '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  Future<Position> _getPosition() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw Exception('Location services are disabled. Please enable GPS.');
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw Exception('Location permission denied.');
      }
    }
    if (permission == LocationPermission.deniedForever) {
      throw Exception(
        'Location permission is permanently denied. Please enable it in app settings.',
      );
    }

    return Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 25),
      ),
    );
  }

  Future<void> _showLocationSettingsPrompt() async {
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Enable Location Access'),
        content: const Text(
          'Location permission has been permanently denied for this app. Please enable it in app settings to check in.',
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

  Future<void> _handleCheckAction(bool isCheckIn) async {
    int lunchBreakMinutes = 0;
    if (!isCheckIn) {
      final picked = await showAttendanceLunchBreakSheet(
        context,
        actionLabel: 'check out',
      );
      if (picked == null) return;
      lunchBreakMinutes = picked;
    }
    setState(() => _actionLoading = true);
    try {
      final pos = await _getPosition();
      final companyId = _effectiveCompanyId;
      if (companyId == null) {
        throw Exception('Please select a company first.');
      }
      if (isCheckIn) {
        final res = await _attendanceService.checkIn(
          pos.latitude,
          pos.longitude,
          companyId: companyId,
          lunchBreakMinutes: lunchBreakMinutes,
        );
        setState(() => _attStatus = res);
      } else {
        final res = await _attendanceService.checkOut(
          pos.latitude,
          pos.longitude,
          companyId: companyId,
          lunchBreakMinutes: lunchBreakMinutes,
        );
        setState(() => _attStatus = res);
      }
      _startLiveTimer();
    } catch (e) {
      if (mounted)
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: AppColors.danger,
          ),
        );
      final message = e.toString().replaceFirst('Exception: ', '');
      if (message.contains('permanently denied')) {
        await _showLocationSettingsPrompt();
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message), backgroundColor: AppColors.danger),
        );
      }
    } finally {
      setState(() => _actionLoading = false);
    }
  }

  void _onEventTap(OnFieldEvent event) {
    final loc = GoRouterState.of(context).matchedLocation;
    if (event.isSiteInspection && event.leadId != null) {
      final base = loc.contains('/admin')
          ? '/admin/leads'
          : loc.contains('/dashboard')
          ? '/dashboard/leads'
          : '/employee/leads';
      context.push('$base/${event.leadId}/site-inspection');
    } else if (event.type == 'installation' && event.jobId != null) {
      final base = loc.contains('/admin')
          ? '/admin/installation'
          : loc.contains('/dashboard')
          ? '/dashboard/installation'
          : '/employee/installation';
      context.push('$base/${event.jobId}');
    } else if (event.type == 'installation' && event.projectId != null) {
      final base = loc.contains('/admin')
          ? '/admin/projects'
          : loc.contains('/dashboard')
          ? '/dashboard/projects'
          : '/employee/projects';
      context.push('$base/${event.projectId}');
    }
  }

  Future<void> _openDirections(String address) async {
    final url = Uri.parse(
      'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(address)}',
    );
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  bool get _isSuperAdmin =>
      context.read<AuthProvider>().user?.isSuperAdmin == true;

  int? get _effectiveCompanyId {
    return context.read<AuthProvider>().user?.companyId;
  }

  Company? get _selectedCompany {
    final id = _effectiveCompanyId;
    if (id == null) return null;
    for (final company in _companies) {
      if (company.id == id) return company;
    }
    return null;
  }

  Future<void> _bootstrapCompanyContext() async {
    if (!_initialLoadTriggered) {
      _initialLoadTriggered = true;
      await _loadAll();
    }
  }

  Future<void> _chooseCompany() async {
    if (_companies.isEmpty) {
      await _bootstrapCompanyContext();
      if (_companies.isEmpty) return;
    }

    final picked = await showModalBottomSheet<Company>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (sheetCtx) {
        String query = '';
        List<Company> filtered = List<Company>.from(_companies);

        return StatefulBuilder(
          builder: (ctx, setModalState) {
            final q = query.trim().toLowerCase();
            filtered = q.isEmpty
                ? _companies
                : _companies.where((company) {
                    return company.name.toLowerCase().contains(q) ||
                        (company.email?.toLowerCase().contains(q) ?? false) ||
                        (company.abn?.toLowerCase().contains(q) ?? false);
                  }).toList();

            return SafeArea(
              child: Padding(
                padding: EdgeInsets.only(
                  left: 16,
                  right: 16,
                  top: 8,
                  bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      onChanged: (value) {
                        query = value;
                        setModalState(() {});
                      },
                      decoration: const InputDecoration(
                        labelText: 'Search company',
                        prefixIcon: Icon(Icons.search),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Flexible(
                      child: ListView.separated(
                        shrinkWrap: true,
                        itemCount: filtered.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (_, index) {
                          final company = filtered[index];
                          return ListTile(
                            leading: CircleAvatar(
                              backgroundColor: AppColors.primary.withOpacity(
                                0.12,
                              ),
                              child: Text(
                                company.name.isNotEmpty
                                    ? company.name[0].toUpperCase()
                                    : '?',
                                style: const TextStyle(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                            title: Text(company.name),
                            subtitle: Text(
                              company.email ?? company.companyType ?? 'Company',
                            ),
                            onTap: () => Navigator.pop(ctx, company),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );

    if (picked == null) return;
    setState(() => _selectedCompanyId = picked.id);
    await SecureStore.saveSelectedCompanyId(picked.id);
    await _loadAll();
  }

  @override
  Widget build(BuildContext context) {
    final shellLeading = ShellScaffoldScope.navigationLeading(context);
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        leading: shellLeading,
        automaticallyImplyLeading: shellLeading == null,
        title: const Text(
          'On-Field Dashboard',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.white,
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
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  const SizedBox(height: 8),
                  _buildAttendanceHeader(),
                  const SizedBox(height: 24),
                  _buildSectionTitle(
                    "Current Tasks",
                    action: 'View Calendar',
                    onAction: () {
                      setState(() {
                        _selectedDay = today;
                        _focusedDay = today;
                        _isMonthView = true;
                      });
                    },
                  ),
                  const SizedBox(height: 12),
                  if (!provider.hasEverLoaded ||
                      (provider.loading && provider.events.isEmpty))
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: CircularProgressIndicator(
                          color: AppColors.primary,
                        ),
                      ),
                    )
                  else if (todayEvents.isEmpty)
                    _buildEmptyJobs()
                  else
                    ...todayEvents.map(_buildTodayJobCard),
                  const SizedBox(height: 32),
                  _buildSectionTitle('Schedules & Calendar'),
                  const SizedBox(height: 12),
                  _buildViewToggle(),
                  const SizedBox(height: 12),
                  if (_isMonthView)
                    _buildCalendar(provider)
                  else
                    _buildDayHeader(),
                  const SizedBox(height: 16),
                  _buildSelectedDayEvents(provider),
                  const SizedBox(height: 100),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildViewToggle() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border.withOpacity(0.4)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text(
            'Schedule View',
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 14,
              color: AppColors.textPrimary,
            ),
          ),
          ToggleButtons(
            isSelected: [_isMonthView == false, _isMonthView == true],
            onPressed: (index) {
              setState(() {
                _isMonthView = index == 1;
              });
            },
            constraints: const BoxConstraints(minHeight: 36, minWidth: 72),
            borderRadius: BorderRadius.circular(12),
            fillColor: AppColors.primary,
            selectedColor: Colors.white,
            color: AppColors.textPrimary,
            children: const [
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 8),
                child: Text(
                  'Daily',
                  style: TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 8),
                child: Text(
                  'Month',
                  style: TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),
        ],
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
      ),
      child: Row(
        children: [
          IconButton(
            tooltip: 'Previous day',
            icon: const Icon(Icons.chevron_left),
            onPressed: () =>
                _setSelectedDay(_selectedDay.subtract(const Duration(days: 1))),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Text(
                  _dateFmt.format(_selectedDay),
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 15,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${_selectedDay.year}-${_selectedDay.month.toString().padLeft(2, '0')}-${_selectedDay.day.toString().padLeft(2, '0')}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Next day',
            icon: const Icon(Icons.chevron_right),
            onPressed: () =>
                _setSelectedDay(_selectedDay.add(const Duration(days: 1))),
          ),
        ],
      ),
    );
  }

  Widget _buildAttendanceHeader() {
    final isCheckedIn = _attStatus?.isCheckedIn ?? false;
    final isCheckedOut = _attStatus?.isCheckedOut ?? false;
    final statusText = isCheckedIn
        ? 'Checked In'
        : (isCheckedOut ? 'Checked Out' : 'Not Checked In');
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.2),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'FIELD AGENT STATUS',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    statusText,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(15),
                ),
                child: Icon(
                  isCheckedIn
                      ? Icons.login_rounded
                      : (isCheckedOut
                            ? Icons.check_circle_outline_rounded
                            : Icons.logout_rounded),
                  color: Colors.white,
                  size: 24,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              if (isCheckedIn)
                Expanded(
                  child: Row(
                    children: [
                      const Icon(
                        Icons.timer_outlined,
                        color: Colors.white70,
                        size: 16,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        _formatElapsed(_elapsed),
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              if (!isCheckedOut)
                ElevatedButton(
                  onPressed: () => _handleCheckAction(!isCheckedIn),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isCheckedIn
                        ? Colors.orange[400]
                        : Colors.white,
                    foregroundColor: isCheckedIn
                        ? Colors.white
                        : AppColors.primary,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 12,
                    ),
                  ),
                  child: Text(
                    isCheckedIn ? 'Checkout' : 'Check In Now',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(
    String title, {
    String? action,
    VoidCallback? onAction,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w900,
            color: AppColors.textPrimary,
            letterSpacing: -0.2,
          ),
        ),
        if (action != null)
          InkWell(
            onTap: onAction,
            child: Text(
              action,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: AppColors.primary,
                decoration: TextDecoration.underline,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildEmptyJobs() {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.border.withOpacity(0.5)),
      ),
      child: Center(
        child: Column(
          children: [
            Icon(
              Icons.event_available_outlined,
              size: 48,
              color: AppColors.textSecondary.withOpacity(0.2),
            ),
            const SizedBox(height: 12),
            const Text(
              'No immediate tasks for today',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTodayJobCard(OnFieldEvent event) {
    final isInspection = event.isSiteInspection;
    final timeStr = DateFormat('hh:mm a').format(event.start);
    final color = isInspection ? Colors.teal : Colors.indigo;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(color: AppColors.border.withOpacity(0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: color.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        isInspection ? 'Site Inspection' : 'Installation',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          color: color,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    const Spacer(),
                    Text(
                      timeStr,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  event.title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    color: AppColors.textPrimary,
                    height: 1.2,
                  ),
                ),
                if (event.address != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Row(
                      children: [
                        Icon(
                          Icons.map_outlined,
                          size: 14,
                          color: color.withOpacity(0.7),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            event.address!,
                            style: const TextStyle(
                              fontSize: 13,
                              color: AppColors.textSecondary,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: const BorderRadius.vertical(
                bottom: Radius.circular(24),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextButton.icon(
                    onPressed: event.address == null
                        ? null
                        : () => _openDirections(event.address!),
                    icon: const Icon(Icons.directions_outlined, size: 18),
                    label: const Text(
                      'Directions',
                      style: TextStyle(fontWeight: FontWeight.w800),
                    ),
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.textPrimary,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton(
                    onPressed: () => _onEventTap(event),
                    style: FilledButton.styleFrom(
                      backgroundColor: color,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text(
                      'Start Now',
                      style: TextStyle(fontWeight: FontWeight.w900),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCalendar(OnFieldProvider provider) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
        border: Border.all(color: AppColors.border.withOpacity(0.4)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _calendarFormatButton(
                  label: 'Month',
                  selected: _calendarFormat == CalendarFormat.month,
                  onTap: () =>
                      setState(() => _calendarFormat = CalendarFormat.month),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _calendarFormatButton(
                  label: '2 Weeks',
                  selected: _calendarFormat == CalendarFormat.twoWeeks,
                  onTap: () =>
                      setState(() => _calendarFormat = CalendarFormat.twoWeeks),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _calendarFormatButton(
                  label: 'Week',
                  selected: _calendarFormat == CalendarFormat.week,
                  onTap: () =>
                      setState(() => _calendarFormat = CalendarFormat.week),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          TableCalendar<OnFieldEvent>(
            firstDay: DateTime.utc(2023, 1, 1),
            lastDay: DateTime.utc(2030, 12, 31),
            focusedDay: _focusedDay,
            calendarFormat: _calendarFormat,
            availableCalendarFormats: const {
              CalendarFormat.month: 'Month',
              CalendarFormat.twoWeeks: '2 Weeks',
              CalendarFormat.week: 'Week',
            },
            selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
            eventLoader: (day) => provider.eventsForDay(day),
            startingDayOfWeek: StartingDayOfWeek.monday,
            rowHeight: 52,
            calendarBuilders: CalendarBuilders(
              markerBuilder: (context, date, events) {
                if (events.isEmpty) return null;
                return Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: events
                      .take(3)
                      .map(
                        (e) => Container(
                          margin: const EdgeInsets.symmetric(horizontal: 1),
                          width: 12,
                          height: 3,
                          decoration: BoxDecoration(
                            color: e.isSiteInspection
                                ? Colors.teal
                                : Colors.indigo,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      )
                      .toList(),
                );
              },
            ),
            calendarStyle: const CalendarStyle(
              todayDecoration: BoxDecoration(
                color: Color(0x22146b6b),
                shape: BoxShape.circle,
              ),
              todayTextStyle: TextStyle(
                color: AppColors.primary,
                fontWeight: FontWeight.bold,
              ),
              selectedDecoration: BoxDecoration(
                color: AppColors.primary,
                shape: BoxShape.circle,
              ),
              markersAutoAligned: false,
              markerMargin: EdgeInsets.only(top: 36),
              outsideDaysVisible: false,
            ),
            headerStyle: HeaderStyle(
              formatButtonVisible: false,
              titleCentered: true,
              formatButtonDecoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
              ),
              formatButtonTextStyle: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 12,
                color: AppColors.primary,
              ),
            ),
            onDaySelected: (selected, focused) => _setSelectedDay(selected),
            onFormatChanged: (format) =>
                setState(() => _calendarFormat = format),
            onPageChanged: (focused) {
              _focusedDay = focused;
              _loadEvents();
            },
          ),
        ],
      ),
    );
  }

  Widget _calendarFormatButton({
    required String label,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : AppColors.surface,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : AppColors.textPrimary,
            fontWeight: FontWeight.w700,
            fontSize: 12,
          ),
        ),
      ),
    );
  }

  Widget _buildSelectedDayEvents(OnFieldProvider provider) {
    final events = provider.eventsForDay(_selectedDay);
    if (events.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(
              Icons.calendar_view_day_outlined,
              size: 16,
              color: AppColors.textSecondary,
            ),
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
        ...events.map(
          (e) => Container(
            margin: const EdgeInsets.only(bottom: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border.withOpacity(0.3)),
            ),
            child: ListTile(
              onTap: () => _onEventTap(e),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 4,
              ),
              leading: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: (e.isSiteInspection ? Colors.teal : Colors.indigo)
                      .withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  e.isSiteInspection ? Icons.search : Icons.build_outlined,
                  size: 18,
                  color: e.isSiteInspection ? Colors.teal : Colors.indigo,
                ),
              ),
              title: Text(
                e.title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              subtitle: Text(
                DateFormat('hh:mm a').format(e.start),
                style: const TextStyle(fontSize: 12),
              ),
              trailing: const Icon(
                Icons.arrow_forward_ios_rounded,
                size: 14,
                color: AppColors.textSecondary,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
