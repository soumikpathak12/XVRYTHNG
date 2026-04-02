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

  // ── Project CRUD ─────────────────────────────────────────────────

  Future<Project> createProject(Map<String, dynamic> data) async {
    try {
      final response = await _api.post('/api/projects', data: data);
      return Project.fromJson(response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> updateProject(int id, Map<String, dynamic> data) async {
    try {
      await _api.put('/api/projects/$id', data: data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  // ── Project Notes ────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> getProjectNotes(int projectId) async {
    try {
      final response = await _api.get('/api/projects/$projectId/notes');
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => Map<String, dynamic>.from(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> addProjectNote(int projectId, String note) async {
    try {
      await _api.post('/api/projects/$projectId/notes', data: {'note': note});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  // ── Project Documents ────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> getProjectDocuments(
      int projectId) async {
    try {
      final response =
          await _api.get('/api/projects/$projectId/documents');
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => Map<String, dynamic>.from(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  // ── Retailer Projects CRUD ───────────────────────────────────────

  Future<Project> createRetailerProject(Map<String, dynamic> data) async {
    try {
      final response =
          await _api.post('/api/retailer-projects', data: data);
      return Project.fromJson(response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> updateRetailerProject(
      int id, Map<String, dynamic> data) async {
    try {
      await _api.put('/api/retailer-projects/$id', data: data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> updateRetailerProjectStage(int id, String stage) async {
    try {
      await _api.patch('/api/retailer-projects/$id/stage',
          data: {'stage': stage});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  // ── Retailer Project Notes & Docs ────────────────────────────────

  Future<List<Map<String, dynamic>>> getRetailerProjectNotes(
      int projectId) async {
    try {
      final response =
          await _api.get('/api/retailer-projects/$projectId/notes');
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => Map<String, dynamic>.from(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> addRetailerProjectNote(int projectId, String note) async {
    try {
      await _api.post('/api/retailer-projects/$projectId/notes',
          data: {'note': note});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> uploadRetailerProjectDocument(
      int projectId, FormData formData) async {
    try {
      await _api.upload(
          '/api/retailer-projects/$projectId/documents/upload', formData);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<Map<String, dynamic>>> getRetailerProjectDocuments(
      int projectId) async {
    try {
      final response =
          await _api.get('/api/retailer-projects/$projectId/documents');
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => Map<String, dynamic>.from(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  // ── Schedule & Assignees (Retailer) ──────────────────────────────

  Future<Map<String, dynamic>> getRetailerSchedule(int projectId) async {
    try {
      final response =
          await _api.get('/api/retailer-projects/$projectId/schedule');
      return Map<String, dynamic>.from(
          response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> updateRetailerSchedule(
      int projectId, Map<String, dynamic> data) async {
    try {
      await _api.patch('/api/retailer-projects/$projectId/schedule',
          data: data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<Map<String, dynamic>>> getRetailerAssignees(
      int projectId) async {
    try {
      final response =
          await _api.get('/api/retailer-projects/$projectId/assignees');
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => Map<String, dynamic>.from(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> updateRetailerAssignees(
      int projectId, List<int> employeeIds) async {
    try {
      await _api.patch('/api/retailer-projects/$projectId/assignees',
          data: {'employeeIds': employeeIds});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}

