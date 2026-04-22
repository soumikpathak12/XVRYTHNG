import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';

class PinSecurityService {
  final _api = ApiClient();

  Future<PinStatusResult> getStatus() async {
    try {
      final response = await _api.get('/api/auth/pin/status');
      final data = Map<String, dynamic>.from(
        response.data['data'] is Map ? response.data['data'] as Map : const {},
      );
      return PinStatusResult(
        configured: data['configured'] == true,
        securityQuestion: data['securityQuestion']?.toString(),
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> setupPin({
    required String pin,
    required String securityQuestion,
    required String securityAnswer,
  }) async {
    try {
      await _api.post(
        '/api/auth/pin/setup',
        data: {
          'pin': pin,
          'securityQuestion': securityQuestion,
          'securityAnswer': securityAnswer,
        },
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<bool> verifyPin(String pin) async {
    try {
      final response = await _api.post('/api/auth/pin/verify', data: {'pin': pin});
      final data = Map<String, dynamic>.from(
        response.data['data'] is Map ? response.data['data'] as Map : const {},
      );
      return data['valid'] == true;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<bool> verifySecurityAnswer(String securityAnswer) async {
    try {
      final response = await _api.post(
        '/api/auth/pin/verify-security-answer',
        data: {'securityAnswer': securityAnswer},
      );
      final data = Map<String, dynamic>.from(
        response.data['data'] is Map ? response.data['data'] as Map : const {},
      );
      return data['valid'] == true;
    } on DioException catch (e) {
      if (e.response?.statusCode == 400) return false;
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> requestEmailRecovery() async {
    try {
      await _api.post('/api/auth/pin/request-email-recovery');
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<EmailRecoveryVerifyResult> verifyEmailRecoveryCode(String code) async {
    try {
      final response = await _api.post(
        '/api/auth/pin/verify-email-recovery-code',
        data: {'recoveryCode': code},
      );
      final data = Map<String, dynamic>.from(
        response.data['data'] is Map ? response.data['data'] as Map : const {},
      );
      return EmailRecoveryVerifyResult(
        valid: data['valid'] == true,
        reason: data['reason']?.toString(),
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<bool> resetWithEmailRecovery({
    required String recoveryCode,
    required String newPin,
  }) async {
    try {
      await _api.post(
        '/api/auth/pin/reset-with-email-recovery',
        data: {
          'recoveryCode': recoveryCode,
          'newPin': newPin,
        },
      );
      return true;
    } on DioException catch (e) {
      if (e.response?.statusCode == 400) return false;
      throw ApiException.fromDioError(e);
    }
  }

  Future<bool> resetPin({
    required String securityAnswer,
    required String newPin,
  }) async {
    try {
      await _api.post(
        '/api/auth/pin/reset',
        data: {
          'securityAnswer': securityAnswer,
          'newPin': newPin,
        },
      );
      return true;
    } on DioException catch (e) {
      if (e.response?.statusCode == 400) return false;
      throw ApiException.fromDioError(e);
    }
  }
}

class PinStatusResult {
  final bool configured;
  final String? securityQuestion;

  PinStatusResult({required this.configured, this.securityQuestion});
}

class EmailRecoveryVerifyResult {
  final bool valid;
  final String? reason;

  EmailRecoveryVerifyResult({required this.valid, this.reason});
}
