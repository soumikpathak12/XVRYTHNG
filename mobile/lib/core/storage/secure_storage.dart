// lib/core/storage/secure_storage.dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Last signed-in user on this device (persists after sign out) for quick PIN re-entry.
class DeviceLastAccount {
  final int userId;
  final String email;
  final String name;
  final int? companyId;

  const DeviceLastAccount({
    required this.userId,
    required this.email,
    required this.name,
    this.companyId,
  });
}

class SecureStore {
  static const _storage = FlutterSecureStorage();
  static const _kAccess = 'access_token';
  static const _kRefresh = 'refresh_token';
  static const _kRemember = 'remember_me';
  static const _kLastEmail = 'last_email';
  static const _kDeviceUserId = 'device_last_user_id';
  static const _kDeviceEmail = 'device_last_email';
  static const _kDeviceName = 'device_last_name';
  static const _kDeviceCompanyId = 'device_last_company_id';
  static const _kSelectedCompanyId = 'selected_company_id';
  static const _kPinConfiguredPrefix = 'pin_configured_user_';
  static const _kPinValuePrefix = 'pin_value_user_';
  static const _kPinQuestionPrefix = 'pin_question_user_';
  static const _kPinAnswerPrefix = 'pin_answer_user_';

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

  /// Removes tokens only; keeps last email, device last account, PIN hints, company id, etc.
  static Future<void> clearSessionOnly() async {
    await _storage.delete(key: _kAccess);
    await _storage.delete(key: _kRefresh);
    await _storage.delete(key: _kRemember);
  }

  static Future<void> saveDeviceLastAccount({
    required int userId,
    required String email,
    String? name,
    int? companyId,
  }) async {
    await _storage.write(key: _kDeviceUserId, value: userId.toString());
    await _storage.write(
      key: _kDeviceEmail,
      value: email.trim().toLowerCase(),
    );
    await _storage.write(key: _kDeviceName, value: name?.trim() ?? '');
    if (companyId != null) {
      await _storage.write(key: _kDeviceCompanyId, value: companyId.toString());
    } else {
      await _storage.delete(key: _kDeviceCompanyId);
    }
  }

  static Future<DeviceLastAccount?> readDeviceLastAccount() async {
    final uid = await _storage.read(key: _kDeviceUserId);
    final em = await _storage.read(key: _kDeviceEmail);
    if (uid == null || em == null || em.trim().isEmpty) return null;
    final id = int.tryParse(uid.trim());
    if (id == null || id <= 0) return null;
    final name = await _storage.read(key: _kDeviceName) ?? '';
    final cidRaw = await _storage.read(key: _kDeviceCompanyId);
    final companyId = cidRaw != null && cidRaw.isNotEmpty
        ? int.tryParse(cidRaw)
        : null;
    return DeviceLastAccount(
      userId: id,
      email: em.trim().toLowerCase(),
      name: name,
      companyId: companyId,
    );
  }

  static Future<void> clearDeviceLastAccount() async {
    await _storage.delete(key: _kDeviceUserId);
    await _storage.delete(key: _kDeviceEmail);
    await _storage.delete(key: _kDeviceName);
    await _storage.delete(key: _kDeviceCompanyId);
  }

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

  static String _kPinConfigured(int userId) => '$_kPinConfiguredPrefix$userId';
  static String _kPinValue(int userId) => '$_kPinValuePrefix$userId';
  static String _kPinQuestion(int userId) => '$_kPinQuestionPrefix$userId';
  static String _kPinAnswer(int userId) => '$_kPinAnswerPrefix$userId';

  static Future<void> savePinSetup({
    required int userId,
    required String pin,
    required String securityQuestion,
    required String securityAnswer,
  }) async {
    await _storage.write(key: _kPinValue(userId), value: pin);
    await _storage.write(key: _kPinQuestion(userId), value: securityQuestion);
    await _storage.write(
      key: _kPinAnswer(userId),
      value: securityAnswer.trim().toLowerCase(),
    );
    await _storage.write(key: _kPinConfigured(userId), value: '1');
  }

  static Future<bool> isPinConfigured(int userId) async {
    return (await _storage.read(key: _kPinConfigured(userId))) == '1';
  }

  static Future<String?> readPin(int userId) => _storage.read(key: _kPinValue(userId));

  static Future<String?> readSecurityQuestion(int userId) =>
      _storage.read(key: _kPinQuestion(userId));

  static Future<String?> readSecurityAnswer(int userId) =>
      _storage.read(key: _kPinAnswer(userId));
}