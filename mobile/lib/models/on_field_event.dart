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
    final rawType = json['type'] ?? 'site_inspection';
    final normalisedType = _normaliseType(rawType);
    final leadId = json['lead_id'] ??
        json['leadId'] ??
        // calendar/leads returns `id` as the lead id; keep as fallback
        (normalisedType == 'site_inspection' ? json['id'] : null);

    return OnFieldEvent(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString().replaceAll(RegExp(r'[^0-9]'), '') ?? '') ?? 0,
      title: json['title'] ?? json['customer_name'] ?? '',
      type: normalisedType,
      start: DateTime.tryParse(json['start'] ?? json['scheduled_date'] ?? json['site_inspection_date'] ?? '') ??
          DateTime.now(),
      end: json['end'] != null ? DateTime.tryParse(json['end']) : null,
      address: json['address'] ?? json['site_address'],
      leadId: leadId,
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

  bool get isSiteInspection => _normaliseType(type) == 'site_inspection';

  bool get isInstallation => _normaliseType(type) == 'installation';

  static String _normaliseType(String value) {
    return value.toLowerCase().replaceAll(RegExp('[\\s-]+'), '_').trim();
  }
}
