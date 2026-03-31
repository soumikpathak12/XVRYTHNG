import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';
import '../models/workflow_settings.dart';
import '../models/module_settings.dart';

class SettingsService {
  final _api = ApiClient();

  // ── Workflow Settings ──────────────────────────────────────────

  /// GET /api/company/workflow-settings
  Future<WorkflowSettings> getWorkflowSettings() async {
    try {
      final response = await _api.get('/api/company/workflow-settings');
      final data = response.data['data'] ?? response.data;
      return WorkflowSettings.fromJson(Map<String, dynamic>.from(data));
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// PATCH /api/company/workflow-settings
  /// [pipeline] is 'sales' or 'project_management'.
  Future<WorkflowSettings> patchWorkflowSettings({
    required String pipeline,
    required List<Map<String, dynamic>> stages,
  }) async {
    try {
      final response = await _api.patch(
        '/api/company/workflow-settings',
        data: {'pipeline': pipeline, 'stages': stages},
      );
      final data = response.data['data'] ?? response.data;
      return WorkflowSettings.fromJson(Map<String, dynamic>.from(data));
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// GET /api/company/workflow (public — any authenticated user)
  Future<WorkflowSettings> getWorkflowPublic() async {
    try {
      final response = await _api.get('/api/company/workflow');
      final data = response.data['data'] ?? response.data;
      return WorkflowSettings.fromJson(Map<String, dynamic>.from(data));
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  // ── Module Settings ────────────────────────────────────────────

  /// GET /api/company/module-settings
  Future<ModuleSettings> getModuleSettings() async {
    try {
      final response = await _api.get('/api/company/module-settings');
      final data = response.data['data'] ?? response.data;
      return ModuleSettings.fromJson(Map<String, dynamic>.from(data));
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// PATCH /api/company/module-settings
  Future<ModuleSettings> patchModuleSettings(
      Map<String, bool> toggles) async {
    try {
      final response = await _api.patch(
        '/api/company/module-settings',
        data: toggles,
      );
      final data = response.data['data'] ?? response.data;
      return ModuleSettings.fromJson(Map<String, dynamic>.from(data));
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
