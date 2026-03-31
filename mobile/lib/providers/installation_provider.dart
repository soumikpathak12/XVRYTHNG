import 'package:flutter/foundation.dart';
import '../models/installation_job.dart';
import '../services/installation_service.dart';

class InstallationProvider extends ChangeNotifier {
  final InstallationService _service = InstallationService();

  List<InstallationJob> _jobs = [];
  Map<String, dynamic>? _jobDetail;
  bool _loading = false;
  String? _error;

  List<InstallationJob> get jobs => _jobs;
  Map<String, dynamic>? get jobDetail => _jobDetail;
  bool get loading => _loading;
  String? get error => _error;

  int get scheduledCount =>
      _jobs.where((j) => j.status == 'scheduled').length;
  int get inProgressCount =>
      _jobs.where((j) => j.status == 'in_progress').length;
  int get completedCount =>
      _jobs.where((j) => j.status == 'completed').length;

  Future<void> loadJobs({int? companyId}) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _jobs = await _service.listJobs(companyId: companyId);
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> loadJobDetail(int id, {int? companyId}) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _jobDetail = await _service.getJob(id, companyId: companyId);
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> updateJobStatus(int id, String status, {int? companyId}) async {
    try {
      await _service.updateJobStatus(id, status, companyId: companyId);
      await loadJobs(companyId: companyId);
    } catch (e) {
      rethrow;
    }
  }
}
