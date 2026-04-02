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

class AttendanceToday {
  final int? id;
  final String? date;
  final String? checkInTime;
  final String? checkOutTime;
  final double? hoursWorked;
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
        id: json['id'],
        date: json['date'],
        checkInTime: json['check_in_time'],
        checkOutTime: json['check_out_time'],
        hoursWorked: _jsonToDouble(json['hours_worked']),
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

  AttendanceRecord({
    required this.id,
    required this.date,
    this.checkInTime,
    this.checkOutTime,
    this.hoursWorked,
  });

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) =>
      AttendanceRecord(
        id: json['id'] ?? 0,
        date: json['date'] ?? '',
        checkInTime: json['check_in_time'],
        checkOutTime: json['check_out_time'],
        hoursWorked: _jsonToDouble(json['hours_worked']),
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
