// lib/core/config/api_config.dart

class ApiConfig {
  static const String _defaultBaseUrl = 'https://xvrything.com.au';

  static String get baseUrl {
    // Allow override with --dart-define
    const override = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    if (override.isNotEmpty) return override;
    return _defaultBaseUrl;
  }

  static Uri uri(String path) => Uri.parse('$baseUrl$path');
}