// lib/core/storage/secure_storage.dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStore {
  static const _storage = FlutterSecureStorage();
  static const _kAccess = 'access_token';
  static const _kRefresh = 'refresh_token';
  static const _kRemember = 'remember_me';
  static const _kLastEmail = 'last_email';
  static const _kSelectedCompanyId = 'selected_company_id';

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

  static Future<void> saveLastEmail(String email) =>
      _storage.write(key: _kLastEmail, value: email.trim());

  static Future<String?> readLastEmail() => _storage.read(key: _kLastEmail);

  static Future<void> saveSelectedCompanyId(int? companyId) async {
    if (companyId == null) {
      await _storage.delete(key: _kSelectedCompanyId);
      return;
    }
    await _storage.write(key: _kSelectedCompanyId, value: companyId.toString());
  }

  static Future<int?> readSelectedCompanyId() async {
    final raw = await _storage.read(key: _kSelectedCompanyId);
    if (raw == null || raw.trim().isEmpty) return null;
    return int.tryParse(raw);
  }
}