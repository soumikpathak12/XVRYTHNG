import 'package:flutter/foundation.dart';
import '../models/workflow_settings.dart';
import '../models/module_settings.dart';
import '../services/settings_service.dart';

/// Provider for company settings: workflow pipelines + module toggles.
class SettingsProvider extends ChangeNotifier {
  final _service = SettingsService();

  WorkflowSettings? _workflow;
  ModuleSettings? _modules;
  bool _loading = false;
  String? _error;
  String? _busyModuleId;

  WorkflowSettings? get workflow => _workflow;
  ModuleSettings? get modules => _modules;
  bool get loading => _loading;
  String? get error => _error;
  String? get busyModuleId => _busyModuleId;

  // ── Workflow ──────────────────────────────────────────────

  Future<void> loadWorkflow() async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      _workflow = await _service.getWorkflowSettings();
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> updatePipelineStages(
    String pipeline,
    List<PipelineStage> stages,
  ) async {
    _error = null;
    notifyListeners();

    try {
      _workflow = await _service.patchWorkflowSettings(
        pipeline: pipeline,
        stages: stages.map((s) => s.toJson()).toList(),
      );
    } catch (e) {
      _error = e.toString();
    }
    notifyListeners();
  }

  /// Public workflow (for non-admin usage — forms etc.)
  Future<WorkflowSettings> getPublicWorkflow() async {
    return _service.getWorkflowPublic();
  }

  // ── Modules ───────────────────────────────────────────────

  Future<void> loadModules() async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      _modules = await _service.getModuleSettings();
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> toggleModule(String moduleId, bool enabled) async {
    _error = null;
    _busyModuleId = moduleId;

    // Optimistic update
    final prev = _modules;
    if (prev != null) {
      _modules = ModuleSettings(
        toggles: {...prev.toggles, moduleId: enabled},
        definitions: prev.definitions,
        coreDescription: prev.coreDescription,
      );
      notifyListeners();
    }

    try {
      _modules = await _service.patchModuleSettings({moduleId: enabled});
    } catch (e) {
      _modules = prev; // Rollback
      _error = e.toString();
    } finally {
      _busyModuleId = null;
      notifyListeners();
    }
  }
}
