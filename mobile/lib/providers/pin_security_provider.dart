import 'package:flutter/foundation.dart';
import '../models/user.dart';
import '../services/pin_security_service.dart';

class PinSecurityProvider extends ChangeNotifier {
  final PinSecurityService _service = PinSecurityService();
  bool _loading = true;
  bool _configured = false;
  bool _unlocked = true;
  int? _activeUserId;
  String? _securityQuestion;

  bool get loading => _loading;
  bool get configured => _configured;
  bool get unlocked => _unlocked;
  String? get securityQuestion => _securityQuestion;

  Future<void> syncForUser(User? user) async {
    final userId = user?.id;
    if (userId == null) {
      _activeUserId = null;
      _configured = false;
      _unlocked = true;
      _securityQuestion = null;
      _loading = false;
      notifyListeners();
      return;
    }
    if (_activeUserId == userId && !_loading) return;

    _activeUserId = userId;
    _loading = true;
    notifyListeners();
    try {
      final status = await _service.getStatus();
      _configured = status.configured;
      _unlocked = !status.configured;
      _securityQuestion = status.securityQuestion;
    } catch (_) {
      _configured = false;
      _unlocked = true;
      _securityQuestion = null;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  /// After [POST /api/auth/pin/login] the user already entered their PIN on the server.
  Future<void> syncForUserAfterPinLogin(User? user) async {
    final userId = user?.id;
    if (userId == null) {
      _activeUserId = null;
      _configured = false;
      _unlocked = true;
      _securityQuestion = null;
      _loading = false;
      notifyListeners();
      return;
    }
    _activeUserId = userId;
    _loading = true;
    notifyListeners();
    try {
      final status = await _service.getStatus();
      _configured = status.configured;
      _unlocked = true;
      _securityQuestion = status.securityQuestion;
    } catch (_) {
      _configured = false;
      _unlocked = true;
      _securityQuestion = null;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> setupPin({
    required String pin,
    required String securityQuestion,
    required String securityAnswer,
  }) async {
    if (_activeUserId == null) return;
    await _service.setupPin(
      pin: pin,
      securityQuestion: securityQuestion,
      securityAnswer: securityAnswer,
    );
    _configured = true;
    _unlocked = true;
    _securityQuestion = securityQuestion;
    notifyListeners();
  }

  Future<bool> verifyPin(String pin) async {
    if (_activeUserId == null) return false;
    final ok = await _service.verifyPin(pin);
    if (ok) {
      _unlocked = true;
      notifyListeners();
    }
    return ok;
  }

  void lock() {
    if (!_configured || _activeUserId == null || !_unlocked) return;
    _unlocked = false;
    notifyListeners();
  }

  Future<bool> verifySecurityAnswer(String answer) async {
    if (_activeUserId == null) return false;
    return _service.verifySecurityAnswer(answer);
  }

  Future<void> requestEmailRecovery() async {
    if (_activeUserId == null) return;
    await _service.requestEmailRecovery();
  }

  Future<EmailRecoveryVerifyResult> verifyEmailRecoveryCode(String code) async {
    if (_activeUserId == null) {
      return EmailRecoveryVerifyResult(valid: false, reason: 'none');
    }
    return _service.verifyEmailRecoveryCode(code);
  }

  Future<bool> resetWithEmailRecovery({
    required String recoveryCode,
    required String newPin,
  }) async {
    if (_activeUserId == null) return false;
    final ok = await _service.resetWithEmailRecovery(
      recoveryCode: recoveryCode,
      newPin: newPin,
    );
    if (!ok) return false;
    _configured = true;
    _unlocked = true;
    notifyListeners();
    return true;
  }

  Future<bool> resetPinWithSecurityAnswer({
    required String answer,
    required String newPin,
  }) async {
    if (_activeUserId == null) return false;
    final ok = await _service.resetPin(
      securityAnswer: answer,
      newPin: newPin,
    );
    if (!ok) return false;
    _configured = true;
    _unlocked = true;
    notifyListeners();
    return true;
  }
}
