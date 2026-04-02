import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';
import '../models/company.dart';

class CompaniesService {
  final _api = ApiClient();

  Future<List<Company>> listCompanies() async {
    try {
      final response = await _api.get('/api/admin/companies');
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => Company.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Company> getCompany(int id) async {
    try {
      final response = await _api.get('/api/admin/companies/$id');
      return Company.fromJson(response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> createCompany(Map<String, dynamic> data) async {
    try {
      await _api.post('/api/admin/companies', data: data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> updateCompany(int id, Map<String, dynamic> data) async {
    try {
      await _api.put('/api/admin/companies/$id', data: data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> deleteCompany(int id) async {
    try {
      await _api.delete('/api/admin/companies/$id');
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<Map<String, dynamic>>> getCompanyTypes() async {
    try {
      final response = await _api.get('/api/admin/company-types');
      final data = response.data is List ? response.data : response.data['data'] ?? [];
      return (data as List).map((e) => Map<String, dynamic>.from(e)).toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
