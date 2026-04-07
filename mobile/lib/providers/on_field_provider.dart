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

  /// Get events for a specific day using the robust string-key cached map.
  List<OnFieldEvent> eventsForDay(DateTime day) {
    return _eventsByDayCache[_dateKey(day)] ?? [];
  }

  /// Load on-field events for a date range and merge with existing cache.
  Future<void> loadEvents({String? from, String? to}) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final newEvents = await _service.getAllEvents(from: from, to: to);
      
      // Merge by unique cache key (Type + ID) to prevent duplicates
      for (final e in newEvents) {
        final key = '${e.type}_${e.id}';
        _eventsCache[key] = e;
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
  Future<void> loadEventsForMonth(DateTime month) async {
    final start = DateTime(month.year, month.month, 1).subtract(const Duration(days: 10));
    final end = DateTime(month.year, month.month + 1, 0).add(const Duration(days: 10));
    
    await loadEvents(from: _dateKey(start), to: _dateKey(end));
  }
}
