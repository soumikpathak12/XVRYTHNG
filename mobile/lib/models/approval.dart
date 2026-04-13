class Approval {
  final int id;
  final String type; // 'leave', 'expense', 'attendance'
  final String employeeName;
  final String? employeeCode;
  final String? companyName;
  final String status;
  final String? reviewerNote;
  final DateTime? createdAt;

  // Leave fields
  final String? leaveType;
  final DateTime? startDate;
  final DateTime? endDate;
  final int? daysCount;
  final String? reason;

  // Expense fields
  final String? category;
  final double? amount;
  final String? currency;
  final DateTime? expenseDate;
  final String? description;
  final String? receiptPath;
  final String? projectName;

  // Attendance edit fields
  final String? origCheckIn;
  final String? origCheckOut;
  final double? origHours;
  final String? reqCheckIn;
  final String? reqCheckOut;

  Approval({
    required this.id,
    required this.type,
    required this.employeeName,
    this.employeeCode,
    this.companyName,
    this.status = 'pending',
    this.reviewerNote,
    this.createdAt,
    this.leaveType,
    this.startDate,
    this.endDate,
    this.daysCount,
    this.reason,
    this.category,
    this.amount,
    this.currency,
    this.expenseDate,
    this.description,
    this.receiptPath,
    this.projectName,
    this.origCheckIn,
    this.origCheckOut,
    this.origHours,
    this.reqCheckIn,
    this.reqCheckOut,
  });

  static double? _asDouble(dynamic value) {
    if (value == null) return null;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) {
      final trimmed = value.trim();
      if (trimmed.isEmpty) return null;
      return double.tryParse(trimmed);
    }
    return double.tryParse(value.toString());
  }

  static int? _asInt(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is double) return value.round();
    if (value is String) {
      final trimmed = value.trim();
      if (trimmed.isEmpty) return null;
      return int.tryParse(trimmed);
    }
    return int.tryParse(value.toString());
  }

  factory Approval.fromJson(Map<String, dynamic> json) => Approval(
        id: json['id'] ?? 0,
        type: json['_type'] ?? json['type'] ?? 'leave',
        employeeName: json['employee_name'] ?? '',
        employeeCode: json['employee_code'],
        companyName: json['company_name'],
        status: json['status'] ?? 'pending',
        reviewerNote: json['reviewer_note'],
        createdAt: json['created_at'] != null
            ? DateTime.tryParse(json['created_at'].toString())
            : null,
        leaveType: json['leave_type'],
        startDate: json['start_date'] != null
            ? DateTime.tryParse(json['start_date'].toString())
            : null,
        endDate: json['end_date'] != null
            ? DateTime.tryParse(json['end_date'].toString())
            : null,
        daysCount: _asInt(json['days_count']),
        reason: json['reason'],
        category: json['category'],
        amount: _asDouble(json['amount']),
        currency: json['currency'],
        expenseDate: json['expense_date'] != null
            ? DateTime.tryParse(json['expense_date'].toString())
            : null,
        description: json['description'],
        receiptPath: json['receipt_path'],
        projectName: json['project_name'],
        origCheckIn: json['orig_check_in'],
        origCheckOut: json['orig_check_out'],
        origHours: _asDouble(json['orig_hours']),
        reqCheckIn: json['req_check_in'],
        reqCheckOut: json['req_check_out'],
      );
}

class ApprovalCounts {
  final int pending;
  final int leave;
  final int expense;
  final int attendance;

  ApprovalCounts({
    this.pending = 0,
    this.leave = 0,
    this.expense = 0,
    this.attendance = 0,
  });

  factory ApprovalCounts.fromJson(Map<String, dynamic> json) => ApprovalCounts(
        pending: json['pending'] ?? 0,
        leave: json['by_type']?['leave'] ?? 0,
        expense: json['by_type']?['expense'] ?? 0,
        attendance: json['by_type']?['attendance'] ?? 0,
      );
}
