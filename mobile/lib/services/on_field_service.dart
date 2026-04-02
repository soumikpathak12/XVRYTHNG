import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';
import '../models/on_field_event.dart';

class OnFieldService {
  final _api = ApiClient();

  /// Fetch on-field calendar events (site inspections + installations).
  /// Backend: GET /api/on-field/calendar
  Future<List<OnFieldEvent>> getCalendarEvents({
    String? from,
    String? to,
    String? type,
  }) async {
    try {
      final params = <String, dynamic>{};
      if (from != null) params['from'] = from;
      if (to != null) params['to'] = to;
      if (type != null) params['type'] = type;
      final response =
          await _api.get('/api/on-field/calendar', queryParameters: params);
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => OnFieldEvent.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Fetch lead calendar events for leads with upcoming inspections.
  /// Backend: GET /api/calendar/leads
  Future<List<OnFieldEvent>> getCalendarLeads({
    String? from,
    String? to,
  }) async {
    try {
      final params = <String, dynamic>{};
      if (from != null) params['from'] = from;
      if (to != null) params['to'] = to;
      final response =
          await _api.get('/api/calendar/leads', queryParameters: params);
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data
            .map((e) => OnFieldEvent.fromJson({
                  ...Map<String, dynamic>.from(e),
                  'type': 'site_inspection',
                }))
            .toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Fetch all on-field events (both calendar types merged).
  Future<List<OnFieldEvent>> getAllEvents({String? from, String? to}) async {
    final results = await Future.wait([
      getCalendarEvents(from: from, to: to),
      getCalendarLeads(from: from, to: to),
    ]);
    final merged = [...results[0], ...results[1]];
    merged.sort((a, b) => a.start.compareTo(b.start));
    return merged;
  }
}
