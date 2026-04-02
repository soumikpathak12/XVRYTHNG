import 'package:dio/dio.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic data;

  ApiException({required this.message, this.statusCode, this.data});

  factory ApiException.fromDioError(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return ApiException(message: 'Connection timed out', statusCode: 408);
      case DioExceptionType.badResponse:
        final statusCode = error.response?.statusCode;
        final data = error.response?.data;
        String message = 'Something went wrong';
        if (data is Map) {
          message = data['message'] ?? data['error'] ?? message;
        }
        return ApiException(
            message: message, statusCode: statusCode, data: data);
      case DioExceptionType.cancel:
        return ApiException(message: 'Request cancelled');
      case DioExceptionType.connectionError:
        if ((error.message ?? '').toLowerCase().contains('cleartext')) {
          return ApiException(
              message: 'Insecure HTTP blocked on Android (cleartext).');
        }
        return ApiException(message: 'No internet connection');
      default:
        return ApiException(message: 'Something went wrong');
    }
  }

  @override
  String toString() =>
      statusCode == null ? 'ApiException: $message' : 'ApiException($statusCode): $message';
}
