class Project {
  final int id;
  final String customerName;
  final String? address;
  final String? suburb;
  final String stage;
  final String? source;
  final String? lastActivity;
  final String? systemSummary;
  final double? value;
  final double? marginPct;
  final List<String> assignees;
  final DateTime? scheduledAt;
  final String? scheduleStatus;
  final DateTime? createdAt;
  final Map<String, dynamic>? raw;

  Project({
    required this.id,
    required this.customerName,
    this.address,
    this.suburb,
    this.stage = 'new',
    this.source,
    this.lastActivity,
    this.systemSummary,
    this.value,
    this.marginPct,
    this.assignees = const [],
    this.scheduledAt,
    this.scheduleStatus,
    this.createdAt,
    this.raw,
  });

  factory Project.fromJson(Map<String, dynamic> json) {
    final raw = json;
    List<String> assignees = [];
    if (json['assignees'] is List) {
      assignees = (json['assignees'] as List).map((e) => e.toString()).toList();
    }

    return Project(
      id: json['id'] ?? 0,
      customerName: json['customer_name'] ?? json['customerName'] ?? '',
      address: json['address'],
      suburb: json['suburb'],
      stage: json['stage'] ?? 'new',
      source: json['source'],
      lastActivity: json['last_activity'],
      systemSummary: json['system_summary'] ?? json['systemSummary'],
      value: json['value']?.toDouble(),
      marginPct: json['margin_pct']?.toDouble(),
      assignees: assignees,
      scheduledAt: json['scheduled_at'] != null
          ? DateTime.tryParse(json['scheduled_at'].toString())
          : null,
      scheduleStatus: json['schedule_status'],
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
      raw: raw,
    );
  }

  static const List<String> stages = [
    'new',
    'scheduled',
    'to_be_rescheduled',
    'installation_in_progress',
    'installation_completed',
    'ces_certificate_applied',
    'ces_certificate_received',
    'grid_connection_initiated',
    'grid_connection_completed',
    'system_handover',
  ];

  static const Map<String, String> stageLabels = {
    'new': 'New',
    'scheduled': 'Scheduled',
    'to_be_rescheduled': 'To Be Rescheduled',
    'installation_in_progress': 'Installation In-Progress',
    'installation_completed': 'Installation Completed',
    'ces_certificate_applied': 'CES Certificate Applied',
    'ces_certificate_received': 'CES Certificate Received',
    'grid_connection_initiated': 'GRID Connection Initiated',
    'grid_connection_completed': 'GRID Connection Completed',
    'system_handover': 'System Handover',
  };
}
