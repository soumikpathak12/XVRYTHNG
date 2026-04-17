import 'package:flutter/foundation.dart';
import '../models/on_field_event.dart';
import '../services/on_field_service.dart';

/// Provider for on-field calendar events.
class OnFieldProvider extends ChangeNotifier {
  final _service = OnFieldService();

  List<OnFieldEvent> _eventsList = [];
  Map<String, OnFieldEvent> _eventsCache = {};
  
  Map<String, List<OnFieldEvent>> _eventsByDayCache = {};

  bool _loading = false;
  bool _hasEverLoaded = false;
  String? _error;

  List<OnFieldEvent> get events => _eventsList;
  bool get loading => _loading;
  bool get hasEverLoaded => _hasEverLoaded;
  String? get error => _error;

  String _dateKey(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  String _eventDedupeKey(OnFieldEvent e) {
    final startMinute = DateTime(
      e.start.year,
      e.start.month,
      e.start.day,
      e.start.hour,
      e.start.minute,
    ).toIso8601String();

    if (e.isSiteInspection) {
      final leadKey = e.leadId ?? e.id;
      return 'site_inspection|$leadKey|$startMinute';
    }

    if (e.isInstallation) {
      final jobKey = e.jobId ?? e.projectId ?? e.id;
      return 'installation|$jobKey|$startMinute';
    }

    return '${e.type}|${e.id}|$startMinute';
  }

  int _eventQuality(OnFieldEvent e) {
    var score = 0;
    if (e.address != null && e.address!.trim().isNotEmpty) score += 2;
    if (e.leadId != null || e.jobId != null || e.projectId != null) score += 2;
    if (e.title.trim().isNotEmpty) score += 1;
    if (e.title.toLowerCase().startsWith('inspection:')) score += 1;
    if (e.status != null && e.status!.trim().isNotEmpty) score += 2;
    if (e.notes != null && e.notes!.trim().isNotEmpty) score += 1;
    return score;
  }

  OnFieldEvent _mergeEventData(OnFieldEvent existing, OnFieldEvent incoming) {
    final preferred =
        _eventQuality(incoming) >= _eventQuality(existing) ? incoming : existing;
    final fallback = identical(preferred, incoming) ? existing : incoming;

    String? chooseText(String? primary, String? secondary) {
      final p = primary?.trim();
      if (p != null && p.isNotEmpty) return p;
      final s = secondary?.trim();
      if (s != null && s.isNotEmpty) return s;
      return null;
    }

    return OnFieldEvent(
      id: preferred.id != 0 ? preferred.id : fallback.id,
      title: chooseText(preferred.title, fallback.title) ?? '',
      type: preferred.type,
      start: preferred.start,
      end: preferred.end ?? fallback.end,
      address: chooseText(preferred.address, fallback.address),
      leadId: preferred.leadId ?? fallback.leadId,
      jobId: preferred.jobId ?? fallback.jobId,
      projectId: preferred.projectId ?? fallback.projectId,
      assigneeName: chooseText(preferred.assigneeName, fallback.assigneeName),
      status: chooseText(preferred.status, fallback.status),
      notes: chooseText(preferred.notes, fallback.notes),
    );
  }

  /// Get events for a specific day using the robust string-key cached map.
  List<OnFieldEvent> eventsForDay(DateTime day) {
    return _eventsByDayCache[_dateKey(day)] ?? [];
  }

  /// Load on-field events for a date range and merge with existing cache.
  Future<void> loadEvents({String? from, String? to, int? companyId}) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final newEvents = await _service.getAllEvents(from: from, to: to, companyId: companyId);
      
      // Merge by stable event fingerprint (entity + start minute).
      // This removes duplicate rows coming from both calendar endpoints.
      for (final e in newEvents) {
        final key = _eventDedupeKey(e);
        final existing = _eventsCache[key];
        if (existing == null) {
          _eventsCache[key] = e;
        } else {
          _eventsCache[key] = _mergeEventData(existing, e);
        }
      }
      
      _eventsList = _eventsCache.values.toList()
        ..sort((a, b) => a.start.compareTo(b.start));
      
      // Re-populate day map
      _eventsByDayCache = <String, List<OnFieldEvent>>{};
      for (final e in _eventsList) {
        _eventsByDayCache.putIfAbsent(_dateKey(e.start), () => []).add(e);
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      _hasEverLoaded = true;
      notifyListeners();
    }
  }

  /// Fetch events for the visible bounds of the standard TableCalendar grid (approx 5-6 weeks) 
  /// instead of fetching multiple massive 3-month queries. This makes the API instantaneous.
  Future<void> loadEventsForMonth(DateTime month, {int? companyId}) async {
    final start = DateTime(month.year, month.month, 1).subtract(const Duration(days: 10));
    final end = DateTime(month.year, month.month + 1, 0).add(const Duration(days: 10));
    
    await loadEvents(from: _dateKey(start), to: _dateKey(end), companyId: companyId);
  }
}
