class LeaveRequest {
  final int id;
  final String leaveType;
  final DateTime startDate;
  final DateTime endDate;
  final int daysCount;
  final String? reason;
  final String status;
  final String? reviewerNote;
  final DateTime? createdAt;

  LeaveRequest({
    required this.id,
    required this.leaveType,
    required this.startDate,
    required this.endDate,
    required this.daysCount,
    this.reason,
    this.status = 'pending',
    this.reviewerNote,
    this.createdAt,
  });

  factory LeaveRequest.fromJson(Map<String, dynamic> json) => LeaveRequest(
        id: json['id'] ?? 0,
        leaveType: json['leave_type'] ?? 'annual',
        startDate: DateTime.parse(
            json['start_date'] ?? DateTime.now().toIso8601String()),
        endDate: DateTime.parse(
            json['end_date'] ?? DateTime.now().toIso8601String()),
        daysCount: json['days_count'] ?? 1,
        reason: json['reason'],
        status: json['status'] ?? 'pending',
        reviewerNote: json['reviewer_note'],
        createdAt: json['created_at'] != null
            ? DateTime.tryParse(json['created_at'].toString())
            : null,
      );

  static const Map<String, String> leaveTypes = {
    'annual': 'Annual Leave',
    'sick': 'Sick Leave',
    'personal': 'Personal Leave',
    'unpaid': 'Unpaid Leave',
    'other': 'Other',
  };
}

class LeaveBalance {
  final String type;
  final double entitled;
  final double used;
  final double remaining;

  LeaveBalance({
    required this.type,
    required this.entitled,
    required this.used,
    required this.remaining,
  });

  factory LeaveBalance.fromJson(Map<String, dynamic> json) => LeaveBalance(
        type: json['type'] ?? '',
        entitled: (json['entitled'] ?? 0).toDouble(),
        used: (json['used'] ?? 0).toDouble(),
        remaining: (json['remaining'] ?? 0).toDouble(),
      );
}
