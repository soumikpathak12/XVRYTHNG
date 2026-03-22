class User {
  final int id;
  final String name;
  final String email;
  final String role;
  final int? companyId;
  final String? companyName;
  final String? avatarUrl;
  final bool needsPasswordChange;

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.companyId,
    this.companyName,
    this.avatarUrl,
    this.needsPasswordChange = false,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] ?? 0,
        name: json['name'] ?? '',
        email: json['email'] ?? '',
        role: json['role'] ?? '',
        companyId: json['companyId'] ?? json['company_id'],
        companyName: json['companyName'] ?? json['company_name'],
        avatarUrl: json['avatarUrl'] ?? json['avatar_url'],
        needsPasswordChange: json['needsPasswordChange'] == true,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'role': role,
        'companyId': companyId,
        'companyName': companyName,
        'avatarUrl': avatarUrl,
      };

  bool get isSuperAdmin => role == 'super_admin';
  bool get isCompanyAdmin => role == 'company_admin';
  bool get isManager => role == 'manager';
  bool get isFieldAgent => role == 'field_agent';
}
