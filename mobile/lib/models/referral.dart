class Referral {
  final int id;
  final String? referrerName;
  final String? referrerEmail;
  final String? referrerPhone;
  final String? referredName;
  final String? referredEmail;
  final String? referredPhone;
  final String status;
  final String? systemType;
  final double? bonusAmount;
  final bool bonusPaid;
  final DateTime? createdAt;
  final int? leadId;

  Referral({
    required this.id,
    this.referrerName,
    this.referrerEmail,
    this.referrerPhone,
    this.referredName,
    this.referredEmail,
    this.referredPhone,
    this.status = 'pending',
    this.systemType,
    this.bonusAmount,
    this.bonusPaid = false,
    this.createdAt,
    this.leadId,
  });

  factory Referral.fromJson(Map<String, dynamic> json) => Referral(
        id: json['id'] ?? 0,
        referrerName: json['referrer_name'],
        referrerEmail: json['referrer_email'],
        referrerPhone: json['referrer_phone'],
        referredName: json['referred_name'],
        referredEmail: json['referred_email'],
        referredPhone: json['referred_phone'],
        status: json['status'] ?? 'pending',
        systemType: json['system_type'],
        bonusAmount: json['bonus_amount']?.toDouble(),
        bonusPaid: json['bonus_paid'] == true,
        createdAt: json['created_at'] != null
            ? DateTime.tryParse(json['created_at'].toString())
            : null,
        leadId: json['lead_id'],
      );

  static const Map<String, String> statusLabels = {
    'pending': 'Pending',
    'in_progress': 'In Progress',
    'converted': 'Converted',
    'bonus_paid': 'Bonus Paid',
    'lost': 'Lost',
  };
}

class ReferralCounts {
  final int total;
  final int pending;
  final int inProgress;
  final int converted;
  final int bonusPaid;
  final int lost;

  ReferralCounts({
    this.total = 0,
    this.pending = 0,
    this.inProgress = 0,
    this.converted = 0,
    this.bonusPaid = 0,
    this.lost = 0,
  });

  factory ReferralCounts.fromJson(Map<String, dynamic> json) => ReferralCounts(
        total: json['total'] ?? 0,
        pending: json['pending'] ?? 0,
        inProgress: json['in_progress'] ?? 0,
        converted: json['converted'] ?? 0,
        bonusPaid: json['bonus_paid'] ?? 0,
        lost: json['lost'] ?? 0,
      );
}
