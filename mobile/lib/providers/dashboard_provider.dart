import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';
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
  int _dashboardLoadSeq = 0;
  /// Matches web + API: `week` | `month` | `quarter` | `custom`
  String _range = 'month';
  String? _customFrom;
  String? _customTo;

  static final _chipDateFmt = DateFormat('d MMM');

  DashboardMetrics? get metrics => _metrics;
  List<PipelineStage> get pipelineStages => _pipelineStages;
  List<LeadBySource> get leadsBySource => _leadsBySource;
  List<ActivityItem> get activities => _activities;
  bool get loading => _loading;
  String? get error => _error;
  String get range => _range;
  String? get customFrom => _customFrom;
  String? get customTo => _customTo;

  /// Short label for the app bar chip (aligned with web preset names).
  String get rangeLabel {
    switch (_range) {
      case 'week':
        return 'This Week';
      case 'quarter':
        return 'This Quarter';
      case 'custom':
        if (_customFrom != null && _customTo != null) {
          final a = DateTime.tryParse(_customFrom!);
          final b = DateTime.tryParse(_customTo!);
          if (a != null && b != null) {
            return '${_chipDateFmt.format(a)} – ${_chipDateFmt.format(b)}';
          }
        }
        return 'Custom';
      case 'month':
      default:
        return 'This Month';
    }
  }

  static String _isoDate(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  void _primeCustomDefaults() {
    final now = DateTime.now();
    final from = now.subtract(const Duration(days: 28));
    _customFrom = _isoDate(from);
    _customTo = _isoDate(now);
  }

  Future<void> loadDashboard({
    String? range,
    String? customFrom,
    String? customTo,
  }) async {
    _loading = true;
    _error = null;
    if (range != null) {
      _range = range;
      if (range != 'custom') {
        _customFrom = null;
        _customTo = null;
      }
    }
    if (customFrom != null) _customFrom = customFrom;
    if (customTo != null) _customTo = customTo;

    if (_range == 'custom') {
      if (_customFrom == null || _customTo == null) {
        _primeCustomDefaults();
      }
    }

    // Prevent race conditions where an older request finishes after a newer
    // one and overwrites the latest metrics (observed on iOS).
    final int loadSeq = ++_dashboardLoadSeq;

    notifyListeners();
    try {
      final result = await _service.getSalesDashboard(
        range: _range,
        from: _range == 'custom' ? _customFrom : null,
        to: _range == 'custom' ? _customTo : null,
      );
      if (loadSeq != _dashboardLoadSeq) return;
      _metrics = result['metrics'] as DashboardMetrics;
      _pipelineStages = result['pipelineByStage'] as List<PipelineStage>;
      _leadsBySource = result['leadsBySource'] as List<LeadBySource>;
    } catch (e) {
      if (loadSeq != _dashboardLoadSeq) return;
      _error = e.toString();
    } finally {
      if (loadSeq == _dashboardLoadSeq) {
        _loading = false;
        notifyListeners();
      }
    }
  }

  Future<void> loadActivities() async {
    try {
      _activities = await _service.getSalesActivity();
      notifyListeners();
    } catch (_) {}
  }
}
