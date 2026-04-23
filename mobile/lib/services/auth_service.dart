import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exceptions.dart';
import '../core/storage/secure_storage.dart';
import '../models/user.dart';

class AuthService {
  final _api = ApiClient();

  Future<AuthResult> login(String email, String password,
      {bool rememberMe = false}) async {
    try {
      final response = await _api.post('/api/auth/login', data: {
        'email': email,
        'password': password,
      });
      final data = Map<String, dynamic>.from(
        response.data is Map ? response.data as Map : {},
      );
      final result = AuthResult.fromJson(data);
      await SecureStore.saveTokens(
        accessToken: result.token,
        refreshToken: result.refreshToken,
        rememberMe: rememberMe,
      );
      return result;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Email + 6-digit app PIN (after PIN is configured on the server).
  Future<AuthResult> loginWithPin(
    String email,
    String pin, {
    int? companyId,
    bool rememberMe = true,
  }) async {
    try {
      final response = await _api.post(
        '/api/auth/pin/login',
        data: {
          'email': email.trim(),
          'pin': pin.trim(),
          if (companyId != null) 'companyId': companyId,
        },
      );
      final data = Map<String, dynamic>.from(
        response.data is Map ? response.data as Map : {},
      );
      final result = AuthResult.fromJson(data);
      await SecureStore.saveTokens(
        accessToken: result.token,
        refreshToken: result.refreshToken,
        rememberMe: rememberMe,
      );
      return result;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Clears session tokens only; keeps [DeviceLastAccount] and other device hints.
  Future<void> logout() async {
    await SecureStore.clearSessionOnly();
  }

  Future<void> requestPasswordReset(String email) async {
    try {
      await _api.post('/api/auth/request-reset', data: {'email': email});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<bool> validateResetToken(String token) async {
    try {
      final response = await _api.get('/api/auth/validate-reset-token',
          queryParameters: {'token': token});
      return response.data['valid'] == true;
    } on DioException {
      return false;
    }
  }

  Future<void> resetPassword(String token, String password) async {
    try {
      await _api.post('/api/auth/reset-password', data: {
        'token': token,
        'password': password,
      });
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<User> getCurrentUser() async {
    try {
      final response = await _api.get('/api/users/me');
      return User.fromJson(response.data['data'] ?? response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<String>> getPermissions() async {
    try {
      final response = await _api.get('/api/users/me/permissions');
      final perms = response.data['permissions'] ?? response.data['data'] ?? [];
      return List<String>.from(perms);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> getSidebarConfig() async {
    try {
      final response = await _api.get('/api/me/sidebar');
      final map = Map<String, dynamic>.from(
        response.data is Map ? response.data as Map : const {},
      );
      // API: { success, data: { role, modules } } — match web `getCompanySidebar`.
      final data = map['data'];
      if (data is Map) {
        return Map<String, dynamic>.from(data);
      }
      return map;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> changePassword(
      String currentPassword, String newPassword) async {
    try {
      await _api.put('/api/users/me/password', data: {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      });
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}

class AuthResult {
  final String token;
  final String? refreshToken;
  final User user;
  final List<String> permissions;
  final bool needsPasswordChange;

  AuthResult({
    required this.token,
    this.refreshToken,
    required this.user,
    this.permissions = const [],
    this.needsPasswordChange = false,
  });

  factory AuthResult.fromJson(Map<String, dynamic> json) {
    List<String> perms = [];
    if (json['permissions'] is List) {
      perms = List<String>.from(json['permissions']);
    }
    // Backend returns both `token` (alias) and `accessToken` on login.
    final rawAccess =
        json['token'] ?? json['accessToken'] ?? json['access_token'];
    final tokenStr = rawAccess == null
        ? ''
        : rawAccess is String
            ? rawAccess
            : rawAccess.toString();
    final rawRefresh = json['refreshToken'] ?? json['refresh_token'];
    final refreshStr =
        rawRefresh is String ? rawRefresh : null;
    return AuthResult(
      token: tokenStr,
      refreshToken: refreshStr,
      user: User.fromJson(
        Map<String, dynamic>.from(json['user'] as Map? ?? {}),
      ),
      permissions: perms,
      needsPasswordChange: json['needsPasswordChange'] == true,
    );
  }
}
