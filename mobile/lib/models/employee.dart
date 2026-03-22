class Employee {
  final int id;
  final String? employeeCode;
  final String firstName;
  final String lastName;
  final String? email;
  final String? phone;
  final String? department;
  final String? departmentName;
  final String? role;
  final String? roleName;
  final String status;
  final int? userId;
  final String? avatarUrl;
  final DateTime? startDate;
  final DateTime? createdAt;
  final Map<String, dynamic>? raw;

  Employee({
    required this.id,
    this.employeeCode,
    required this.firstName,
    required this.lastName,
    this.email,
    this.phone,
    this.department,
    this.departmentName,
    this.role,
    this.roleName,
    this.status = 'active',
    this.userId,
    this.avatarUrl,
    this.startDate,
    this.createdAt,
    this.raw,
  });

  String get fullName => '$firstName $lastName';

  factory Employee.fromJson(Map<String, dynamic> json) => Employee(
        id: json['id'] ?? 0,
        employeeCode: json['employee_code'],
        firstName: json['first_name'] ?? '',
        lastName: json['last_name'] ?? '',
        email: json['email'],
        phone: json['phone'],
        department: json['department'],
        departmentName: json['department_name'],
        role: json['role'],
        roleName: json['role_name'],
        status: json['status'] ?? 'active',
        userId: json['user_id'],
        avatarUrl: json['avatar_url'],
        startDate: json['start_date'] != null
            ? DateTime.tryParse(json['start_date'].toString())
            : null,
        createdAt: json['created_at'] != null
            ? DateTime.tryParse(json['created_at'].toString())
            : null,
        raw: json,
      );
}

class JobRole {
  final int id;
  final String code;
  final String name;

  JobRole({required this.id, required this.code, required this.name});

  factory JobRole.fromJson(Map<String, dynamic> json) => JobRole(
        id: json['id'] ?? 0,
        code: json['code'] ?? '',
        name: json['name'] ?? '',
      );
}
