/// Project Management Dashboard data model.
/// Maps to backend `/api/pm-dashboard` response.
class PmDashboard {
  final int activeInhouse;
  final int activeRetailer;
  final int totalActive;
  final int upcomingInstallations;
  final int complianceAlerts;
  final double totalProjectValue;
  final double totalRevenue;
  final double totalCosts;
  final double grossMargin;
  final double avgProjectValue;
  final Map<String, int> projectsByStatus;
  final List<ComplianceAlert> alerts;
  final List<Map<String, dynamic>> recentInhouse;
  final List<Map<String, dynamic>> recentRetailer;

  const PmDashboard({
    required this.activeInhouse,
    required this.activeRetailer,
    required this.totalActive,
    required this.upcomingInstallations,
    required this.complianceAlerts,
    required this.totalProjectValue,
    required this.totalRevenue,
    required this.totalCosts,
    required this.grossMargin,
    required this.avgProjectValue,
    required this.projectsByStatus,
    required this.alerts,
    required this.recentInhouse,
    required this.recentRetailer,
  });

  factory PmDashboard.fromJson(Map<String, dynamic> json) {
    double d(dynamic v) {
      if (v == null) return 0;
      if (v is double) return v;
      if (v is int) return v.toDouble();
      return double.tryParse(v.toString()) ?? 0;
    }

    // Parse projectsByStatus
    final statusMap = <String, int>{};
    final rawStatus = json['projectsByStatus'] ?? json['projects_by_status'];
    if (rawStatus is Map) {
      for (final entry in rawStatus.entries) {
        statusMap[entry.key.toString()] =
            int.tryParse(entry.value.toString()) ?? 0;
      }
    }

    // Parse compliance alerts
    final alertsList = <ComplianceAlert>[];
    final rawAlerts = json['complianceAlerts'] ?? json['compliance_alerts'];
    if (rawAlerts is List) {
      for (final e in rawAlerts) {
        if (e is Map) {
          alertsList.add(
              ComplianceAlert.fromJson(Map<String, dynamic>.from(e)));
        }
      }
    }

    // Parse int (might come as string)
    int i(dynamic v) => v is int ? v : int.tryParse(v?.toString() ?? '') ?? 0;

    return PmDashboard(
      activeInhouse: i(json['activeInhouse'] ?? json['active_inhouse']),
      activeRetailer: i(json['activeRetailer'] ?? json['active_retailer']),
      totalActive: i(json['totalActive'] ?? json['total_active']),
      upcomingInstallations:
          i(json['upcomingInstallations'] ?? json['upcoming_installations']),
      complianceAlerts: rawAlerts is List ? rawAlerts.length : 0,
      totalProjectValue:
          d(json['totalProjectValue'] ?? json['total_project_value']),
      totalRevenue: d(json['totalRevenue'] ?? json['total_revenue']),
      totalCosts: d(json['totalCosts'] ?? json['total_costs']),
      grossMargin: d(json['grossMargin'] ?? json['gross_margin']),
      avgProjectValue:
          d(json['avgProjectValue'] ?? json['avg_project_value']),
      projectsByStatus: statusMap,
      alerts: alertsList,
      recentInhouse: _toMapList(
          json['recentInhouse'] ?? json['recent_inhouse']),
      recentRetailer: _toMapList(
          json['recentRetailer'] ?? json['recent_retailer']),
    );
  }

  static List<Map<String, dynamic>> _toMapList(dynamic v) {
    if (v is! List) return [];
    return v
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }
}

class ComplianceAlert {
  final int? projectId;
  final String message;
  final String severity; // 'warning' | 'critical'
  final String? projectName;

  const ComplianceAlert({
    this.projectId,
    required this.message,
    required this.severity,
    this.projectName,
  });

  factory ComplianceAlert.fromJson(Map<String, dynamic> json) {
    return ComplianceAlert(
      projectId: json['project_id'] ?? json['projectId'],
      message: json['message'] ?? '',
      severity: json['severity'] ?? 'warning',
      projectName: json['project_name'] ?? json['projectName'],
    );
  }
}
