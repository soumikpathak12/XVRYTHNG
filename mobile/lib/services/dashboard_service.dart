import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';
import '../models/dashboard.dart';

class DashboardService {
  final _api = ApiClient();

  Future<Map<String, dynamic>> getSalesDashboard({
    String range = '30d',
    String? from,
    String? to,
  }) async {
    try {
      final params = <String, dynamic>{'range': range};
      if (from != null) params['from'] = from;
      if (to != null) params['to'] = to;
      final response =
          await _api.get('/api/leads/dashboard', queryParameters: params);
      final data = response.data['data'] ?? response.data;
      return {
        'metrics': DashboardMetrics.fromJson(data['metrics'] ?? {}),
        'pipelineByStage': (data['pipeline_by_stage'] as List?)
                ?.map((e) => PipelineStage.fromJson(e))
                .toList() ??
            [],
        'leadsBySource': (data['leads_by_source'] as List?)
                ?.map((e) => LeadBySource.fromJson(e))
                .toList() ??
            [],
      };
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<ActivityItem>> getSalesActivity(
      {int limit = 50, int offset = 0}) async {
    try {
      final response = await _api.get('/api/sales/activity',
          queryParameters: {'limit': limit, 'offset': offset});
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => ActivityItem.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
