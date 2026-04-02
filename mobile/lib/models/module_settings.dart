/// Module settings model for feature toggles.
/// Maps to backend `/api/company/module-settings` response.
class ModuleSettings {
  final Map<String, bool> toggles;
  final List<ModuleDefinition> definitions;
  final String coreDescription;

  const ModuleSettings({
    required this.toggles,
    required this.definitions,
    required this.coreDescription,
  });

  factory ModuleSettings.fromJson(Map<String, dynamic> json) {
    final rawToggles = json['toggles'];
    final toggleMap = <String, bool>{};
    if (rawToggles is Map) {
      for (final entry in rawToggles.entries) {
        toggleMap[entry.key.toString()] = entry.value == true;
      }
    }

    final defs = <ModuleDefinition>[];
    final rawDefs = json['definitions'];
    if (rawDefs is List) {
      for (final e in rawDefs) {
        if (e is Map) {
          defs.add(
              ModuleDefinition.fromJson(Map<String, dynamic>.from(e)));
        }
      }
    }

    return ModuleSettings(
      toggles: toggleMap,
      definitions: defs,
      coreDescription:
          json['coreDescription'] ?? json['core_description'] ?? '',
    );
  }

  bool isEnabled(String moduleId) => toggles[moduleId] != false;
}

class ModuleDefinition {
  final String id;
  final String label;
  final String description;

  const ModuleDefinition({
    required this.id,
    required this.label,
    required this.description,
  });

  factory ModuleDefinition.fromJson(Map<String, dynamic> json) {
    return ModuleDefinition(
      id: json['id'] ?? '',
      label: json['label'] ?? '',
      description: json['description'] ?? '',
    );
  }
}
