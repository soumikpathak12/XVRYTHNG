import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';
import '../models/attendance.dart';

class AttendanceService {
  final _api = ApiClient();

  Future<AttendanceToday?> getTodayStatus({int? companyId}) async {
    try {
      final response = await _api.get(
        '/api/employees/attendance/today',
        queryParameters: companyId != null ? {'companyId': companyId} : null,
      );
      final data = response.data['data'];
      if (data == null) return null;
      return AttendanceToday.fromJson(data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<AttendanceToday> checkIn(double lat, double lng, {int? companyId}) async {
    try {
      final response = await _api.dio.post(
        '/api/employees/attendance/check-in',
        queryParameters: companyId != null ? {'companyId': companyId} : null,
        data: {
        'lat': lat,
        'lng': lng,
      },
      );
      return AttendanceToday.fromJson(
          response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<AttendanceToday> checkOut(double lat, double lng, {int? companyId}) async {
    try {
      final response = await _api.dio.post(
        '/api/employees/attendance/check-out',
        queryParameters: companyId != null ? {'companyId': companyId} : null,
        data: {
        'lat': lat,
        'lng': lng,
      },
      );
      return AttendanceToday.fromJson(
          response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<AttendanceRecord>> getHistory({int? companyId}) async {
    try {
      final response = await _api.get(
        '/api/employees/attendance/history',
        queryParameters: companyId != null ? {'companyId': companyId} : null,
      );
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => AttendanceRecord.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> submitEditRequest(Map<String, dynamic> data, {int? companyId}) async {
    try {
      await _api.dio.post(
        '/api/employees/attendance/edit-request',
        queryParameters: companyId != null ? {'companyId': companyId} : null,
        data: data,
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<AttendanceEditRequest>> getMyEditRequests({int? companyId}) async {
    try {
      final response = await _api.get(
        '/api/employees/attendance/edit-requests',
        queryParameters: companyId != null ? {'companyId': companyId} : null,
      );
      final data = response.data['data'] ?? response.data;
      if (data is List) {
        return data.map((e) => AttendanceEditRequest.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<AttendanceEditRequest>> getPendingEditRequests({int? companyId}) async {
    try {
      final response = await _api.get(
        '/api/employees/attendance/edit-requests/pending',
        queryParameters: companyId != null ? {'companyId': companyId} : null,
      );
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
      int id, String action, String? note, {int? companyId}) async {
    try {
      await _api.dio.patch(
        '/api/employees/attendance/edit-requests/$id',
        queryParameters: companyId != null ? {'companyId': companyId} : null,
        data: {
          'action': action,
          if (note != null) 'reviewerNote': note,
        },
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
