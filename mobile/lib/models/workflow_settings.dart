/// Workflow/pipeline configuration model.
/// Maps to backend `/api/company/workflow-settings` response.
class WorkflowSettings {
  final PipelineConfig sales;
  final PipelineConfig projectManagement;

  const WorkflowSettings({
    required this.sales,
    required this.projectManagement,
  });

  factory WorkflowSettings.fromJson(Map<String, dynamic> json) {
    return WorkflowSettings(
      sales: PipelineConfig.fromJson(
          json['sales'] is Map ? Map<String, dynamic>.from(json['sales']) : {}),
      projectManagement: PipelineConfig.fromJson(
          json['project_management'] is Map
              ? Map<String, dynamic>.from(json['project_management'])
              : {}),
    );
  }

  Map<String, dynamic> toJson() => {
        'sales': sales.toJson(),
        'project_management': projectManagement.toJson(),
      };
}

class PipelineConfig {
  final List<PipelineStage> stages;

  const PipelineConfig({required this.stages});

  factory PipelineConfig.fromJson(Map<String, dynamic> json) {
    final rawStages = json['stages'];
    final stageList = <PipelineStage>[];
    if (rawStages is List) {
      for (final e in rawStages) {
        if (e is Map) {
          stageList.add(
              PipelineStage.fromJson(Map<String, dynamic>.from(e)));
        }
      }
    }
    return PipelineConfig(stages: stageList);
  }

  Map<String, dynamic> toJson() => {
        'stages': stages.map((s) => s.toJson()).toList(),
      };

  /// Active (enabled) stage keys in order.
  List<String> get activeKeys =>
      stages.where((s) => s.enabled).map((s) => s.key).toList();

  /// Active stage labels in order.
  List<String> get activeLabels =>
      stages.where((s) => s.enabled).map((s) => s.label).toList();
}

class PipelineStage {
  final String key;
  final String label;
  final bool enabled;
  final bool builtin;

  const PipelineStage({
    required this.key,
    required this.label,
    this.enabled = true,
    this.builtin = false,
  });

  factory PipelineStage.fromJson(Map<String, dynamic> json) {
    return PipelineStage(
      key: json['key'] ?? '',
      label: json['label'] ?? '',
      enabled: json['enabled'] != false,
      builtin: json['builtin'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
        'key': key,
        'label': label,
        'enabled': enabled,
        'builtin': builtin,
      };

  PipelineStage copyWith({String? label, bool? enabled}) => PipelineStage(
        key: key,
        label: label ?? this.label,
        enabled: enabled ?? this.enabled,
        builtin: builtin,
      );
}
