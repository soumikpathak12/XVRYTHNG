/// On-field calendar event model.
/// Maps to backend `/api/on-field/calendar` response.
class OnFieldEvent {
  final int id;
  final String title;
  final String type; // 'site_inspection' | 'installation'
  final DateTime start;
  final DateTime? end;
  final String? address;
  final int? leadId;
  final int? jobId;
  final int? projectId;
  final String? assigneeName;
  final String? status;
  final String? notes;

  const OnFieldEvent({
    required this.id,
    required this.title,
    required this.type,
    required this.start,
    this.end,
    this.address,
    this.leadId,
    this.jobId,
    this.projectId,
    this.assigneeName,
    this.status,
    this.notes,
  });

  factory OnFieldEvent.fromJson(Map<String, dynamic> json) {
    return OnFieldEvent(
      id: json['id'] ?? 0,
      title: json['title'] ?? json['customer_name'] ?? '',
      type: json['type'] ?? 'site_inspection',
      start: DateTime.tryParse(json['start'] ?? json['scheduled_date'] ?? '') ??
          DateTime.now(),
      end: json['end'] != null ? DateTime.tryParse(json['end']) : null,
      address: json['address'] ?? json['site_address'],
      leadId: json['lead_id'] ?? json['leadId'],
      jobId: json['job_id'] ?? json['jobId'],
      projectId: json['project_id'] ?? json['projectId'],
      assigneeName: json['assignee_name'] ?? json['assigneeName'],
      status: json['status'],
      notes: json['notes'],
    );
  }

  /// Normalised day key for calendar grouping (YYYY-MM-DD)
  String get dayKey =>
      '${start.year}-${start.month.toString().padLeft(2, '0')}-${start.day.toString().padLeft(2, '0')}';

  bool get isSiteInspection => type == 'site_inspection';
  bool get isInstallation => type == 'installation';
}
