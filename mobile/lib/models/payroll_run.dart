/// Payroll run model matching backend `/api/employees/payroll/*` responses.
class PayrollRun {
  final int? id;
  final String periodType;
  final String periodStart;
  final String periodEnd;
  final String? status;
  final double totalPayrollAmount;
  final int totalEmployees;
  final double totalHours;
  final double overtimeHours;
  final List<PayrollDetail> details;
  final DateTime? createdAt;

  const PayrollRun({
    this.id,
    required this.periodType,
    required this.periodStart,
    required this.periodEnd,
    this.status,
    required this.totalPayrollAmount,
    required this.totalEmployees,
    required this.totalHours,
    required this.overtimeHours,
    required this.details,
    this.createdAt,
  });

  factory PayrollRun.fromJson(Map<String, dynamic> json) {
    final detailsList = <PayrollDetail>[];
    final rawDetails = json['details'];
    if (rawDetails is List) {
      for (final e in rawDetails) {
        if (e is Map) {
          detailsList
              .add(PayrollDetail.fromJson(Map<String, dynamic>.from(e)));
        }
      }
    }

    return PayrollRun(
      id: json['id'],
      periodType: json['period_type'] ?? json['periodType'] ?? 'monthly',
      periodStart: json['period_start'] ?? json['periodStart'] ?? '',
      periodEnd: json['period_end'] ?? json['periodEnd'] ?? '',
      status: json['status'],
      totalPayrollAmount: _toDouble(
          json['total_payroll_amount'] ?? json['totalPayrollAmount']),
      totalEmployees:
          (json['total_employees'] ?? json['totalEmployees'] ?? 0) as int,
      totalHours:
          _toDouble(json['total_hours'] ?? json['totalHours']),
      overtimeHours:
          _toDouble(json['overtime_hours'] ?? json['overtimeHours']),
      details: detailsList,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
    );
  }

  static double _toDouble(dynamic v) {
    if (v == null) return 0;
    if (v is double) return v;
    if (v is int) return v.toDouble();
    return double.tryParse(v.toString()) ?? 0;
  }
}

class PayrollDetail {
  final int employeeId;
  final String employeeName;
  final double regularHours;
  final double overtimeHours;
  final double hourlyRate;
  final double overtimeRate;
  final double grossPay;
  final double taxDeductions;
  final double otherDeductions;
  final double deductions;
  final double netPay;

  const PayrollDetail({
    required this.employeeId,
    required this.employeeName,
    required this.regularHours,
    required this.overtimeHours,
    required this.hourlyRate,
    required this.overtimeRate,
    required this.grossPay,
    required this.taxDeductions,
    required this.otherDeductions,
    required this.deductions,
    required this.netPay,
  });

  factory PayrollDetail.fromJson(Map<String, dynamic> json) {
    double d(dynamic v) {
      if (v == null) return 0;
      if (v is double) return v;
      if (v is int) return v.toDouble();
      return double.tryParse(v.toString()) ?? 0;
    }

    return PayrollDetail(
      employeeId:
          json['employee_id'] ?? json['employeeId'] ?? 0,
      employeeName: json['employee_name'] ??
          json['employeeName'] ??
          '${json['first_name'] ?? ''} ${json['last_name'] ?? ''}'.trim(),
      regularHours: d(json['regular_hours'] ?? json['regularHours']),
      overtimeHours: d(json['overtime_hours'] ?? json['overtimeHours']),
      hourlyRate: d(json['hourly_rate'] ?? json['hourlyRate']),
      overtimeRate: d(json['overtime_rate'] ?? json['overtimeRate']),
      grossPay: d(json['gross_pay'] ?? json['grossPay']),
      taxDeductions: d(json['tax_deductions'] ?? json['taxDeductions']),
      otherDeductions: d(json['other_deductions'] ?? json['otherDeductions']),
      deductions: d(json['deductions']),
      netPay: d(json['net_pay'] ?? json['netPay']),
    );
  }
}

/// Lightweight payroll run summary for the runs dropdown.
class PayrollRunSummary {
  final int id;
  final String periodType;
  final String periodStart;
  final String periodEnd;
  final String status;

  const PayrollRunSummary({
    required this.id,
    required this.periodType,
    required this.periodStart,
    required this.periodEnd,
    required this.status,
  });

  factory PayrollRunSummary.fromJson(Map<String, dynamic> json) {
    return PayrollRunSummary(
      id: json['id'],
      periodType: json['period_type'] ?? json['periodType'] ?? '',
      periodStart: json['period_start'] ?? json['periodStart'] ?? '',
      periodEnd: json['period_end'] ?? json['periodEnd'] ?? '',
      status: json['status'] ?? 'draft',
    );
  }

  String get displayLabel =>
      '$periodType — $periodStart to $periodEnd ($status)';
}
