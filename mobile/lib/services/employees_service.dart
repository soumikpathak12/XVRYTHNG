import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';
import '../models/employee.dart';

class EmployeesService {
  final _api = ApiClient();

  Future<List<Employee>> listEmployees({
    String? search,
    int? companyId,
    int? jobRoleId,
    String? status,
  }) async {
    try {
      final params = <String, dynamic>{};
      if (search != null && search.isNotEmpty) params['q'] = search;
      if (companyId != null) params['companyId'] = companyId;
      if (jobRoleId != null) params['job_role_id'] = jobRoleId;
      if (status != null) params['status'] = status;
      final response =
          await _api.get('/api/employees', queryParameters: params);
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => Employee.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> getEmployee(int id, {int? companyId}) async {
    try {
      final params = <String, dynamic>{};
      if (companyId != null) params['companyId'] = companyId;
      final response =
          await _api.get('/api/employees/$id', queryParameters: params);
      return Map<String, dynamic>.from(response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<int> createEmployee(Map<String, dynamic> data,
      {int? companyId}) async {
    try {
      if (companyId != null) data['companyId'] = companyId;
      final response = await _api.post('/api/employees', data: data);
      return response.data['id'] ?? 0;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> updateEmployee(int id, Map<String, dynamic> data,
      {int? companyId}) async {
    try {
      if (companyId != null) data['companyId'] = companyId;
      await _api.put('/api/employees/$id', data: data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> deactivateEmployee(int id) async {
    try {
      await _api.patch('/api/employees/$id/deactivate');
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> createEmployeeLogin(
      int id, String password, int? companyId) async {
    try {
      await _api.post('/api/employees/$id/create-login', data: {
        'password': password,
        if (companyId != null) 'companyId': companyId,
      });
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> uploadEmployeeDocument(int id, FormData formData) async {
    try {
      await _api.upload('/api/employees/$id/documents', formData);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<JobRole>> getJobRoleOptions({int? companyId}) async {
    try {
      final params = <String, dynamic>{};
      if (companyId != null) params['companyId'] = companyId;
      final response = await _api.get('/api/employees/options/job-roles',
          queryParameters: params);
      final data = response.data is List ? response.data : response.data['data'] ?? [];
      return (data as List).map((e) => JobRole.fromJson(e)).toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<Map<String, dynamic>>> getEmploymentTypeOptions() async {
    try {
      final response =
          await _api.get('/api/employees/options/employment-types');
      final data = response.data is List ? response.data : response.data['data'] ?? [];
      return (data as List).map((e) => Map<String, dynamic>.from(e)).toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<Map<String, dynamic>>> getDepartmentOptions(
      {int? companyId}) async {
    try {
      final params = <String, dynamic>{};
      if (companyId != null) params['companyId'] = companyId;
      final response = await _api.get('/api/employees/options/departments',
          queryParameters: params);
      final data = response.data is List ? response.data : response.data['data'] ?? [];
      return (data as List).map((e) => Map<String, dynamic>.from(e)).toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
