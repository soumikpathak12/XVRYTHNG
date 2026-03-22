import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';
import '../models/installation_job.dart';

class InstallationService {
  final _api = ApiClient();

  Future<List<InstallationJob>> listJobs({int limit = 200}) async {
    try {
      final response = await _api.get('/api/installation-jobs',
          queryParameters: {'limit': limit});
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => InstallationJob.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> getJob(int id) async {
    try {
      final response = await _api.get('/api/installation-jobs/$id');
      return Map<String, dynamic>.from(response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> createJob(Map<String, dynamic> data) async {
    try {
      await _api.post('/api/installation-jobs', data: data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> updateJobStatus(int id, String status) async {
    try {
      await _api.patch('/api/installation-jobs/$id/status',
          data: {'status': status});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> updateChecklist(int jobId, int itemId, bool checked,
      {String? note}) async {
    try {
      await _api.patch('/api/installation-jobs/$jobId/checklist/$itemId',
          data: {'checked': checked, if (note != null) 'note': note});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> uploadPhoto(int jobId, FormData formData) async {
    try {
      await _api.upload('/api/installation-jobs/$jobId/photos', formData);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> submitSignoff(int jobId, Map<String, dynamic> data) async {
    try {
      await _api.post('/api/installation-jobs/$jobId/signoff', data: data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
