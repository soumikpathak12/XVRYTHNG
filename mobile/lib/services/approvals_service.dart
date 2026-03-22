import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';
import '../models/approval.dart';

class ApprovalsService {
  final _api = ApiClient();

  Future<List<Approval>> listApprovals({String? type, String? status}) async {
    try {
      final params = <String, dynamic>{};
      if (type != null && type.isNotEmpty) params['type'] = type;
      if (status != null && status.isNotEmpty) params['status'] = status;
      final response =
          await _api.get('/api/approvals', queryParameters: params);
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => Approval.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<ApprovalCounts> getPendingCount() async {
    try {
      final response = await _api.get('/api/approvals/count');
      return ApprovalCounts.fromJson(response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> decide(
      String itemType, int itemId, String action, String comment) async {
    try {
      await _api.patch('/api/approvals/$itemType/$itemId/decision', data: {
        'action': action,
        'comment': comment,
      });
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
