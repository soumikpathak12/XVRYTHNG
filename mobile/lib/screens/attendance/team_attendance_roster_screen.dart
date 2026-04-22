import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../models/attendance.dart';
import '../../models/company.dart';
import '../../providers/auth_provider.dart';
import '../../services/attendance_service.dart';
import '../../services/companies_service.dart';
import '../../utils/melbourne_time.dart';

String _todayYyyyMmDd() {
  final n = DateTime.now();
  final m = n.month.toString().padLeft(2, '0');
  final d = n.day.toString().padLeft(2, '0');
  return '${n.year}-$m-$d';
}

class TeamAttendanceRosterScreen extends StatefulWidget {
  const TeamAttendanceRosterScreen({super.key});

  @override
  State<TeamAttendanceRosterScreen> createState() =>
      _TeamAttendanceRosterScreenState();
}

class _TeamAttendanceRosterScreenState extends State<TeamAttendanceRosterScreen> {
  final _attendance = AttendanceService();
  final _companiesService = CompaniesService();

  String _date = _todayYyyyMmDd();
  List<TeamAttendanceRosterRow> _rows = [];
  String? _attendanceTimeZone;
  List<Company> _companies = [];
  int? _selectedCompanyId;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  Future<void> _bootstrap() async {
    final auth = context.read<AuthProvider>();
    if (!auth.can('attendance_history', 'view')) {
      setState(() {
        _loading = false;
        _error = 'You do not have permission to view team attendance.';
      });
      return;
    }

    if (auth.user?.isSuperAdmin == true) {
      try {
        final list = await _companiesService.listCompanies();
        if (!mounted) return;
        setState(() {
          _companies = list;
          _selectedCompanyId =
              list.isNotEmpty ? list.first.id : null;
        });
      } catch (e) {
        if (!mounted) return;
        setState(() => _error = e.toString());
      }
    } else {
      setState(() {
        _selectedCompanyId = auth.user?.companyId;
      });
    }
    await _loadRoster();
  }

  int? get _effectiveCompanyId {
    final auth = context.read<AuthProvider>();
    if (auth.user?.isSuperAdmin == true) return _selectedCompanyId;
    return auth.user?.companyId;
  }

  Future<void> _loadRoster() async {
    final auth = context.read<AuthProvider>();
    if (!auth.can('attendance_history', 'view')) return;

    final cid = _effectiveCompanyId;
    if (auth.user?.isSuperAdmin == true && cid == null) {
      setState(() {
        _loading = false;
        _rows = [];
        _error = 'Select a company.';
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await _attendance.getCompanyDayRoster(
        _date,
        companyId: cid,
      );
      if (!mounted) return;
      setState(() {
        _rows = result.rows;
        _attendanceTimeZone = result.attendanceTimeZone;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _rows = [];
        _loading = false;
      });
    }
  }

  /// Match [AttendanceScreen]: server sends naïve UTC wall times; use Melbourne wall clock, not [DateTime.toLocal]().
  String _fmtTime(
    String? raw, {
    String? preformatted,
  }) {
    if (raw != null && raw.isNotEmpty) {
      final dt = MelbourneTime.parseServerTimestamp(raw);
      if (dt != null) {
        return DateFormat.yMMMd().add_jm().format(dt);
      }
    }
    if (preformatted != null && preformatted.isNotEmpty) {
      return preformatted;
    }
    if (raw == null || raw.isEmpty) return '—';
    return raw;
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final canGoBack = Navigator.of(context).canPop();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Team attendance'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        automaticallyImplyLeading: false,
        leading: canGoBack
            ? IconButton(
                tooltip: 'Back',
                icon: const Icon(Icons.arrow_back),
                onPressed: () => Navigator.of(context).maybePop(),
              )
            : null,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loading ? null : _loadRoster,
          ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (auth.user?.isSuperAdmin == true) ...[
                  const Text(
                    'Company',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: AppColors.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<int>(
                    value: _selectedCompanyId,
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      isDense: true,
                      contentPadding:
                          EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                    hint: const Text('Select company'),
                    items: _companies
                        .map(
                          (c) => DropdownMenuItem(
                            value: c.id,
                            child: Text(
                              c.name,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: (v) {
                      setState(() => _selectedCompanyId = v);
                      _loadRoster();
                    },
                  ),
                  const SizedBox(height: 12),
                ],
                const Text(
                  'Date',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: AppColors.textSecondary,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 6),
                OutlinedButton.icon(
                  onPressed: () async {
                    final initial = DateTime.tryParse(_date) ?? DateTime.now();
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: initial,
                      firstDate: DateTime(2020),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (picked != null && mounted) {
                      final m = picked.month.toString().padLeft(2, '0');
                      final d = picked.day.toString().padLeft(2, '0');
                      setState(() => _date = '${picked.year}-$m-$d');
                      await _loadRoster();
                    }
                  },
                  icon: const Icon(Icons.calendar_today, size: 18),
                  label: Text(_date),
                ),
                if (_attendanceTimeZone != null &&
                    _attendanceTimeZone!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Times shown in $_attendanceTimeZone',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                _error!,
                style: const TextStyle(color: Colors.red),
              ),
            ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _rows.isEmpty
                    ? const Center(
                        child: Text(
                          'No employees or no attendance for this date.',
                          textAlign: TextAlign.center,
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                        itemCount: _rows.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (context, i) {
                          final r = _rows[i];
                          final hours = r.hoursWorked != null
                              ? r.hoursWorked!.toStringAsFixed(2)
                              : '—';
                          final lunch = r.attendanceId != null &&
                                  r.lunchBreakMinutes != null
                              ? '${r.lunchBreakMinutes}'
                              : '—';
                          return ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text(
                              r.displayName,
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                            subtitle: Text(
                              [
                                if (r.employeeCode != null &&
                                    r.employeeCode!.isNotEmpty)
                                  'Code: ${r.employeeCode}',
                                if (r.employeeStatus != null)
                                  'Status: ${r.employeeStatus}',
                                'In: ${_fmtTime(r.checkInTime, preformatted: r.checkInTimeDisplay)}',
                                'Out: ${_fmtTime(r.checkOutTime, preformatted: r.checkOutTimeDisplay)}',
                                'Hours: $hours · Lunch (min): $lunch',
                              ].join('\n'),
                              style: const TextStyle(
                                fontSize: 12,
                                height: 1.35,
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
