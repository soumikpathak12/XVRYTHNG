/// API may return DECIMAL columns as strings (e.g. `"0.00"`).
double? _jsonToDouble(dynamic v) {
  if (v == null) return null;
  if (v is double) return v;
  if (v is int) return v.toDouble();
  if (v is String) {
    final t = v.trim();
    if (t.isEmpty) return null;
    return double.tryParse(t);
  }
  return null;
}
int? _jsonToInt(dynamic v) {
  if (v == null) return null;
  if (v is int) return v;
  if (v is double) return v.toInt();
  if (v is String) {
    final t = v.trim();
    if (t.isEmpty) return null;
    return int.tryParse(t);
  }
  return null;
}

class AttendanceToday {
  final int? id;
  final String? date;
  final String? checkInTime;
  final String? checkOutTime;
  final double? hoursWorked;
  final int? lunchBreakMinutes;
  final double? checkInLat;
  final double? checkInLng;
  final double? checkOutLat;
  final double? checkOutLng;

  AttendanceToday({
    this.id,
    this.date,
    this.checkInTime,
    this.checkOutTime,
    this.hoursWorked,
    this.lunchBreakMinutes,
    this.checkInLat,
    this.checkInLng,
    this.checkOutLat,
    this.checkOutLng,
  });

  bool get isCheckedIn => checkInTime != null && checkOutTime == null;
  bool get isCheckedOut => checkOutTime != null;
  bool get hasNotCheckedIn => checkInTime == null;

  factory AttendanceToday.fromJson(Map<String, dynamic> json) =>
      AttendanceToday(
        id: json['id'] is int
            ? json['id'] as int
            : int.tryParse('${json['id']}'),
        date: json['date'],
        checkInTime: json['check_in_time'],
        checkOutTime: json['check_out_time'],
        hoursWorked: _jsonToDouble(json['hours_worked']),
        lunchBreakMinutes: _jsonToInt(json['lunch_break_minutes']),
        checkInLat: _jsonToDouble(json['check_in_lat']),
        checkInLng: _jsonToDouble(json['check_in_lng']),
        checkOutLat: _jsonToDouble(json['check_out_lat']),
        checkOutLng: _jsonToDouble(json['check_out_lng']),
      );
}

class AttendanceRecord {
  final int id;
  final String date;
  final String? checkInTime;
  final String? checkOutTime;
  final double? hoursWorked;
  final int? lunchBreakMinutes;

  AttendanceRecord({
    required this.id,
    required this.date,
    this.checkInTime,
    this.checkOutTime,
    this.hoursWorked,
    this.lunchBreakMinutes,
  });

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) =>
      AttendanceRecord(
        id: json['id'] is int
            ? json['id'] as int
            : int.tryParse('${json['id']}') ?? 0,
        date: json['date'] ?? '',
        checkInTime: json['check_in_time'],
        checkOutTime: json['check_out_time'],
        hoursWorked: _jsonToDouble(json['hours_worked']),
        lunchBreakMinutes: _jsonToInt(json['lunch_break_minutes']),
      );
}

class AttendanceEditRequest {
  final int id;
  final String? attendanceDate;
  final String? origCheckIn;
  final String? origCheckOut;
  final double? origHours;
  final String? reqCheckIn;
  final String? reqCheckOut;
  final String? reason;
  final String status;
  final String? reviewerNote;
  final String? employeeName;
  final String? employeeCode;

  AttendanceEditRequest({
    required this.id,
    this.attendanceDate,
    this.origCheckIn,
    this.origCheckOut,
    this.origHours,
    this.reqCheckIn,
    this.reqCheckOut,
    this.reason,
    this.status = 'pending',
    this.reviewerNote,
    this.employeeName,
    this.employeeCode,
  });

  factory AttendanceEditRequest.fromJson(Map<String, dynamic> json) =>
      AttendanceEditRequest(
        id: json['id'] ?? 0,
        attendanceDate: json['attendance_date'],
        origCheckIn: json['orig_check_in'],
        origCheckOut: json['orig_check_out'],
        origHours: _jsonToDouble(json['orig_hours']),
        reqCheckIn: json['req_check_in'],
        reqCheckOut: json['req_check_out'],
        reason: json['reason'],
        status: json['status'] ?? 'pending',
        reviewerNote: json['reviewer_note'],
        employeeName: json['employee_name'],
        employeeCode: json['employee_code'],
      );
}

/// One row from GET /api/employees/attendance/company-day (employee + optional attendance).
class TeamAttendanceRosterRow {
  final int employeeId;
  final String? employeeCode;
  final String firstName;
  final String lastName;
  final String? employeeStatus;
  final int? attendanceId;
  final String? checkInTime;
  final String? checkOutTime;
  /// Pre-formatted in company business zone (from API). Prefer over [checkInTime].
  final String? checkInTimeDisplay;
  final String? checkOutTimeDisplay;
  final double? hoursWorked;
  final int? lunchBreakMinutes;

  TeamAttendanceRosterRow({
    required this.employeeId,
    this.employeeCode,
    required this.firstName,
    required this.lastName,
    this.employeeStatus,
    this.attendanceId,
    this.checkInTime,
    this.checkOutTime,
    this.checkInTimeDisplay,
    this.checkOutTimeDisplay,
    this.hoursWorked,
    this.lunchBreakMinutes,
  });

  String get displayName => '$firstName $lastName'.trim();

  factory TeamAttendanceRosterRow.fromJson(Map<String, dynamic> json) =>
      TeamAttendanceRosterRow(
        employeeId: _jsonToInt(json['employee_id']) ?? 0,
        employeeCode: json['employee_code']?.toString(),
        firstName: json['first_name']?.toString() ?? '',
        lastName: json['last_name']?.toString() ?? '',
        employeeStatus: json['employee_status']?.toString(),
        attendanceId: _jsonToInt(json['attendance_id']),
        checkInTime: json['check_in_time']?.toString(),
        checkOutTime: json['check_out_time']?.toString(),
        checkInTimeDisplay: json['check_in_time_display']?.toString(),
        checkOutTimeDisplay: json['check_out_time_display']?.toString(),
        hoursWorked: _jsonToDouble(json['hours_worked']),
        lunchBreakMinutes: _jsonToInt(json['lunch_break_minutes']),
      );
}
