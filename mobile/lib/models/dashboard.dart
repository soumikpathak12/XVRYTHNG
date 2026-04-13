import '../core/utils/json_parsing.dart';

class DashboardMetrics {
  final MetricValue totalLeads;
  final MetricValue leadsContacted;
  final MetricValue conversionRate;
  final MetricValue pipelineValue;
  final MetricValue proposalsSent;
  final MetricValue closedWon;

  DashboardMetrics({
    required this.totalLeads,
    required this.leadsContacted,
    required this.conversionRate,
    required this.pipelineValue,
    required this.proposalsSent,
    required this.closedWon,
  });

  factory DashboardMetrics.fromJson(Map<String, dynamic> json) {
    return DashboardMetrics(
      totalLeads: MetricValue.fromJson(json['total_leads'] ?? {}),
      leadsContacted: MetricValue.fromJson(json['leads_contacted'] ?? {}),
      conversionRate: MetricValue.fromJson(json['conversion_rate'] ?? {}),
      pipelineValue: MetricValue.fromJson(json['pipeline_value'] ?? {}),
      proposalsSent: MetricValue.fromJson(json['proposals_sent'] ?? {}),
      closedWon: MetricValue.fromJson(json['closed_won'] ?? {}),
    );
  }
}

class MetricValue {
  final double value;
  final double delta;

  MetricValue({this.value = 0, this.delta = 0});

  factory MetricValue.fromJson(Map<String, dynamic> json) => MetricValue(
        value: parseJsonDouble(json['value']) ?? 0,
        delta: parseJsonDouble(json['delta']) ?? 0,
      );
}

class PipelineStage {
  final String stage;
  final String label;
  final double value;
  final int count;

  PipelineStage({
    required this.stage,
    required this.label,
    this.value = 0,
    this.count = 0,
  });

  factory PipelineStage.fromJson(Map<String, dynamic> json) => PipelineStage(
        stage: json['stage'] ?? '',
        label: json['label'] ?? '',
        value: parseJsonDouble(json['value']) ?? 0,
        count: parseJsonInt(json['count']),
      );
}

class LeadBySource {
  final String source;
  final int count;

  LeadBySource({required this.source, required this.count});

  factory LeadBySource.fromJson(Map<String, dynamic> json) => LeadBySource(
        source: json['source'] ?? 'Unknown',
        count: parseJsonInt(json['count']),
      );
}

class ActivityItem {
  /// API may return numeric ids or string keys like `note-12`, `log-34`.
  final String id;
  final String type;
  final String description;
  final String? userName;
  final DateTime? createdAt;

  ActivityItem({
    required this.id,
    required this.type,
    required this.description,
    this.userName,
    this.createdAt,
  });

  static String _descriptionFromJson(Map<String, dynamic> json) {
    final direct = json['description']?.toString();
    if (direct != null && direct.trim().isNotEmpty) return direct.trim();
    final title = json['title']?.toString().trim();
    final body = json['body']?.toString().trim();
    if (title != null &&
        title.isNotEmpty &&
        body != null &&
        body.isNotEmpty) {
      return '$title\n\n$body';
    }
    return title ?? body ?? '';
  }

  factory ActivityItem.fromJson(Map<String, dynamic> json) => ActivityItem(
        id: json['id']?.toString() ?? '',
        type: json['type']?.toString() ?? '',
        description: _descriptionFromJson(json),
        userName: json['user_name']?.toString(),
        createdAt: json['created_at'] != null
            ? DateTime.tryParse(json['created_at'].toString())
            : null,
      );
}
