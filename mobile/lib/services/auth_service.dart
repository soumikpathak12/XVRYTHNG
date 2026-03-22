// lib/services/auth_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../core/config/api_config.dart';
import '../core/storage/secure_storage.dart';
import 'dart:io' show SocketException;

class AuthException implements Exception {
  final String message;
  final int? statusCode;
  AuthException(this.message, {this.statusCode});
  @override
  String toString() => message;
}

class UserDto {
  final int id;
  final String name;
  final String email;
  final String role;
  final int? companyId;

  UserDto({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.companyId,
  });

  factory UserDto.fromJson(Map<String, dynamic> j) => UserDto(
        id: j['id'] is int ? j['id'] : int.tryParse('${j['id']}') ?? 0,
        name: j['name'] ?? '',
        email: j['email'] ?? '',
        role: j['role'] ?? '',
        companyId: j['companyId'] == null ? null : int.tryParse('${j['companyId']}'),
      );
}

class AuthResult {
  final String accessToken;
  final String refreshToken;
  final String expiresIn;        // e.g., "8h"
  final String refreshExpiresIn; // e.g., "7d"
  final UserDto user;

  AuthResult({
    required this.accessToken,
    required this.refreshToken,
    required this.expiresIn,
    required this.refreshExpiresIn,
    required this.user,
  });

  factory AuthResult.fromJson(Map<String, dynamic> j) => AuthResult(
        accessToken: j['accessToken'] ?? '',
        refreshToken: j['refreshToken'] ?? '',
        expiresIn: j['expiresIn'] ?? '',
        refreshExpiresIn: j['refreshExpiresIn'] ?? '',
        user: UserDto.fromJson(j['user'] ?? const {}),
      );
}

class AuthService {
  Future<AuthResult> login({
    required String email,
    required String password,
    int? companyId,
    bool rememberMe = false,
  }) async {
    final res = await http.post(
      ApiConfig.uri('/api/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
        if (companyId != null) 'companyId': companyId,
      }),
    );

    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Backend likely returns the object directly; also handle {success,data}
      final decoded = jsonDecode(res.body);
      final payload = decoded is Map<String, dynamic>
          ? (decoded['data'] is Map ? decoded['data'] : decoded)
          : <String, dynamic>{};
      final auth = AuthResult.fromJson(payload);
      await SecureStore.saveTokens(
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        rememberMe: rememberMe,
      );
      return auth;
    }

    // Try to surface backend error messages
    String msg = 'Login failed';
    try {
      final body = jsonDecode(res.body);
      msg = body['message']?.toString() ?? msg;
    } catch (_) {}
    throw AuthException(msg, statusCode: res.statusCode);
  }

  Future<AuthResult> refresh() async {
    final refresh = await SecureStore.readRefresh();
    if (refresh == null || refresh.isEmpty) {
      throw AuthException('No refresh token available');
    }

    final res = await http.post(
      ApiConfig.uri('/api/auth/refresh'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refreshToken': refresh}),
    );

    if (res.statusCode >= 200 && res.statusCode < 300) {
      final decoded = jsonDecode(res.body);
      final payload = decoded is Map<String, dynamic>
          ? (decoded['data'] is Map ? decoded['data'] : decoded)
          : <String, dynamic>{};
      final auth = AuthResult.fromJson(payload);
      final remember = await SecureStore.readRemember();
      await SecureStore.saveTokens(
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        rememberMe: remember,
      );
      return auth;
    }

    throw AuthException('Refresh failed', statusCode: res.statusCode);
  }

  Future<void> logout() async {
    await SecureStore.clear();
  }
}


extension PasswordReset on AuthService {
  /// Returns a devToken in non-production if your backend provides it
  /// (useful for testing without email).
  Future<String?> requestPasswordReset({
    required String email,
    int? companyId,
  }) async {
    try {
      final res = await http.post(
        ApiConfig.uri('/api/auth/request-reset'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email.trim(),
          if (companyId != null) 'companyId': companyId,
        }),
      );

      if (res.statusCode >= 200 && res.statusCode < 300) {
        final decoded = jsonDecode(res.body);
        // Backend always returns a generic success; in non-prod may include devToken
        // { success: true, message: "...", devToken?: "..." }
        final devToken = decoded is Map ? decoded['devToken']?.toString() : null;
        return devToken;
      }

      String msg = 'Request failed (HTTP ${res.statusCode})';
      try {
        final body = jsonDecode(res.body);
        msg = body['message']?.toString() ?? msg;
      } catch (_) {}
      throw AuthException(msg, statusCode: res.statusCode);
    } on SocketException {
      throw AuthException(
        'Cannot reach server at ${ApiConfig.baseUrl}. Is it running and reachable from the emulator?',
      );
    } on FormatException {
      throw AuthException('Unexpected response from server.');
    }
  }

  Future<bool> validateResetToken(String token) async {
    try {
      final res = await http.get(
        ApiConfig.uri('/api/auth/validate-reset-token?token=$token'),
        headers: {'Accept': 'application/json'},
      );
      if (res.statusCode >= 200 && res.statusCode < 300) {
        final decoded = jsonDecode(res.body);
        final valid = decoded is Map ? decoded['valid'] == true : false;
        return valid;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  Future<void> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    try {
      final res = await http.post(
        ApiConfig.uri('/api/auth/reset-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'token': token,
          'password': newPassword,
        }),
      );

      if (res.statusCode >= 200 && res.statusCode < 300) {
        return;
      }

      String msg = 'Reset failed (HTTP ${res.statusCode})';
      try {
        final body = jsonDecode(res.body);
        msg = body['message']?.toString() ?? msg;
      } catch (_) {}
      throw AuthException(msg, statusCode: res.statusCode);
    } on SocketException {
      throw AuthException(
        'Cannot reach server at ${ApiConfig.baseUrl}. Is it running and reachable from the emulator?',
      );
    } on FormatException {
      throw AuthException('Unexpected response from server.');
    }
  }
}
