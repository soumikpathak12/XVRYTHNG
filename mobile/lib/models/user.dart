import '../core/config/api_config.dart';

class User {
  final int id;
  final String name;
  final String email;
  final String role;
  final int? jobRoleId;
  final int? companyId;
  final String? companyName;
  final String? avatarUrl;
  final bool needsPasswordChange;

  static int? _parseInt(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is double) return value.toInt();
    return int.tryParse(value.toString());
  }

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.jobRoleId,
    this.companyId,
    this.companyName,
    this.avatarUrl,
    this.needsPasswordChange = false,
  });

  static String? _normalizeAvatarUrl(dynamic rawUrl) {
    if (rawUrl == null) return null;
    final value = rawUrl.toString().trim();
    if (value.isEmpty) return null;
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }
    final normalized = value.startsWith('/') ? value : '/$value';
    if (normalized.startsWith('/uploads/')) {
      return '${ApiConfig.baseUrl}/api$normalized';
    }
    return '${ApiConfig.baseUrl}$normalized';
  }

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] ?? 0,
        name: json['name'] ?? '',
        email: json['email'] ?? '',
        role: json['role'] ?? '',
        jobRoleId: _parseInt(
          json['jobRoleId'] ??
              json['job_role_id'] ??
              (json['employee'] is Map
                  ? (json['employee']['jobRoleId'] ??
                      json['employee']['job_role_id'] ??
                      (json['employee']['jobRole'] is Map
                          ? json['employee']['jobRole']['id']
                          : null))
                  : null) ??
              (json['jobRole'] is Map ? json['jobRole']['id'] : null),
        ),
        companyId: json['companyId'] ?? json['company_id'],
        companyName: json['companyName'] ?? json['company_name'],
        avatarUrl: _normalizeAvatarUrl(
          json['avatarUrl'] ??
              json['avatar_url'] ??
              json['image_url'] ??
              json['photo_url'] ??
              json['photoUrl'] ??
              json['photo'],
        ),
        needsPasswordChange: json['needsPasswordChange'] == true,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'role': role,
        'jobRoleId': jobRoleId,
        'companyId': companyId,
        'companyName': companyName,
        'avatarUrl': avatarUrl,
      };

  bool get isSuperAdmin => role == 'super_admin';
  bool get isCompanyAdmin => role == 'company_admin';
  bool get isManager => role == 'manager';
  bool get isFieldAgent => role == 'field_agent';
  bool get isOnFieldRole => jobRoleId == 2;
}
