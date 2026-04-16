import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';
import '../models/payroll_run.dart';

class PayrollService {
  final _api = ApiClient();

  Future<PayrollRun?> _findRunByPeriod(String period) async {
    final runs = await getPayrollRuns();
    PayrollRunSummary? selected;
    for (final run in runs) {
      final start = run.periodStart;
      if (start.length >= 7 && start.substring(0, 7) == period) {
        selected = run;
        break;
      }
    }
    if (selected == null && runs.isNotEmpty) {
      selected = runs.first;
    }
    if (selected == null) return null;
    return getPayrollRunDetails(selected.id);
  }

  /// GET /api/employees/payroll/runs
  Future<List<PayrollRunSummary>> getPayrollRuns() async {
    try {
      final response = await _api.get('/api/employees/payroll/runs');
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => PayrollRunSummary.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// GET /api/employees/payroll/runs/:id
  Future<PayrollRun> getPayrollRunDetails(int runId) async {
    try {
      final response = await _api.get('/api/employees/payroll/runs/$runId');
      final data = response.data['data'] ?? response.data;
      return PayrollRun.fromJson(Map<String, dynamic>.from(data));
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// POST /api/employees/payroll/calculate
  Future<PayrollRun> calculatePayroll({
    required String periodStart,
    required String periodEnd,
    required String periodType,
  }) async {
    try {
      final response = await _api.post(
        '/api/employees/payroll/calculate',
        data: {
          'periodStart': periodStart,
          'periodEnd': periodEnd,
          'periodType': periodType,
        },
      );
      final data = response.data['data'] ?? response.data;
      return PayrollRun.fromJson(Map<String, dynamic>.from(data));
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// POST /api/employees/payroll/save
  Future<void> savePayrollRun(Map<String, dynamic> payrollData) async {
    try {
      await _api.post(
        '/api/employees/payroll/save',
        data: {'payrollData': payrollData},
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// POST /api/employees/payroll/runs/:id/payslips/:empId/generate
  Future<void> generatePayslip(int runId, int employeeId) async {
    try {
      await _api.post(
        '/api/employees/payroll/runs/$runId/payslips/$employeeId/generate',
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// POST /api/employees/payroll/runs/:id/payslips/generate-all
  Future<void> generateAllPayslips(int runId) async {
    try {
      await _api.post(
        '/api/employees/payroll/runs/$runId/payslips/generate-all',
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// POST /api/employees/payroll/runs/:id/payslips/email-all
  Future<Map<String, dynamic>> emailAllPayslips(int runId) async {
    try {
      final response = await _api.post(
        '/api/employees/payroll/runs/$runId/payslips/email-all',
      );
      return Map<String, dynamic>.from(response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Derive payroll summary from existing runs/details endpoints.
  Future<Map<String, dynamic>> getPayrollSummary({String? period}) async {
    try {
      if (period == null || period.trim().isEmpty) {
        return {
          'totalGross': 0.0,
          'totalNet': 0.0,
          'totalTax': 0.0,
          'employeeCount': 0,
        };
      }

      final run = await _findRunByPeriod(period);
      if (run == null) {
        return {
          'totalGross': 0.0,
          'totalNet': 0.0,
          'totalTax': 0.0,
          'employeeCount': 0,
        };
      }

      var totalGross = 0.0;
      var totalNet = 0.0;
      var totalTax = 0.0;

      for (final d in run.details) {
        totalGross += d.grossPay;
        totalNet += d.netPay;
        totalTax += d.taxDeductions;
      }

      return {
        'totalGross': totalGross,
        'totalNet': totalNet,
        'totalTax': totalTax,
        'employeeCount': run.details.length,
      };
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Derive payroll records from existing runs/details endpoints.
  Future<List<Map<String, dynamic>>> getPayrollRecords({String? period}) async {
    try {
      if (period == null || period.trim().isEmpty) return [];

      final run = await _findRunByPeriod(period);
      if (run == null) return [];

      return run.details
          .map(
            (d) => {
              'employeeId': d.employeeId,
              'employeeName': d.employeeName,
              'grossPay': d.grossPay,
              'tax': d.taxDeductions,
              'netPay': d.netPay,
            },
          )
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
