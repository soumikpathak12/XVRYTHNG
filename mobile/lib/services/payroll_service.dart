import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';
import '../models/payroll_run.dart';

class PayrollService {
  final _api = ApiClient();

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
      final response = await _api.post('/api/employees/payroll/calculate',
          data: {
            'periodStart': periodStart,
            'periodEnd': periodEnd,
            'periodType': periodType,
          });
      final data = response.data['data'] ?? response.data;
      return PayrollRun.fromJson(Map<String, dynamic>.from(data));
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// POST /api/employees/payroll/save
  Future<void> savePayrollRun(Map<String, dynamic> payrollData) async {
    try {
      await _api.post('/api/employees/payroll/save',
          data: {'payrollData': payrollData});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// POST /api/employees/payroll/runs/:id/payslips/:empId/generate
  Future<void> generatePayslip(int runId, int employeeId) async {
    try {
      await _api.post(
          '/api/employees/payroll/runs/$runId/payslips/$employeeId/generate');
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// POST /api/employees/payroll/runs/:id/payslips/generate-all
  Future<void> generateAllPayslips(int runId) async {
    try {
      await _api
          .post('/api/employees/payroll/runs/$runId/payslips/generate-all');
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// POST /api/employees/payroll/runs/:id/payslips/email-all
  Future<Map<String, dynamic>> emailAllPayslips(int runId) async {
    try {
      final response = await _api
          .post('/api/employees/payroll/runs/$runId/payslips/email-all');
      return Map<String, dynamic>.from(
          response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// GET /api/employees/payroll/summary?period=YYYY-MM
  Future<Map<String, dynamic>> getPayrollSummary({String? period}) async {
    try {
      final params = <String, dynamic>{};
      if (period != null) params['period'] = period;
      final response =
          await _api.get('/api/employees/payroll/summary', queryParameters: params);
      return Map<String, dynamic>.from(response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// GET /api/employees/payroll/records?period=YYYY-MM
  Future<List<Map<String, dynamic>>> getPayrollRecords({String? period}) async {
    try {
      final params = <String, dynamic>{};
      if (period != null) params['period'] = period;
      final response =
          await _api.get('/api/employees/payroll/records', queryParameters: params);
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => Map<String, dynamic>.from(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
