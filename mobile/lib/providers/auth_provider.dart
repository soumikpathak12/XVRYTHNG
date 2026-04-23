import 'package:flutter/foundation.dart';
import 'dart:async';
import '../models/user.dart';
import '../services/auth_service.dart';
import '../core/storage/secure_storage.dart';
import '../core/network/api_client.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();

  User? _user;
  List<String> _permissions = [];
  Map<String, dynamic> _sidebarConfig = {};
  bool _loading = true;
  String? _error;
  /// Last sign-in used [loginWithPin] (skip in-app PIN lock until sync).
  bool _lastLoginUsedPin = false;

  User? get user => _user;
  bool get lastLoginUsedPin => _lastLoginUsedPin;
  List<String> get permissions => _permissions;
  Map<String, dynamic> get sidebarConfig => _sidebarConfig;
  bool get loading => _loading;
  String? get error => _error;
  bool get isAuthenticated => _user != null;

  bool can(String resource, String action) {
    final slug = '$resource:$action';
    return _permissions.contains(slug) || _permissions.contains('*:*');
  }

  String getDefaultRoute() {
    if (_user == null) return '/login';
    if (_user!.isOnFieldRole || _user!.isFieldAgent) {
      return '/employee/on-field';
    }
    switch (_user!.role) {
      case 'super_admin':
        return '/admin';
      case 'company_admin':
      case 'manager':
        return '/dashboard';
      case 'field_agent':
        return '/employee';
      default:
        return '/dashboard';
    }
  }

  Future<void> initialize() async {
    _loading = true;
    notifyListeners();
    try {
      final token = await SecureStore.readAccess();
      if (token != null && token.isNotEmpty) {
        _user = await _authService.getCurrentUser();
        _permissions = await _authService.getPermissions();
        try {
          _sidebarConfig = await _authService.getSidebarConfig();
        } catch (_) {}
      }
    } catch (e) {
      _user = null;
      _permissions = [];
      await SecureStore.clearSessionOnly();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  void clearLastLoginUsedPin() {
    _lastLoginUsedPin = false;
  }

  Future<void> login(
    String email,
    String password, {
    bool rememberMe = false,
  }) async {
    _lastLoginUsedPin = false;
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final result = await _authService.login(
        email,
        password,
        rememberMe: rememberMe,
      );
      try {
        _user = await _authService.getCurrentUser();
      } catch (_) {
        _user = result.user;
      }
      _permissions = result.permissions;
      if (_permissions.isEmpty) {
        unawaited(
          _authService
              .getPermissions()
              .then((perms) {
                _permissions = perms;
                notifyListeners();
              })
              .catchError((_) {}),
        );
      }
      unawaited(
        _authService
            .getSidebarConfig()
            .then((sidebar) {
              _sidebarConfig = sidebar;
              notifyListeners();
            })
            .catchError((_) {}),
      );
      if (_user != null) {
        await SecureStore.saveDeviceLastAccount(
          userId: _user!.id,
          email: _user!.email,
          name: _user!.name,
          companyId: _user!.companyId,
        );
      }
      _error = null;
    } catch (e) {
      _error = e
          .toString()
          .replaceAll('ApiException', '')
          .replaceAll(RegExp(r'\(\d+\):?\s*'), '')
          .trim();
      _user = null;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> loginWithPin(
    String email,
    String pin, {
    int? companyId,
    bool rememberMe = true,
  }) async {
    _lastLoginUsedPin = true;
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final result = await _authService.loginWithPin(
        email,
        pin,
        companyId: companyId,
        rememberMe: rememberMe,
      );
      try {
        _user = await _authService.getCurrentUser();
      } catch (_) {
        _user = result.user;
      }
      _permissions = result.permissions;
      if (_permissions.isEmpty) {
        unawaited(
          _authService
              .getPermissions()
              .then((perms) {
                _permissions = perms;
                notifyListeners();
              })
              .catchError((_) {}),
        );
      }
      unawaited(
        _authService
            .getSidebarConfig()
            .then((sidebar) {
              _sidebarConfig = sidebar;
              notifyListeners();
            })
            .catchError((_) {}),
      );
      if (_user != null) {
        await SecureStore.saveDeviceLastAccount(
          userId: _user!.id,
          email: _user!.email,
          name: _user!.name,
          companyId: _user!.companyId,
        );
        await SecureStore.saveLastEmail(_user!.email);
        if (_user!.companyId != null) {
          await SecureStore.saveSelectedCompanyId(_user!.companyId);
        }
      }
      _error = null;
    } catch (e) {
      _lastLoginUsedPin = false;
      _error = e
          .toString()
          .replaceAll('ApiException', '')
          .replaceAll(RegExp(r'\(\d+\):?\s*'), '')
          .trim();
      _user = null;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    if (_user != null) {
      await SecureStore.saveDeviceLastAccount(
        userId: _user!.id,
        email: _user!.email,
        name: _user!.name,
        companyId: _user!.companyId,
      );
      await SecureStore.saveLastEmail(_user!.email);
    }
    _lastLoginUsedPin = false;
    await _authService.logout();
    _user = null;
    _permissions = [];
    _sidebarConfig = {};
    _error = null;
    notifyListeners();
  }

  Future<void> changePassword(
    String currentPassword,
    String newPassword,
  ) async {
    try {
      await _authService.changePassword(currentPassword, newPassword);
    } catch (e) {
      rethrow;
    }
  }

  void listenToSessionExpiry() {
    ApiClient().onSessionExpired.listen((_) {
      _user = null;
      _permissions = [];
      _sidebarConfig = {};
      _lastLoginUsedPin = false;
      unawaited(SecureStore.clearSessionOnly());
      notifyListeners();
    });
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
