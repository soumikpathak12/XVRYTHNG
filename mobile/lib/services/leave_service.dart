import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';
import '../models/leave.dart';

class LeaveService {
  final _api = ApiClient();

  Future<List<LeaveRequest>> getMyLeaves() async {
    try {
      final response = await _api.get('/api/employees/leave/my-requests');
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
      final leaveType = data['leaveType'] ?? data['leave_type'];
      final startDate = data['startDate'] ?? data['start_date'];
      final endDate = data['endDate'] ?? data['end_date'];
      final reason = data['reason'];
      await _api.post('/api/employees/leave/request', data: {
        'leaveType': leaveType,
        'startDate': startDate,
        'endDate': endDate,
        'reason': reason,
      });
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
      await _api.delete('/api/employees/leave/$id/cancel');
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// GET /api/employees/leave/pending — admin: list pending leave requests
  Future<List<LeaveRequest>> getPendingLeaves() async {
    try {
      final response = await _api.get('/api/employees/leave/pending');
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => LeaveRequest.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// GET /api/employees/leave/my-requests
  Future<List<LeaveRequest>> getMyRequests() async {
    try {
      final response = await _api.get('/api/employees/leave/my-requests');
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => LeaveRequest.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// POST /api/employees/leave/request — submit leave request
  Future<void> submitLeaveRequest(Map<String, dynamic> data) async {
    await applyLeave(data);
  }

  /// PATCH /api/employees/leave/:id/review — approve or reject
  Future<void> reviewLeave(int id, String action, {String? note}) async {
    try {
      await _api.patch('/api/employees/leave/$id/review', data: {
        'action': action,
        if (note != null) 'reviewerNote': note,
      });
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}

