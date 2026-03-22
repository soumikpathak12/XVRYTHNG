// lib/core/config/api_config.dart
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

class ApiConfig {
  static String get baseUrl {
    // Allow override with --dart-define
    const override = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    if (override.isNotEmpty) return override;

    if (kIsWeb) return 'http://localhost:3000';
    if (Platform.isAndroid) return 'http://10.0.2.2:3000'; // Android emulator → host machine
    return 'http://localhost:3000'; // iOS sim / desktop
  }

  static Uri uri(String path) => Uri.parse('$baseUrl$path');
}