import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';
import '../models/project.dart';

class ProjectsService {
  final _api = ApiClient();

  Future<List<Project>> getProjects({String? search, String? stage}) async {
    try {
      final params = <String, dynamic>{};
      if (search != null && search.isNotEmpty) params['search'] = search;
      if (stage != null && stage.isNotEmpty) params['stage'] = stage;
      final response =
          await _api.get('/api/projects', queryParameters: params);
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => Project.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> getProject(int id) async {
    try {
      final response = await _api.get('/api/projects/$id');
      return Map<String, dynamic>.from(response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> updateProjectStage(int id, String stage) async {
    try {
      await _api.patch('/api/projects/$id/stage', data: {'stage': stage});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> uploadProjectDocument(int id, FormData formData) async {
    try {
      await _api.upload('/api/projects/$id/documents/upload', formData);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> getScheduleAssign(int id) async {
    try {
      final response = await _api.get('/api/projects/$id/schedule-assign');
      return Map<String, dynamic>.from(response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  // Retailer Projects
  Future<List<Project>> getRetailerProjects(
      {String? search, String? stage}) async {
    try {
      final params = <String, dynamic>{};
      if (search != null) params['search'] = search;
      if (stage != null) params['stage'] = stage;
      final response =
          await _api.get('/api/retailer-projects', queryParameters: params);
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => Project.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> getRetailerProject(int id) async {
    try {
      final response = await _api.get('/api/retailer-projects/$id');
      return Map<String, dynamic>.from(response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> getPmDashboard() async {
    try {
      final response = await _api.get('/api/pm-dashboard');
      return Map<String, dynamic>.from(response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
