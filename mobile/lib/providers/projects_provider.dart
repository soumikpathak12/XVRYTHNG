import 'package:flutter/foundation.dart';
import '../models/project.dart';
import '../services/projects_service.dart';

class ProjectsProvider extends ChangeNotifier {
  final ProjectsService _service = ProjectsService();

  List<Project> _projects = [];
  List<Project> _retailerProjects = [];
  Map<String, dynamic>? _projectDetail;
  bool _listLoading = false;
  bool _retailerListLoading = false;
  bool _detailLoading = false;
  String? _error;

  List<Project> get projects => _projects;
  List<Project> get retailerProjects => _retailerProjects;
  Map<String, dynamic>? get projectDetail => _projectDetail;
  bool get listLoading => _listLoading;
  bool get retailerListLoading => _retailerListLoading;
  bool get detailLoading => _detailLoading;
  String? get error => _error;

  Map<String, List<Project>> get projectsByStage {
    final map = <String, List<Project>>{};
    for (final stage in Project.stages) {
      map[stage] = _projects.where((p) => p.stage == stage).toList();
    }
    return map;
  }

  Future<void> loadProjects({String? search, String? stage}) async {
    _listLoading = true;
    _error = null;
    notifyListeners();
    try {
      _projects = await _service.getProjects(search: search, stage: stage);
    } catch (e) {
      _error = e.toString();
    } finally {
      _listLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadRetailerProjects(
      {String? search, String? stage}) async {
    _retailerListLoading = true;
    notifyListeners();
    try {
      _retailerProjects =
          await _service.getRetailerProjects(search: search, stage: stage);
    } catch (e) {
      _error = e.toString();
    } finally {
      _retailerListLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadProjectDetail(int id) async {
    _detailLoading = true;
    notifyListeners();
    try {
      _projectDetail = await _service.getProject(id);
    } catch (e) {
      _error = e.toString();
    } finally {
      _detailLoading = false;
      notifyListeners();
    }
  }

  Future<void> updateProjectStage(int id, String stage) async {
    try {
      await _service.updateProjectStage(id, stage);
      await Future.wait([
        loadProjects(),
        // Keep detail view in sync when stage is changed there.
        loadProjectDetail(id),
      ]);
    } catch (e) {
      rethrow;
    }
  }
}
