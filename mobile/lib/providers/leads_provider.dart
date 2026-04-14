import 'package:flutter/foundation.dart';
import '../models/lead.dart';
import '../services/leads_service.dart';

class LeadsProvider extends ChangeNotifier {
  final LeadsService _service = LeadsService();

  List<Lead> _leads = [];
  Map<String, dynamic>? _leadDetail;
  bool _listLoading = false;
  bool _detailLoading = false;
  String? _error;
  String _searchQuery = '';
  String? _stageFilter;
  String? _salesSegmentFilter;

  List<Lead> get leads => _leads;
  Map<String, dynamic>? get leadDetail => _leadDetail;
  bool get listLoading => _listLoading;
  bool get detailLoading => _detailLoading;
  String? get error => _error;
  String get searchQuery => _searchQuery;
  String? get stageFilter => _stageFilter;
  String? get salesSegmentFilter => _salesSegmentFilter;

  Map<String, List<Lead>> get leadsByStage {
    final map = <String, List<Lead>>{};
    for (final stage in Lead.stages) {
      map[stage] = _leads.where((l) => l.stage == stage).toList();
    }
    return map;
  }

  Future<void> loadLeads({String? search}) async {
    _listLoading = true;
    _error = null;
    if (search != null) _searchQuery = search;
    notifyListeners();
    try {
      _leads = await _service.getLeads(
        search: _searchQuery.isEmpty ? null : _searchQuery,
        stage: _stageFilter,
        salesSegment: _salesSegmentFilter,
      );
    } catch (e) {
      _error = e.toString();
    } finally {
      _listLoading = false;
      notifyListeners();
    }
  }

  /// Clears stage filter when [stage] is null (e.g. "All" chip).
  Future<void> setStageFilter(String? stage) async {
    _stageFilter = stage;
    await loadLeads();
  }

  /// Clears sales segment filter when [segment] is null.
  Future<void> setSalesSegmentFilter(String? segment) async {
    _salesSegmentFilter =
        (segment == 'b2c' || segment == 'b2b') ? segment : null;
    await loadLeads();
  }

  Future<void> loadLeadDetail(int id) async {
    _detailLoading = true;
    _error = null;
    notifyListeners();
    try {
      _leadDetail = await _service.getLead(id);
    } catch (e) {
      _error = e.toString();
    } finally {
      _detailLoading = false;
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
