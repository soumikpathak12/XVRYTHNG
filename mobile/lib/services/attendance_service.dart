import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';
import '../models/attendance.dart';

class AttendanceService {
  final _api = ApiClient();

  Future<AttendanceToday?> getTodayStatus() async {
    try {
      final response = await _api.get('/api/employees/attendance/today');
      final data = response.data['data'];
      if (data == null) return null;
      return AttendanceToday.fromJson(data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<AttendanceToday> checkIn(double lat, double lng) async {
    try {
      final response =
          await _api.post('/api/employees/attendance/check-in', data: {
        'lat': lat,
        'lng': lng,
      });
      return AttendanceToday.fromJson(
          response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<AttendanceToday> checkOut(double lat, double lng) async {
    try {
      final response =
          await _api.post('/api/employees/attendance/check-out', data: {
        'lat': lat,
        'lng': lng,
      });
      return AttendanceToday.fromJson(
          response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<AttendanceRecord>> getHistory() async {
    try {
      final response = await _api.get('/api/employees/attendance/history');
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => AttendanceRecord.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> submitEditRequest(Map<String, dynamic> data) async {
    try {
      await _api.post('/api/employees/attendance/edit-request', data: data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<AttendanceEditRequest>> getMyEditRequests() async {
    try {
      final response =
          await _api.get('/api/employees/attendance/edit-requests');
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => AttendanceEditRequest.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<AttendanceEditRequest>> getPendingEditRequests() async {
    try {
      final response =
          await _api.get('/api/employees/attendance/edit-requests/pending');
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => AttendanceEditRequest.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> reviewEditRequest(
      int id, String action, String? note) async {
    try {
      await _api.patch('/api/employees/attendance/edit-requests/$id', data: {
        'action': action,
        if (note != null) 'reviewerNote': note,
      });
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
