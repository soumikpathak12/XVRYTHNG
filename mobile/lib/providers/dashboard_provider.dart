import 'package:flutter/foundation.dart';
import '../models/dashboard.dart';
import '../services/dashboard_service.dart';

class DashboardProvider extends ChangeNotifier {
  final DashboardService _service = DashboardService();

  DashboardMetrics? _metrics;
  List<PipelineStage> _pipelineStages = [];
  List<LeadBySource> _leadsBySource = [];
  List<ActivityItem> _activities = [];
  bool _loading = false;
  String? _error;
  String _range = '30d';

  DashboardMetrics? get metrics => _metrics;
  List<PipelineStage> get pipelineStages => _pipelineStages;
  List<LeadBySource> get leadsBySource => _leadsBySource;
  List<ActivityItem> get activities => _activities;
  bool get loading => _loading;
  String? get error => _error;
  String get range => _range;

  Future<void> loadDashboard({String? range}) async {
    _loading = true;
    _error = null;
    if (range != null) _range = range;
    notifyListeners();
    try {
      final result = await _service.getSalesDashboard(range: _range);
      _metrics = result['metrics'] as DashboardMetrics;
      _pipelineStages = result['pipelineByStage'] as List<PipelineStage>;
      _leadsBySource = result['leadsBySource'] as List<LeadBySource>;
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> loadActivities() async {
    try {
      _activities = await _service.getSalesActivity();
      notifyListeners();
    } catch (_) {}
  }
}
