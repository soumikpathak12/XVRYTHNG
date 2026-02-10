// lib/core/storage/secure_storage.dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStore {
  static const _storage = FlutterSecureStorage();
  static const _kAccess = 'access_token';
  static const _kRefresh = 'refresh_token';
  static const _kRemember = 'remember_me';

  static Future<void> saveTokens({
    required String accessToken,
    String? refreshToken,
    required bool rememberMe,
  }) async {
    await _storage.write(key: _kAccess, value: accessToken);
    await _storage.write(key: _kRemember, value: rememberMe ? '1' : '0');
    if (rememberMe && refreshToken != null && refreshToken.isNotEmpty) {
      await _storage.write(key: _kRefresh, value: refreshToken);
    } else {
      // Ephemeral session: keep only access token; remove refresh token
      await _storage.delete(key: _kRefresh);
    }
  }

  static Future<String?> readAccess() => _storage.read(key: _kAccess);
  static Future<String?> readRefresh() => _storage.read(key: _kRefresh);
  static Future<bool> readRemember() async =>
      (await _storage.read(key: _kRemember)) == '1';

  static Future<void> clear() => _storage.deleteAll();
}