import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';
import '../models/leave.dart';

class LeaveService {
  final _api = ApiClient();

  Future<List<LeaveRequest>> getMyLeaves() async {
    try {
      final response = await _api.get('/api/employees/leave');
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => LeaveRequest.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> applyLeave(Map<String, dynamic> data) async {
    try {
      await _api.post('/api/employees/leave', data: data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<LeaveBalance>> getBalances() async {
    try {
      final response = await _api.get('/api/employees/leave/balances');
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => LeaveBalance.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> cancelLeave(int id) async {
    try {
      await _api.delete('/api/employees/leave/$id');
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
