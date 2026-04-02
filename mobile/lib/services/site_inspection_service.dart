import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';

class SiteInspectionService {
  final _api = ApiClient();

  /// GET /api/leads/:leadId/site-inspection
  Future<Map<String, dynamic>?> getInspection(int leadId) async {
    try {
      final response = await _api.get('/api/leads/$leadId/site-inspection');
      final data = response.data['data'] ?? response.data;
      if (data == null) return null;
      return Map<String, dynamic>.from(data);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      throw ApiException.fromDioError(e);
    }
  }

  /// PUT /api/leads/:leadId/site-inspection
  Future<void> saveDraft(int leadId, Map<String, dynamic> data) async {
    try {
      await _api.put('/api/leads/$leadId/site-inspection', data: data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// POST /api/leads/:leadId/site-inspection/submit
  Future<void> submit(int leadId, Map<String, dynamic> data) async {
    try {
      await _api.post('/api/leads/$leadId/site-inspection/submit', data: data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// POST /api/leads/:leadId/site-inspection/files/upload
  Future<Map<String, dynamic>> uploadFile(int leadId, FormData formData) async {
    try {
      final response = await _api.upload(
          '/api/leads/$leadId/site-inspection/files/upload', formData);
      return Map<String, dynamic>.from(response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
