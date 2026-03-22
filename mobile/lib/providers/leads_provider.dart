import 'package:flutter/foundation.dart';
import '../models/lead.dart';
import '../services/leads_service.dart';

class LeadsProvider extends ChangeNotifier {
  final LeadsService _service = LeadsService();

  List<Lead> _leads = [];
  Map<String, dynamic>? _leadDetail;
  bool _loading = false;
  String? _error;
  String _searchQuery = '';
  String? _stageFilter;

  List<Lead> get leads => _leads;
  Map<String, dynamic>? get leadDetail => _leadDetail;
  bool get loading => _loading;
  String? get error => _error;
  String get searchQuery => _searchQuery;
  String? get stageFilter => _stageFilter;

  Map<String, List<Lead>> get leadsByStage {
    final map = <String, List<Lead>>{};
    for (final stage in Lead.stages) {
      map[stage] = _leads.where((l) => l.stage == stage).toList();
    }
    return map;
  }

  Future<void> loadLeads({String? search}) async {
    _loading = true;
    _error = null;
    if (search != null) _searchQuery = search;
    notifyListeners();
    try {
      _leads = await _service.getLeads(
        search: _searchQuery.isEmpty ? null : _searchQuery,
        stage: _stageFilter,
      );
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  /// Clears stage filter when [stage] is null (e.g. "All" chip).
  Future<void> setStageFilter(String? stage) async {
    _stageFilter = stage;
    await loadLeads();
  }

  Future<void> loadLeadDetail(int id) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _leadDetail = await _service.getLead(id);
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> createLead(Map<String, dynamic> data) async {
    try {
      await _service.createLead(data);
      await loadLeads();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> updateLeadStage(int id, String stage) async {
    try {
      await _service.updateLeadStage(id, stage);
      final idx = _leads.indexWhere((l) => l.id == id);
      if (idx >= 0) {
        _leads = List.from(_leads);
        _leads[idx] = Lead.fromJson({..._leads[idx].raw ?? {}, 'stage': stage});
        notifyListeners();
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<void> updateLead(int id, Map<String, dynamic> data) async {
    try {
      await _service.updateLead(id, data);
    } catch (e) {
      rethrow;
    }
  }
}
