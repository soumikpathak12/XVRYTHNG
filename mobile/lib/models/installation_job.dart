class InstallationJob {
  final int id;
  final String status;
  final String customerName;
  final String? address;
  final String? suburb;
  final DateTime? scheduledDate;
  final String? scheduledTime;
  final double? systemSizeKw;
  final String? systemType;
  final int teamCount;
  final List<String> teamNames;
  final Map<String, dynamic>? raw;

  InstallationJob({
    required this.id,
    required this.status,
    required this.customerName,
    this.address,
    this.suburb,
    this.scheduledDate,
    this.scheduledTime,
    this.systemSizeKw,
    this.systemType,
    this.teamCount = 0,
    this.teamNames = const [],
    this.raw,
  });

  factory InstallationJob.fromJson(Map<String, dynamic> json) {
    List<String> teams = [];
    if (json['team_names'] is List) {
      teams = (json['team_names'] as List).map((e) => e.toString()).toList();
    } else if (json['team_names'] is String) {
      teams = [json['team_names']];
    }

    return InstallationJob(
      id: json['id'] ?? 0,
      status: json['status'] ?? 'scheduled',
      customerName: json['customer_name'] ?? '',
      address: json['address'],
      suburb: json['suburb'],
      scheduledDate: json['scheduled_date'] != null
          ? DateTime.tryParse(json['scheduled_date'].toString())
          : null,
      scheduledTime: json['scheduled_time'],
      systemSizeKw: json['system_size_kw']?.toDouble(),
      systemType: json['system_type'],
      teamCount: json['team_count'] ?? 0,
      teamNames: teams,
      raw: json,
    );
  }

  static const List<String> statuses = [
    'scheduled',
    'in_progress',
    'paused',
    'completed',
  ];

  static const Map<String, String> statusLabels = {
    'scheduled': 'Scheduled',
    'in_progress': 'In Progress',
    'paused': 'Paused',
    'completed': 'Completed',
  };
}

class ChecklistItem {
  final int id;
  final String label;
  final bool checked;
  final String? note;

  ChecklistItem({
    required this.id,
    required this.label,
    this.checked = false,
    this.note,
  });

  factory ChecklistItem.fromJson(Map<String, dynamic> json) => ChecklistItem(
        id: json['id'] ?? 0,
        label: json['label'] ?? '',
        checked: json['checked'] == true,
        note: json['note'],
      );
}
