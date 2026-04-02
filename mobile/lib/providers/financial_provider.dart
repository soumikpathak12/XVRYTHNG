import 'package:flutter/foundation.dart';
import '../models/pm_dashboard.dart';
import '../models/payroll_run.dart';
import '../services/projects_service.dart';
import '../services/payroll_service.dart';

/// Provider for PM Dashboard stats and Payroll management.
class FinancialProvider extends ChangeNotifier {
  final _projectsService = ProjectsService();
  final _payrollService = PayrollService();

  // ── PM Dashboard ─────────────────────────────────────────
  PmDashboard? _dashboard;
  bool _dashboardLoading = false;
  String? _dashboardError;

  PmDashboard? get dashboard => _dashboard;
  bool get dashboardLoading => _dashboardLoading;
  String? get dashboardError => _dashboardError;

  Future<void> loadDashboard() async {
    _dashboardLoading = true;
    _dashboardError = null;
    notifyListeners();

    try {
      final data = await _projectsService.getPmDashboard();
      _dashboard = PmDashboard.fromJson(data);
    } catch (e) {
      _dashboardError = e.toString();
    } finally {
      _dashboardLoading = false;
      notifyListeners();
    }
  }

  // ── Payroll ──────────────────────────────────────────────
  List<PayrollRunSummary> _payrollRuns = [];
  PayrollRun? _selectedRun;
  PayrollRun? _calculatedPayroll;
  bool _payrollLoading = false;
  String? _payrollError;
  bool _calculating = false;
  bool _saving = false;
  bool _emailingAll = false;

  List<PayrollRunSummary> get payrollRuns => _payrollRuns;
  PayrollRun? get selectedRun => _selectedRun;
  PayrollRun? get calculatedPayroll => _calculatedPayroll;
  bool get payrollLoading => _payrollLoading;
  String? get payrollError => _payrollError;
  bool get calculating => _calculating;
  bool get saving => _saving;
  bool get emailingAll => _emailingAll;

  /// Active data: either selectedRun or calculatedPayroll.
  PayrollRun? get activePayroll => _selectedRun ?? _calculatedPayroll;

  Future<void> loadPayrollRuns() async {
    _payrollLoading = true;
    _payrollError = null;
    notifyListeners();

    try {
      _payrollRuns = await _payrollService.getPayrollRuns();
    } catch (e) {
      _payrollError = e.toString();
    } finally {
      _payrollLoading = false;
      notifyListeners();
    }
  }

  Future<void> selectPayrollRun(int runId) async {
    _payrollLoading = true;
    _payrollError = null;
    _calculatedPayroll = null;
    notifyListeners();

    try {
      _selectedRun = await _payrollService.getPayrollRunDetails(runId);
    } catch (e) {
      _payrollError = e.toString();
    } finally {
      _payrollLoading = false;
      notifyListeners();
    }
  }

  void clearSelectedRun() {
    _selectedRun = null;
    notifyListeners();
  }

  Future<void> calculatePayroll({
    required String periodStart,
    required String periodEnd,
    required String periodType,
  }) async {
    _calculating = true;
    _payrollError = null;
    _selectedRun = null;
    notifyListeners();

    try {
      _calculatedPayroll = await _payrollService.calculatePayroll(
        periodStart: periodStart,
        periodEnd: periodEnd,
        periodType: periodType,
      );
    } catch (e) {
      _payrollError = e.toString();
    } finally {
      _calculating = false;
      notifyListeners();
    }
  }

  Future<bool> savePayrollRun() async {
    if (_calculatedPayroll == null) return false;
    _saving = true;
    _payrollError = null;
    notifyListeners();

    try {
      await _payrollService.savePayrollRun({
        'periodStart': _calculatedPayroll!.periodStart,
        'periodEnd': _calculatedPayroll!.periodEnd,
        'periodType': _calculatedPayroll!.periodType,
        'totalPayrollAmount': _calculatedPayroll!.totalPayrollAmount,
        'totalEmployees': _calculatedPayroll!.totalEmployees,
        'totalHours': _calculatedPayroll!.totalHours,
        'overtimeHours': _calculatedPayroll!.overtimeHours,
        'details': _calculatedPayroll!.details
            .map((d) => {
                  'employeeId': d.employeeId,
                  'employeeName': d.employeeName,
                  'regularHours': d.regularHours,
                  'overtimeHours': d.overtimeHours,
                  'hourlyRate': d.hourlyRate,
                  'overtimeRate': d.overtimeRate,
                  'grossPay': d.grossPay,
                  'taxDeductions': d.taxDeductions,
                  'otherDeductions': d.otherDeductions,
                  'deductions': d.deductions,
                  'netPay': d.netPay,
                })
            .toList(),
      });
      _calculatedPayroll = null;
      await loadPayrollRuns();
      return true;
    } catch (e) {
      _payrollError = e.toString();
      return false;
    } finally {
      _saving = false;
      notifyListeners();
    }
  }

  Future<bool> emailAllPayslips() async {
    if (_selectedRun?.id == null) return false;
    _emailingAll = true;
    _payrollError = null;
    notifyListeners();

    try {
      await _payrollService.emailAllPayslips(_selectedRun!.id!);
      return true;
    } catch (e) {
      _payrollError = e.toString();
      return false;
    } finally {
      _emailingAll = false;
      notifyListeners();
    }
  }
}
