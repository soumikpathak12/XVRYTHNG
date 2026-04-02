import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';
import '../models/referral.dart';

class ReferralsService {
  final _api = ApiClient();

  Future<List<Referral>> getReferrals({String? status, String? search}) async {
    try {
      final params = <String, dynamic>{};
      if (status != null && status.isNotEmpty) params['status'] = status;
      if (search != null && search.isNotEmpty) params['search'] = search;
      final response =
          await _api.get('/api/referrals', queryParameters: params);
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => Referral.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<ReferralCounts> getCounts() async {
    try {
      final response = await _api.get('/api/referrals/counts');
      return ReferralCounts.fromJson(response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> markBonusPaid(int id) async {
    try {
      await _api.post('/api/referrals/$id/mark-bonus-paid');
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> getSettings() async {
    try {
      final response = await _api.get('/api/referrals/settings');
      return Map<String, dynamic>.from(response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> saveSettings(Map<String, dynamic> settings) async {
    try {
      await _api.put('/api/referrals/settings', data: settings);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
