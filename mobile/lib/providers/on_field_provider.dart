import 'package:flutter/foundation.dart';
import '../models/on_field_event.dart';
import '../services/on_field_service.dart';

/// Provider for on-field calendar events.
class OnFieldProvider extends ChangeNotifier {
  final _service = OnFieldService();

  List<OnFieldEvent> _events = [];
  bool _loading = false;
  String? _error;

  List<OnFieldEvent> get events => _events;
  bool get loading => _loading;
  String? get error => _error;

  /// Events grouped by day key (YYYY-MM-DD).
  Map<DateTime, List<OnFieldEvent>> get eventsByDay {
    final map = <DateTime, List<OnFieldEvent>>{};
    for (final e in _events) {
      final key = DateTime(e.start.year, e.start.month, e.start.day);
      map.putIfAbsent(key, () => []).add(e);
    }
    return map;
  }

  /// Get events for a specific day.
  List<OnFieldEvent> eventsForDay(DateTime day) {
    final key = DateTime(day.year, day.month, day.day);
    return eventsByDay[key] ?? [];
  }

  /// Load all on-field events for a date range.
  Future<void> loadEvents({String? from, String? to}) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      _events = await _service.getAllEvents(from: from, to: to);
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  /// Load events for a given month (1st to last day).
  Future<void> loadEventsForMonth(DateTime month) async {
    final from = DateTime(month.year, month.month, 1);
    final to = DateTime(month.year, month.month + 1, 0);
    final fmt = (DateTime d) =>
        '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
    await loadEvents(from: fmt(from), to: fmt(to));
  }
}
