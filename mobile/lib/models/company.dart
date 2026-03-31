class Company {
  final int id;
  final String name;
  final String? abn;
  final String? email;
  final String? phone;
  final String? website;
  final String? logoUrl;
  final String? address;
  final String? city;
  final String? state;
  final String? postalCode;
  final String? country;
  final String? companyType;
  final String status;
  final DateTime? createdAt;

  Company({
    required this.id,
    required this.name,
    this.abn,
    this.email,
    this.phone,
    this.website,
    this.logoUrl,
    this.address,
    this.city,
    this.state,
    this.postalCode,
    this.country,
    this.companyType,
    this.status = 'active',
    this.createdAt,
  });

  factory Company.fromJson(Map<String, dynamic> json) => Company(
        id: json['id'] ?? 0,
        name: json['name'] ?? '',
        abn: json['abn'],
        email: json['email'] ?? json['contact_email'],
        phone: json['phone'] ?? json['contact_phone'],
        website: json['website'],
        logoUrl: json['logo_url'],
        address: json['address'] ?? json['address_line1'],
        city: json['city'],
        state: json['state'],
        postalCode: json['postal_code'] ?? json['postcode'],
        country: json['country'],
        companyType: json['company_type'] ?? json['company_type_name'],
        status: json['status'] ?? 'active',
        createdAt: json['created_at'] != null
            ? DateTime.tryParse(json['created_at'].toString())
            : null,
      );
}
