class Lead {
  final int id;
  final String customerName;
  final String? email;
  final String? phone;
  final String? suburb;
  final String? address;
  final String? systemSize;
  final double? value;
  final String? source;
  final String stage;
  final String? lastActivity;
  final String? notes;
  final String? assignedTo;
  final String? assignedToName;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final Map<String, dynamic>? raw;

  Lead({
    required this.id,
    required this.customerName,
    this.email,
    this.phone,
    this.suburb,
    this.address,
    this.systemSize,
    this.value,
    this.source,
    required this.stage,
    this.lastActivity,
    this.notes,
    this.assignedTo,
    this.assignedToName,
    this.createdAt,
    this.updatedAt,
    this.raw,
  });

  factory Lead.fromJson(Map<String, dynamic> json) => Lead(
        id: json['id'] ?? 0,
        customerName: json['customer_name'] ?? json['customerName'] ?? '',
        email: json['email'],
        phone: json['phone'],
        suburb: json['suburb'],
        address: json['address'],
        systemSize: json['system_size'] ?? json['systemSize'],
        value: (json['value'] ?? json['pipeline_value'])?.toDouble(),
        source: json['source'],
        stage: json['stage'] ?? 'new',
        lastActivity: json['last_activity'] ?? json['lastActivity'],
        notes: json['notes'],
        assignedTo: json['assigned_to']?.toString(),
        assignedToName: json['assigned_to_name'] ?? json['assignedToName'],
        createdAt: json['created_at'] != null
            ? DateTime.tryParse(json['created_at'].toString())
            : null,
        updatedAt: json['updated_at'] != null
            ? DateTime.tryParse(json['updated_at'].toString())
            : null,
        raw: json,
      );

  Map<String, dynamic> toJson() => {
        'customer_name': customerName,
        'email': email,
        'phone': phone,
        'suburb': suburb,
        'address': address,
        'system_size': systemSize,
        'value': value,
        'source': source,
        'stage': stage,
        'notes': notes,
        'assigned_to': assignedTo,
      };

  /// Pipeline stages (must match backend `leadService` STAGES).
  static const List<String> stages = [
    'new',
    'contacted',
    'qualified',
    'inspection_booked',
    'inspection_completed',
    'proposal_sent',
    'negotiation',
    'closed_won',
    'closed_lost',
  ];

  static const Map<String, String> stageLabels = {
    'new': 'New',
    'contacted': 'Contacted',
    'qualified': 'Qualified',
    'inspection_booked': 'Inspection booked',
    'inspection_completed': 'Inspection done',
    'proposal_sent': 'Proposal sent',
    'negotiation': 'Negotiation',
    'closed_won': 'Closed Won',
    'closed_lost': 'Closed Lost',
    // Legacy / DB values
    'proposal': 'Proposal',
  };
}
