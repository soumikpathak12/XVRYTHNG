import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';

class PayrollService {
  final _api = ApiClient();

  Future<Map<String, dynamic>> getPayrollSummary(
      {String? period, int? companyId}) async {
    try {
      final params = <String, dynamic>{};
      if (period != null) params['period'] = period;
      if (companyId != null) params['companyId'] = companyId;
      final response =
          await _api.get('/api/payroll', queryParameters: params);
      return Map<String, dynamic>.from(response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<Map<String, dynamic>>> getPayrollRecords(
      {String? period, int? companyId}) async {
    try {
      final params = <String, dynamic>{};
      if (period != null) params['period'] = period;
      if (companyId != null) params['companyId'] = companyId;
      final response =
          await _api.get('/api/payroll/records', queryParameters: params);
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => Map<String, dynamic>.from(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> exportPayroll(String period) async {
    try {
      await _api.get('/api/payroll/export',
          queryParameters: {'period': period});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
