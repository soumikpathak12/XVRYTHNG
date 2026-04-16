import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/theme/app_colors.dart';
import '../../core/config/api_config.dart';
import '../../models/dashboard.dart';
import '../../models/employee.dart';
import '../../models/lead.dart';
import '../../services/cec_service.dart';
import '../../providers/leads_provider.dart';
import '../../services/employees_service.dart';
import '../../widgets/common/file_picker_bottom_sheet.dart';
import '../../widgets/common/status_badge.dart';

class LeadDetailScreen extends StatefulWidget {
  final int leadId;
  const LeadDetailScreen({super.key, required this.leadId});

  @override
  State<LeadDetailScreen> createState() => _LeadDetailScreenState();
}

class _LeadDetailScreenState extends State<LeadDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  final _noteCtrl = TextEditingController();
  final _cecService = CecService();

  bool _cecLoading = false;
  String? _cecMetaUpdatedAt;

  List<String> _pvPanelBrands = const [];
  List<String> _pvPanelModels = const [];
  List<String> _inverterBrands = const [];
  List<String> _inverterModels = const [];
  List<String> _inverterSeries = const [];
  List<String> _batteryBrands = const [];
  List<String> _batteryModels = const [];

  String? _pvPanelModelsForBrand;
  String? _inverterModelsForBrand;
  String? _inverterSeriesForKey;
  String? _batteryModelsForBrand;

  String get _routePrefix {
    final loc = GoRouterState.of(context).matchedLocation;
    if (loc.startsWith('/admin')) return '/admin';
    if (loc.startsWith('/dashboard')) return '/dashboard';
    if (loc.startsWith('/employee')) return '/employee';
    return '/admin';
  }

  void _handleBack() {
    final router = GoRouter.of(context);
    if (router.canPop()) {
      context.pop();
      return;
    }
    context.go('$_routePrefix/leads');
  }

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 4, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<LeadsProvider>().loadLeadDetail(widget.leadId);
    });
    _loadCecOptions();
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  bool get _leadHasPv => RegExp(
    r'PV',
    caseSensitive: false,
  ).hasMatch((_lead?.raw?['system_type'] ?? '').toString());

  bool get _leadHasBattery => RegExp(
    r'Battery',
    caseSensitive: false,
  ).hasMatch((_lead?.raw?['system_type'] ?? '').toString());

  String? _textValue(List<String> keys) {
    final lead = _lead;
    final raw = lead?.raw;
    if (raw == null) return null;
    for (final key in keys) {
      final value = raw[key];
      if (value == null) continue;
      final text = value.toString().trim();
      if (text.isNotEmpty) return text;
    }
    return null;
  }

  String? _normalizeOption(String? input, List<String> options) {
    final value = input?.trim() ?? '';
    if (value.isEmpty) return null;
    for (final option in options) {
      if (option.trim().toLowerCase() == value.toLowerCase()) return option;
    }
    return value;
  }

  Future<void> _loadCecOptions() async {
    final hasPv = _leadHasPv;
    final hasBattery = _leadHasBattery;
    if (!hasPv && !hasBattery) return;

    setState(() => _cecLoading = true);
    try {
      await _cecService.syncNow(force: false).catchError((_) {});
      final meta = await _cecService.getMeta().catchError((_) => null);
      if (!mounted) return;
      setState(() => _cecMetaUpdatedAt = meta?['updatedAt']?.toString());

      final results = await Future.wait([
        hasPv
            ? _cecService.getPvPanelBrands().catchError((_) => const <String>[])
            : Future.value(const <String>[]),
        hasPv
            ? _cecService.getInverterBrands().catchError(
                (_) => const <String>[],
              )
            : Future.value(const <String>[]),
        hasBattery
            ? _cecService.getBatteryBrands().catchError((_) => const <String>[])
            : Future.value(const <String>[]),
      ]);

      if (!mounted) return;
      setState(() {
        _pvPanelBrands = results[0] as List<String>;
        _inverterBrands = results[1] as List<String>;
        _batteryBrands = results[2] as List<String>;
      });

      await _loadDependentCecOptions();
    } catch (_) {
      // Keep screen usable even if CEC sync/fetch fails.
    } finally {
      if (mounted) setState(() => _cecLoading = false);
    }
  }

  Future<void> _loadDependentCecOptions() async {
    final hasPv = _leadHasPv;
    final hasBattery = _leadHasBattery;
    if (!hasPv && !hasBattery) return;

    final lead = _lead;
    if (lead == null) return;

    final pvPanelBrand = _textValue(['pv_panel_brand']);
    final pvPanelModel = _textValue(['pv_panel_model']);
    final inverterBrand = _textValue(['pv_inverter_brand']);
    final inverterModel = _textValue(['pv_inverter_model']);
    final batteryBrand = _textValue(['battery_brand']);

    if (hasPv && pvPanelBrand != null) {
      final brand = _normalizeOption(pvPanelBrand, _pvPanelBrands);
      if (brand != null) {
        final models = await _cecService
            .getPvPanelModels(brand)
            .catchError((_) => const <String>[]);
        if (!mounted) return;
        setState(() {
          _pvPanelModelsForBrand = brand;
          _pvPanelModels = models;
        });
        if (pvPanelModel != null) {
          final model = _normalizeOption(pvPanelModel, models);
          if (model != null) {
            final details = await _cecService
                .getPvPanelDetails(brand, model)
                .catchError((_) => null);
            if (details != null && mounted) {
              final watts = details['module_watts']?.toString().trim();
              if (watts != null &&
                  watts.isNotEmpty &&
                  _textValue(['pv_panel_module_watts']) == null) {
                setState(() {});
              }
            }
          }
        }
      }
    }

    if (hasPv && inverterBrand != null) {
      final brand = _normalizeOption(inverterBrand, _inverterBrands);
      if (brand != null) {
        final models = await _cecService
            .getInverterModels(brand)
            .catchError((_) => const <String>[]);
        if (!mounted) return;
        setState(() {
          _inverterModelsForBrand = brand;
          _inverterModels = models;
        });
        if (inverterModel != null) {
          final model = _normalizeOption(inverterModel, models);
          if (model != null) {
            final key = '$brand::$model';
            final series = await _cecService
                .getInverterSeries(brand, model)
                .catchError((_) => const <String>[]);
            if (!mounted) return;
            setState(() {
              _inverterSeriesForKey = key;
              _inverterSeries = series;
            });
          }
        }
      }
    }

    if (hasBattery && batteryBrand != null) {
      final brand = _normalizeOption(batteryBrand, _batteryBrands);
      if (brand != null) {
        final models = await _cecService
            .getBatteryModels(brand)
            .catchError((_) => const <String>[]);
        if (!mounted) return;
        setState(() {
          _batteryModelsForBrand = brand;
          _batteryModels = models;
        });
      }
    }
  }

  Lead? get _lead {
    final detail = context.read<LeadsProvider>().leadDetail;
    if (detail == null) return null;
    final raw = detail['lead'];
    if (raw is Lead) return raw;
    if (raw is Map) return Lead.fromJson(Map<String, dynamic>.from(raw));
    return null;
  }

  List<ActivityItem> get _activities {
    final detail = context.read<LeadsProvider>().leadDetail;
    if (detail == null) return [];
    final list = detail['activities'];
    if (list is List) {
      return list.map((e) {
        if (e is ActivityItem) return e;
        if (e is Map) {
          return ActivityItem.fromJson(Map<String, dynamic>.from(e));
        }
        return ActivityItem(id: '', type: '', description: e.toString());
      }).toList();
    }
    return [];
  }

  List<Map<String, dynamic>> get _documents {
    final detail = context.read<LeadsProvider>().leadDetail;
    if (detail == null) return [];
    final list = detail['documents'] ?? detail['data']?['documents'];
    if (list is List) {
      return list
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    }
    return [];
  }

  Future<void> _changeStage(Lead lead) async {
    final newStage = await showModalBottomSheet<String>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _StagePickerSheet(currentStage: lead.stage),
    );
    if (newStage == null || !mounted) return;
    try {
      await context.read<LeadsProvider>().updateLeadStage(lead.id, newStage);
      await context.read<LeadsProvider>().loadLeadDetail(widget.leadId);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to update stage: $e')));
      }
    }
  }

  Future<void> _call(String phone) async {
    final uri = Uri(scheme: 'tel', path: phone);
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  Future<void> _email(String email) async {
    final uri = Uri(scheme: 'mailto', path: email);
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  Future<void> _uploadDocument() async {
    final result = await showFilePickerSheet(context);
    if (result == null || !mounted) return;

    final messenger = ScaffoldMessenger.of(context);
    messenger.showSnackBar(
      SnackBar(content: Text('Uploading ${result.name}...')),
    );

    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          result.file.path,
          filename: result.name,
          contentType: result.mimeType == null
              ? null
              : DioMediaType.parse(result.mimeType!),
        ),
      });

      await context.read<LeadsProvider>().uploadLeadDocument(
        widget.leadId,
        formData,
      );

      if (!mounted) return;
      messenger.hideCurrentSnackBar();
      messenger.showSnackBar(
        const SnackBar(content: Text('Document uploaded successfully')),
      );
    } catch (e) {
      if (!mounted) return;
      messenger.hideCurrentSnackBar();
      messenger.showSnackBar(SnackBar(content: Text('Upload failed: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<LeadsProvider>(
      builder: (context, provider, _) {
        if (provider.detailLoading && provider.leadDetail == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Lead Detail')),
            body: const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            ),
          );
        }

        final detail = provider.leadDetail;
        if (detail == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Lead Detail')),
            body: const Center(child: Text('Lead not found')),
          );
        }

        final lead = _lead;
        if (lead == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Lead Detail')),
            body: const Center(child: Text('Lead data invalid')),
          );
        }

        return Scaffold(
          backgroundColor: AppColors.surface,
          body: NestedScrollView(
            headerSliverBuilder: (context, _) => [
              SliverAppBar(
                pinned: true,
                expandedHeight: 200,
                automaticallyImplyLeading: true,
                leading: IconButton(
                  icon: const Icon(Icons.arrow_back, color: AppColors.white),
                  onPressed: _handleBack,
                  tooltip: 'Back',
                ),
                iconTheme: const IconThemeData(color: AppColors.white),
                flexibleSpace: FlexibleSpaceBar(
                  background: _LeadHeader(
                    lead: lead,
                    onCall: lead.phone != null
                        ? () => _call(lead.phone!)
                        : null,
                    onEmail: lead.email != null
                        ? () => _email(lead.email!)
                        : null,
                    onChangeStage: () => _changeStage(lead),
                  ),
                ),
                title: Text(
                  lead.customerName,
                  style: const TextStyle(fontSize: 16),
                ),
                bottom: TabBar(
                  controller: _tabCtrl,
                  isScrollable: true,
                  labelColor: AppColors.white,
                  unselectedLabelColor: Colors.white70,
                  indicatorColor: AppColors.white,
                  indicatorWeight: 3,
                  tabAlignment: TabAlignment.start,
                  tabs: const [
                    Tab(text: 'Overview'),
                    Tab(text: 'Details'),
                    Tab(text: 'Activity'),
                    Tab(text: 'Documents'),
                  ],
                ),
              ),
            ],
            body: TabBarView(
              controller: _tabCtrl,
              children: [
                _OverviewTab(lead: lead),
                _DetailsTab(
                  lead: lead,
                  onSaved: () => context.read<LeadsProvider>().loadLeadDetail(
                    widget.leadId,
                  ),
                ),
                _ActivityTab(
                  activities: _activities,
                  noteController: _noteCtrl,
                  onAddNote: () {
                    if (_noteCtrl.text.trim().isEmpty) return;
                    _noteCtrl.clear();
                    ScaffoldMessenger.of(
                      context,
                    ).showSnackBar(const SnackBar(content: Text('Note added')));
                  },
                ),
                _DocumentsTab(documents: _documents, onUpload: _uploadDocument),
              ],
            ),
          ),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Lead header (inside FlexibleSpaceBar)
// ---------------------------------------------------------------------------
class _LeadHeader extends StatelessWidget {
  final Lead lead;
  final VoidCallback? onCall;
  final VoidCallback? onEmail;
  final VoidCallback onChangeStage;

  const _LeadHeader({
    required this.lead,
    this.onCall,
    this.onEmail,
    required this.onChangeStage,
  });

  @override
  Widget build(BuildContext context) {
    final currFmt = NumberFormat.currency(symbol: '\$', decimalDigits: 0);

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primary, Color(0xFF136363)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      padding: EdgeInsets.fromLTRB(
        20,
        MediaQuery.of(context).padding.top + 56,
        20,
        60,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          Row(
            children: [
              StatusBadge(
                label: Lead.stageLabels[lead.stage] ?? lead.stage,
                color: Colors.white.withOpacity(0.2),
                textColor: Colors.white,
              ),
              const SizedBox(width: 8),
              if (lead.value != null)
                Text(
                  currFmt.format(lead.value!),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              if (lead.email != null)
                _HeaderAction(
                  icon: Icons.email_outlined,
                  label: 'Email',
                  onTap: onEmail,
                ),
              if (lead.phone != null) ...[
                const SizedBox(width: 12),
                _HeaderAction(
                  icon: Icons.phone_outlined,
                  label: 'Call',
                  onTap: onCall,
                ),
              ],
              const SizedBox(width: 12),
              _HeaderAction(
                icon: Icons.swap_horiz_rounded,
                label: 'Stage',
                onTap: onChangeStage,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HeaderAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  const _HeaderAction({required this.icon, required this.label, this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.15),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: Colors.white),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Stage picker bottom sheet
// ---------------------------------------------------------------------------
class _StagePickerSheet extends StatelessWidget {
  final String currentStage;
  const _StagePickerSheet({required this.currentStage});

  @override
  Widget build(BuildContext context) {
    final maxHeight = MediaQuery.of(context).size.height * 0.75;
    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: maxHeight),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
          child: Column(
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Change Stage',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              Expanded(
                child: ListView(
                  children: Lead.stages.map((stage) {
                    final isSelected = stage == currentStage;
                    return ListTile(
                      title: Text(
                        Lead.stageLabels[stage] ?? stage,
                        style: TextStyle(
                          fontWeight: isSelected
                              ? FontWeight.w600
                              : FontWeight.normal,
                          color: isSelected
                              ? AppColors.primary
                              : AppColors.textPrimary,
                        ),
                      ),
                      trailing: isSelected
                          ? const Icon(
                              Icons.check_circle,
                              color: AppColors.primary,
                            )
                          : null,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      onTap: () => Navigator.pop(context, stage),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------
class _OverviewTab extends StatelessWidget {
  final Lead lead;
  const _OverviewTab({required this.lead});

  @override
  Widget build(BuildContext context) {
    final dateFmt = DateFormat('d MMM yyyy');
    final currFmt = NumberFormat.currency(symbol: '\$', decimalDigits: 0);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _DetailCard(
          title: 'Summary',
          children: [
            _DetailRow('Customer', lead.customerName),
            _DetailRow('Stage', Lead.stageLabels[lead.stage] ?? lead.stage),
            if (lead.value != null)
              _DetailRow('Value', currFmt.format(lead.value!)),
            if (lead.systemSize != null)
              _DetailRow('System Size', lead.systemSize!),
            if (lead.source != null) _DetailRow('Source', lead.source!),
            if (lead.assignedToName != null)
              _DetailRow('Assigned To', lead.assignedToName!),
            if (lead.createdAt != null)
              _DetailRow('Created', dateFmt.format(lead.createdAt!)),
          ],
        ),
        const SizedBox(height: 14),
        if (lead.notes != null && lead.notes!.isNotEmpty)
          _DetailCard(
            title: 'Notes',
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Text(
                  lead.notes!,
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
            ],
          ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Details tab
// ---------------------------------------------------------------------------
class _DetailsTab extends StatefulWidget {
  final Lead lead;
  final Future<void> Function() onSaved;
  const _DetailsTab({required this.lead, required this.onSaved});

  @override
  State<_DetailsTab> createState() => _DetailsTabState();
}

class _DetailsTabState extends State<_DetailsTab> {
  static const List<String> _systemTypeOptions = [
    'PV only',
    'PV + Battery',
    'Only Battery',
    'Only EV Charger',
    'PV + Battery + EV Charger',
    'Battery + EV Charger',
    'PV + EV Chargers',
  ];
  static const List<String> _houseStoreyOptions = [
    'Single',
    'Double',
    'Triple',
    'Other',
  ];
  static const List<String> _roofTypeOptions = [
    'Tin(Colorbond)',
    'Tin(Kliplock)',
    'Tile(Concrete)',
    'Tile(Terracotta)',
    'Flat',
    'Other',
  ];
  static const List<String> _meterPhaseOptions = ['Single', 'Double', 'Three'];
  static const List<String> _energyDistributorOptions = [
    'AusNet',
    'Powercor',
    'CitiPower',
    'United Energy',
    'Jemena',
  ];

  bool _editing = false;
  bool _saving = false;
  bool _cecLoading = false;

  late final TextEditingController _preApprovalCtrl;
  late final TextEditingController _energyRetailerCtrl;
  late final TextEditingController _nmiCtrl;
  late final TextEditingController _meterNumberCtrl;
  late final TextEditingController _pvSystemSizeCtrl;
  late final TextEditingController _pvInverterSizeCtrl;
  late final TextEditingController _pvInverterBrandCtrl;
  late final TextEditingController _pvInverterModelCtrl;
  late final TextEditingController _pvInverterSeriesCtrl;
  late final TextEditingController _pvInverterPowerCtrl;
  late final TextEditingController _pvInverterQuantityCtrl;
  late final TextEditingController _pvPanelBrandCtrl;
  late final TextEditingController _pvPanelModelCtrl;
  late final TextEditingController _pvPanelQuantityCtrl;
  late final TextEditingController _pvPanelModuleWattsCtrl;
  late final TextEditingController _evChargerBrandCtrl;
  late final TextEditingController _evChargerModelCtrl;
  late final TextEditingController _batterySizeCtrl;
  late final TextEditingController _batteryBrandCtrl;
  late final TextEditingController _batteryModelCtrl;
  String? _systemType;
  String? _houseStorey;
  String? _roofType;
  String? _meterPhase;
  String? _energyDistributor;
  String? _inspectorId;
  DateTime? _siteInspectionDateTime;
  bool? _accessSecondStorey;
  bool? _accessInverter;
  bool? _solarVicEligibility;
  List<Employee> _inspectors = const [];
  List<String> _pvPanelBrands = const [];
  List<String> _pvPanelModels = const [];
  List<String> _inverterBrands = const [];
  List<String> _inverterModels = const [];
  List<String> _inverterSeries = const [];
  List<String> _batteryBrands = const [];
  List<String> _batteryModels = const [];
  String? _pvPanelModelsForBrand;
  String? _inverterModelsForBrand;
  String? _inverterSeriesForKey;
  String? _batteryModelsForBrand;
  String? _cecMetaUpdatedAt;
  bool _cecRequested = false;

  final CecService _cecService = CecService();

  Lead get lead => widget.lead;

  dynamic _rawValue(String key) {
    return lead.raw?[key];
  }

  String? _textValue(List<String> keys) {
    for (final key in keys) {
      final value = _rawValue(key);
      if (value == null) continue;
      final text = value.toString().trim();
      if (text.isNotEmpty) return text;
    }
    return null;
  }

  String? _boolLabel(
    List<String> keys, {
    String trueLabel = 'Yes',
    String falseLabel = 'No',
  }) {
    final value = _textValue(keys);
    if (value == null) return null;
    final normalized = value.toLowerCase();
    if (normalized == '1' ||
        normalized == 'true' ||
        normalized == 'yes' ||
        normalized == 'y') {
      return trueLabel;
    }
    if (normalized == '0' ||
        normalized == 'false' ||
        normalized == 'no' ||
        normalized == 'n') {
      return falseLabel;
    }
    return null;
  }

  String? _formattedDateTime(List<String> keys) {
    final value = _textValue(keys);
    if (value == null) return null;
    final parsed = DateTime.tryParse(value);
    if (parsed == null) return value;
    return DateFormat('d MMM yyyy, h:mm a').format(parsed);
  }

  List<Widget> _rows(List<_FieldView> fields) {
    final rows = <Widget>[];
    for (final field in fields) {
      if (field.value == null || field.value!.isEmpty) continue;
      rows.add(_DetailRow(field.label, field.value!));
    }
    return rows;
  }

  bool? _toBool(String? value) {
    if (value == null) return null;
    final normalized = value.toLowerCase();
    if (normalized == '1' ||
        normalized == 'true' ||
        normalized == 'yes' ||
        normalized == 'y') {
      return true;
    }
    if (normalized == '0' ||
        normalized == 'false' ||
        normalized == 'no' ||
        normalized == 'n') {
      return false;
    }
    return null;
  }

  @override
  void initState() {
    super.initState();
    _preApprovalCtrl = TextEditingController();
    _energyRetailerCtrl = TextEditingController();
    _nmiCtrl = TextEditingController();
    _meterNumberCtrl = TextEditingController();
    _pvSystemSizeCtrl = TextEditingController();
    _pvInverterSizeCtrl = TextEditingController();
    _pvInverterBrandCtrl = TextEditingController();
    _pvInverterModelCtrl = TextEditingController();
    _pvInverterSeriesCtrl = TextEditingController();
    _pvInverterPowerCtrl = TextEditingController();
    _pvInverterQuantityCtrl = TextEditingController();
    _pvPanelBrandCtrl = TextEditingController();
    _pvPanelModelCtrl = TextEditingController();
    _pvPanelQuantityCtrl = TextEditingController();
    _pvPanelModuleWattsCtrl = TextEditingController();
    _evChargerBrandCtrl = TextEditingController();
    _evChargerModelCtrl = TextEditingController();
    _batterySizeCtrl = TextEditingController();
    _batteryBrandCtrl = TextEditingController();
    _batteryModelCtrl = TextEditingController();
    _syncFromLead();
    _loadInspectors();
    _ensureCecDataLoaded();
  }

  @override
  void didUpdateWidget(covariant _DetailsTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!_editing && !_saving && oldWidget.lead.raw != widget.lead.raw) {
      _syncFromLead();
      _ensureCecDataLoaded();
    }
  }

  @override
  void dispose() {
    _preApprovalCtrl.dispose();
    _energyRetailerCtrl.dispose();
    _nmiCtrl.dispose();
    _meterNumberCtrl.dispose();
    _pvSystemSizeCtrl.dispose();
    _pvInverterSizeCtrl.dispose();
    _pvInverterBrandCtrl.dispose();
    _pvInverterModelCtrl.dispose();
    _pvInverterSeriesCtrl.dispose();
    _pvInverterPowerCtrl.dispose();
    _pvInverterQuantityCtrl.dispose();
    _pvPanelBrandCtrl.dispose();
    _pvPanelModelCtrl.dispose();
    _pvPanelQuantityCtrl.dispose();
    _pvPanelModuleWattsCtrl.dispose();
    _evChargerBrandCtrl.dispose();
    _evChargerModelCtrl.dispose();
    _batterySizeCtrl.dispose();
    _batteryBrandCtrl.dispose();
    _batteryModelCtrl.dispose();
    super.dispose();
  }

  String _safeDisplay(String? value) {
    if (value == null || value.trim().isEmpty) return '--';
    return value.trim();
  }

  String _boolDisplay(
    bool? value, {
    String trueLabel = 'Yes',
    String falseLabel = 'No',
  }) {
    if (value == null) return '--';
    return value ? trueLabel : falseLabel;
  }

  String? _normalize(String value) {
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }

  bool _hasSystemTypeToken(String token) {
    final systemType = (_systemType ?? '').toLowerCase();
    return systemType.contains(token.toLowerCase());
  }

  bool get _hasPvFields => _hasSystemTypeToken('pv');
  bool get _hasEvFields => _hasSystemTypeToken('ev');
  bool get _hasBatteryFields => _hasSystemTypeToken('battery');

  String? _currentValue(List<String> keys) => _textValue(keys);

  String? _normalizeOption(String? input, List<String> options) {
    final value = input?.trim() ?? '';
    if (value.isEmpty) return null;
    for (final option in options) {
      if (option.trim().toLowerCase() == value.toLowerCase()) return option;
    }
    return value;
  }

  String? _dropdownValue(TextEditingController controller) {
    final value = controller.text.trim();
    return value.isEmpty ? null : value;
  }

  Future<void> _ensureCecDataLoaded() async {
    if (!_hasPvFields && !_hasBatteryFields) return;
    if (_cecLoading) return;

    setState(() => _cecLoading = true);
    try {
      await _cecService.syncNow(force: false).catchError((_) {});
      final meta = await _cecService.getMeta().catchError((_) => null);
      if (mounted) {
        setState(() => _cecMetaUpdatedAt = meta?['updatedAt']?.toString());
      }

      final results = await Future.wait([
        _hasPvFields
            ? _cecService.getPvPanelBrands().catchError((_) => const <String>[])
            : Future.value(const <String>[]),
        _hasPvFields
            ? _cecService.getInverterBrands().catchError(
                (_) => const <String>[],
              )
            : Future.value(const <String>[]),
        _hasBatteryFields
            ? _cecService.getBatteryBrands().catchError((_) => const <String>[])
            : Future.value(const <String>[]),
      ]);

      if (!mounted) return;
      setState(() {
        _pvPanelBrands = results[0] as List<String>;
        _inverterBrands = results[1] as List<String>;
        _batteryBrands = results[2] as List<String>;
      });

      await _loadDependentCecOptions();
    } catch (_) {
      // Keep the screen functional if CEC is unavailable.
    } finally {
      if (mounted) setState(() => _cecLoading = false);
    }
  }

  Future<void> _loadDependentCecOptions() async {
    if (_hasPvFields) {
      final panelBrand = _normalizeOption(
        _pvPanelBrandCtrl.text,
        _pvPanelBrands,
      );
      if (panelBrand != null && panelBrand != _pvPanelModelsForBrand) {
        final models = await _cecService
            .getPvPanelModels(panelBrand)
            .catchError((_) => const <String>[]);
        if (!mounted) return;
        setState(() {
          _pvPanelModelsForBrand = panelBrand;
          _pvPanelModels = models;
        });
      }

      final panelModel = _normalizeOption(
        _pvPanelModelCtrl.text,
        _pvPanelModels,
      );
      if (panelBrand != null &&
          panelModel != null &&
          _pvPanelModuleWattsCtrl.text.trim().isEmpty) {
        final details = await _cecService
            .getPvPanelDetails(panelBrand, panelModel)
            .catchError((_) => null);
        if (!mounted) return;
        final watts = details?['module_watts']?.toString().trim();
        if (watts != null && watts.isNotEmpty) {
          _pvPanelModuleWattsCtrl.text = watts;
        }
      }

      final inverterBrand = _normalizeOption(
        _pvInverterBrandCtrl.text,
        _inverterBrands,
      );
      if (inverterBrand != null && inverterBrand != _inverterModelsForBrand) {
        final models = await _cecService
            .getInverterModels(inverterBrand)
            .catchError((_) => const <String>[]);
        if (!mounted) return;
        setState(() {
          _inverterModelsForBrand = inverterBrand;
          _inverterModels = models;
          _inverterSeries = const [];
          _inverterSeriesForKey = null;
        });
      }

      final model = _normalizeOption(
        _pvInverterModelCtrl.text,
        _inverterModels,
      );
      if (inverterBrand != null && model != null) {
        final key = '$inverterBrand::$model';
        if (key != _inverterSeriesForKey) {
          final series = await _cecService
              .getInverterSeries(inverterBrand, model)
              .catchError((_) => const <String>[]);
          if (!mounted) return;
          setState(() {
            _inverterSeriesForKey = key;
            _inverterSeries = series;
          });
          if (_pvInverterSeriesCtrl.text.trim().isEmpty && series.isNotEmpty) {
            _pvInverterSeriesCtrl.text = series.first;
          }
          if (_pvInverterPowerCtrl.text.trim().isEmpty) {
            final details = await _cecService
                .getInverterDetails(inverterBrand, model)
                .catchError((_) => null);
            if (!mounted) return;
            final power = details?['power_kw']?.toString().trim();
            if (power != null && power.isNotEmpty) {
              _pvInverterPowerCtrl.text = power;
            }
          }
        }
      }
    }

    if (_hasBatteryFields) {
      final batteryBrand = _normalizeOption(
        _batteryBrandCtrl.text,
        _batteryBrands,
      );
      if (batteryBrand != null && batteryBrand != _batteryModelsForBrand) {
        final models = await _cecService
            .getBatteryModels(batteryBrand)
            .catchError((_) => const <String>[]);
        if (!mounted) return;
        setState(() {
          _batteryModelsForBrand = batteryBrand;
          _batteryModels = models;
        });
      }
    }

    final panelQty = double.tryParse(_pvPanelQuantityCtrl.text.trim());
    final panelWatts = double.tryParse(_pvPanelModuleWattsCtrl.text.trim());
    if (panelQty != null &&
        panelWatts != null &&
        panelQty > 0 &&
        panelWatts > 0) {
      final computedKw = (panelQty * panelWatts) / 1000;
      _pvSystemSizeCtrl.text = computedKw
          .toStringAsFixed(3)
          .replaceFirst(RegExp(r'0+$'), '')
          .replaceFirst(RegExp(r'\.$'), '');
    }

    final inverterPower = double.tryParse(_pvInverterPowerCtrl.text.trim());
    final inverterQty = double.tryParse(_pvInverterQuantityCtrl.text.trim());
    if (inverterPower != null &&
        inverterQty != null &&
        inverterPower > 0 &&
        inverterQty > 0) {
      final computedKw = inverterPower * inverterQty;
      _pvInverterSizeCtrl.text = computedKw
          .toStringAsFixed(3)
          .replaceFirst(RegExp(r'0+$'), '')
          .replaceFirst(RegExp(r'\.$'), '');
    }
  }

  Future<void> _loadInspectors() async {
    try {
      final inspectors = await EmployeesService().listEmployees(
        status: 'active',
      );
      if (!mounted) return;
      setState(() => _inspectors = inspectors);
    } catch (_) {
      // Keep details screen functional if inspectors fail to load.
    }
  }

  void _syncFromLead() {
    _systemType = _textValue(['system_type']);
    _houseStorey = _textValue(['house_storey']);
    _roofType = _textValue(['roof_type']);
    _meterPhase = _textValue(['meter_phase']);
    _preApprovalCtrl.text = _textValue(['pre_approval_reference_no']) ?? '';
    _energyRetailerCtrl.text = _textValue(['energy_retailer']) ?? '';
    _energyDistributor = _textValue(['energy_distributor']);
    _nmiCtrl.text = _textValue(['nmi_number']) ?? '';
    _meterNumberCtrl.text = _textValue(['meter_number']) ?? '';
    _inspectorId = _textValue(['inspector_id']);
    _siteInspectionDateTime = _parseInspectionDateTime([
      'site_inspection_scheduled_at',
      'site_inspection_date',
    ]);
    _accessSecondStorey = _toBool(_textValue(['access_to_second_storey']));
    _accessInverter = _toBool(_textValue(['access_to_inverter']));
    _solarVicEligibility = _toBool(_textValue(['solar_vic_eligibility']));
    _pvSystemSizeCtrl.text = _textValue(['pv_system_size_kw']) ?? '';
    _pvInverterSizeCtrl.text = _textValue(['pv_inverter_size_kw']) ?? '';
    _pvInverterBrandCtrl.text = _textValue(['pv_inverter_brand']) ?? '';
    _pvInverterModelCtrl.text = _textValue(['pv_inverter_model']) ?? '';
    _pvInverterSeriesCtrl.text = _textValue(['pv_inverter_series']) ?? '';
    _pvInverterPowerCtrl.text = _textValue(['pv_inverter_power_kw']) ?? '';
    _pvInverterQuantityCtrl.text = _textValue(['pv_inverter_quantity']) ?? '';
    _pvPanelBrandCtrl.text = _textValue(['pv_panel_brand']) ?? '';
    _pvPanelModelCtrl.text = _textValue(['pv_panel_model']) ?? '';
    _pvPanelQuantityCtrl.text = _textValue(['pv_panel_quantity']) ?? '';
    _pvPanelModuleWattsCtrl.text = _textValue(['pv_panel_module_watts']) ?? '';
    _evChargerBrandCtrl.text = _textValue(['ev_charger_brand']) ?? '';
    _evChargerModelCtrl.text = _textValue(['ev_charger_model']) ?? '';
    _batterySizeCtrl.text = _textValue(['battery_size_kwh']) ?? '';
    _batteryBrandCtrl.text = _textValue(['battery_brand']) ?? '';
    _batteryModelCtrl.text = _textValue(['battery_model']) ?? '';
  }

  Future<void> _saveDetails() async {
    if (_saving) return;
    setState(() => _saving = true);
    try {
      final payload = <String, dynamic>{
        'system_type': _systemType,
        'house_storey': _houseStorey,
        'roof_type': _roofType,
        'meter_phase': _meterPhase,
        'inspector_id': (_inspectorId == null || _inspectorId!.isEmpty)
            ? null
            : int.tryParse(_inspectorId!),
        'site_inspection_date': _siteInspectionDateTime == null
            ? null
            : _toMySqlDateTime(_siteInspectionDateTime!),
        'access_to_second_storey': _accessSecondStorey,
        'access_to_inverter': _accessInverter,
        'pre_approval_reference_no': _normalize(_preApprovalCtrl.text),
        'energy_retailer': _normalize(_energyRetailerCtrl.text),
        'energy_distributor': _energyDistributor,
        'solar_vic_eligibility': _solarVicEligibility,
        'nmi_number': _normalize(_nmiCtrl.text),
        'meter_number': _normalize(_meterNumberCtrl.text),
        'pv_system_size_kw': _normalize(_pvSystemSizeCtrl.text),
        'pv_inverter_size_kw': _normalize(_pvInverterSizeCtrl.text),
        'pv_inverter_brand': _normalize(_pvInverterBrandCtrl.text),
        'pv_inverter_model': _normalize(_pvInverterModelCtrl.text),
        'pv_inverter_series': _normalize(_pvInverterSeriesCtrl.text),
        'pv_inverter_power_kw': _normalize(_pvInverterPowerCtrl.text),
        'pv_inverter_quantity': _normalize(_pvInverterQuantityCtrl.text),
        'pv_panel_brand': _normalize(_pvPanelBrandCtrl.text),
        'pv_panel_model': _normalize(_pvPanelModelCtrl.text),
        'pv_panel_quantity': _normalize(_pvPanelQuantityCtrl.text),
        'pv_panel_module_watts': _normalize(_pvPanelModuleWattsCtrl.text),
        'ev_charger_brand': _normalize(_evChargerBrandCtrl.text),
        'ev_charger_model': _normalize(_evChargerModelCtrl.text),
        'battery_size_kwh': _normalize(_batterySizeCtrl.text),
        'battery_brand': _normalize(_batteryBrandCtrl.text),
        'battery_model': _normalize(_batteryModelCtrl.text),
      };
      await context.read<LeadsProvider>().updateLead(lead.id, payload);
      await widget.onSaved();
      if (!mounted) return;
      setState(() => _editing = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Lead details updated')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to update details: $e')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _editableField(
    String label,
    TextEditingController ctrl, {
    TextInputType? keyboardType,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: ctrl,
            keyboardType: keyboardType,
            decoration: InputDecoration(
              isDense: true,
              filled: true,
              fillColor: AppColors.surface,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(
                  color: AppColors.border.withOpacity(0.5),
                ),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(
                  color: AppColors.border.withOpacity(0.5),
                ),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 10,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _dropdownField({
    required String label,
    required String? value,
    required List<String> options,
    required ValueChanged<String?> onChanged,
  }) {
    final normalizedValue = (value != null && value.isNotEmpty) ? value : null;
    final mergedOptions = [...options];
    if (normalizedValue != null && !mergedOptions.contains(normalizedValue)) {
      mergedOptions.insert(0, normalizedValue);
    }
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 6),
          DropdownButtonFormField<String>(
            isExpanded: true,
            value: normalizedValue,
            items: [
              const DropdownMenuItem<String>(
                value: null,
                child: Text('Select'),
              ),
              ...mergedOptions.map(
                (option) => DropdownMenuItem<String>(
                  value: option,
                  child: Text(option),
                ),
              ),
            ],
            onChanged: onChanged,
            decoration: InputDecoration(
              isDense: true,
              filled: true,
              fillColor: AppColors.surface,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(
                  color: AppColors.border.withOpacity(0.5),
                ),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(
                  color: AppColors.border.withOpacity(0.5),
                ),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 6,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _searchableDropdownField({
    required String label,
    required TextEditingController controller,
    required List<String> options,
    required ValueChanged<String?> onSelected,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 6),
          RawAutocomplete<String>(
            initialValue: TextEditingValue(text: controller.text),
            optionsBuilder: (textEditingValue) {
              final query = textEditingValue.text.trim().toLowerCase();
              if (options.isEmpty) return const Iterable<String>.empty();
              if (query.isEmpty) return options.take(30);
              return options
                  .where((option) => option.toLowerCase().contains(query))
                  .take(30);
            },
            displayStringForOption: (option) => option,
            onSelected: (selection) {
              controller
                ..text = selection
                ..selection = TextSelection.collapsed(offset: selection.length);
              onSelected(selection);
            },
            fieldViewBuilder:
                (context, textEditingController, focusNode, onFieldSubmitted) {
              if (textEditingController.text != controller.text) {
                textEditingController.value = TextEditingValue(
                  text: controller.text,
                  selection: TextSelection.collapsed(
                    offset: controller.text.length,
                  ),
                );
              }
              return TextFormField(
                controller: textEditingController,
                focusNode: focusNode,
                onFieldSubmitted: (_) => onFieldSubmitted(),
                onChanged: (value) {
                  controller
                    ..text = value
                    ..selection = TextSelection.collapsed(offset: value.length);
                },
                decoration: InputDecoration(
                  isDense: true,
                  filled: true,
                  fillColor: AppColors.surface,
                  suffixIcon: const Icon(Icons.search, size: 18),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide(
                      color: AppColors.border.withOpacity(0.5),
                    ),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide(
                      color: AppColors.border.withOpacity(0.5),
                    ),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                ),
              );
            },
            optionsViewBuilder: (context, onOptionSelected, filteredOptions) {
              final list = filteredOptions.toList(growable: false);
              if (list.isEmpty) return const SizedBox.shrink();
              return Align(
                alignment: Alignment.topLeft,
                child: Material(
                  elevation: 8,
                  borderRadius: BorderRadius.circular(10),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxHeight: 260),
                    child: SizedBox(
                      width: MediaQuery.of(context).size.width - 80,
                      child: ListView.separated(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        shrinkWrap: true,
                        itemCount: list.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final option = list[index];
                          return ListTile(
                            dense: true,
                            title: Text(option, style: const TextStyle(fontSize: 14)),
                            onTap: () => onOptionSelected(option),
                          );
                        },
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _inspectorDropdown() {
    final value = (_inspectorId != null && _inspectorId!.isNotEmpty)
        ? _inspectorId
        : null;
    final knownIds = _inspectors.map((e) => e.id.toString()).toSet();
    final includeCurrentUnknown = value != null && !knownIds.contains(value);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Inspector',
            style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 6),
          DropdownButtonFormField<String>(
            value: value,
            items: [
              const DropdownMenuItem<String>(
                value: null,
                child: Text('Select inspector'),
              ),
              if (includeCurrentUnknown)
                DropdownMenuItem<String>(
                  value: value,
                  child: Text('Current inspector ($value)'),
                ),
              ..._inspectors.map(
                (e) => DropdownMenuItem<String>(
                  value: e.id.toString(),
                  child: Text(e.fullName.trim()),
                ),
              ),
            ],
            onChanged: (next) => setState(() => _inspectorId = next),
            decoration: InputDecoration(
              isDense: true,
              filled: true,
              fillColor: AppColors.surface,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(
                  color: AppColors.border.withOpacity(0.5),
                ),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(
                  color: AppColors.border.withOpacity(0.5),
                ),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 6,
              ),
            ),
          ),
        ],
      ),
    );
  }

  DateTime? _parseInspectionDateTime(List<String> keys) {
    for (final key in keys) {
      final value = _rawValue(key);
      if (value == null) continue;
      final text = value.toString().trim();
      if (text.isEmpty) continue;
      final parsed = DateTime.tryParse(text);
      if (parsed != null) return parsed;
    }
    return null;
  }

  String _toMySqlDateTime(DateTime dt) {
    final yyyy = dt.year.toString().padLeft(4, '0');
    final mm = dt.month.toString().padLeft(2, '0');
    final dd = dt.day.toString().padLeft(2, '0');
    final hh = dt.hour.toString().padLeft(2, '0');
    final mi = dt.minute.toString().padLeft(2, '0');
    return '$yyyy-$mm-$dd $hh:$mi:00';
  }

  Future<void> _pickInspectionDateTime() async {
    final now = DateTime.now();
    final pickedDate = await showDatePicker(
      context: context,
      firstDate: DateTime(now.year - 2),
      lastDate: DateTime(now.year + 5),
      initialDate: _siteInspectionDateTime ?? now,
    );
    if (pickedDate == null || !mounted) return;
    final pickedTime = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_siteInspectionDateTime ?? now),
    );
    if (pickedTime == null || !mounted) return;
    setState(() {
      _siteInspectionDateTime = DateTime(
        pickedDate.year,
        pickedDate.month,
        pickedDate.day,
        pickedTime.hour,
        pickedTime.minute,
      );
    });
  }

  Widget _inspectionDateTimeField() {
    final label = _siteInspectionDateTime == null
        ? 'Not scheduled'
        : DateFormat('d MMM yyyy, h:mm a').format(_siteInspectionDateTime!);
    final hasValue = _siteInspectionDateTime != null;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Site inspection date',
            style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 6),
          InkWell(
            onTap: _pickInspectionDateTime,
            borderRadius: BorderRadius.circular(10),
            child: InputDecorator(
              decoration: InputDecoration(
                isDense: true,
                filled: true,
                fillColor: AppColors.surface,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(
                    color: AppColors.border.withOpacity(0.5),
                  ),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(
                    color: AppColors.border.withOpacity(0.5),
                  ),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                suffixIcon: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (hasValue)
                      IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        tooltip: 'Clear date',
                        onPressed: () =>
                            setState(() => _siteInspectionDateTime = null),
                      ),
                    IconButton(
                      icon: const Icon(Icons.calendar_month_outlined, size: 20),
                      tooltip: 'Pick date',
                      onPressed: _pickInspectionDateTime,
                    ),
                  ],
                ),
                suffixIconConstraints: const BoxConstraints(minHeight: 24),
              ),
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  color: hasValue
                      ? AppColors.textPrimary
                      : AppColors.textSecondary,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _boolDropdown(
    String label,
    bool? value,
    ValueChanged<bool?> onChanged, {
    String trueLabel = 'Yes',
    String falseLabel = 'No',
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 6),
          DropdownButtonFormField<bool?>(
            value: value,
            items: [
              const DropdownMenuItem<bool?>(value: null, child: Text('Select')),
              DropdownMenuItem<bool?>(value: true, child: Text(trueLabel)),
              DropdownMenuItem<bool?>(value: false, child: Text(falseLabel)),
            ],
            onChanged: onChanged,
            decoration: InputDecoration(
              isDense: true,
              filled: true,
              fillColor: AppColors.surface,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(
                  color: AppColors.border.withOpacity(0.5),
                ),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(
                  color: AppColors.border.withOpacity(0.5),
                ),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 6,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dateFmt = DateFormat('d MMM yyyy, h:mm a');
    final systemType = _textValue(['system_type']);
    final houseStorey = _textValue(['house_storey']);
    final roofType = _textValue(['roof_type']);
    final meterPhase = _textValue(['meter_phase']);
    final accessSecondStorey = _boolLabel(['access_to_second_storey']);
    final accessInverter = _boolLabel(['access_to_inverter']);
    final preApprovalRef = _textValue(['pre_approval_reference_no']);
    final energyRetailer = _textValue(['energy_retailer']);
    final energyDistributor = _textValue(['energy_distributor']);
    final solarVicEligibility = _boolLabel(
      ['solar_vic_eligibility'],
      trueLabel: 'Eligible',
      falseLabel: 'Not eligible',
    );
    final nmiNumber = _textValue(['nmi_number']);
    final meterNumber = _textValue(['meter_number']);
    final pvSystemSize = _textValue(['pv_system_size_kw']);
    final pvInverterSize = _textValue(['pv_inverter_size_kw']);
    final pvInverterBrand = _textValue(['pv_inverter_brand']);
    final pvInverterModel = _textValue(['pv_inverter_model']);
    final pvInverterSeries = _textValue(['pv_inverter_series']);
    final pvInverterPower = _textValue(['pv_inverter_power_kw']);
    final pvInverterQty = _textValue(['pv_inverter_quantity']);
    final pvPanelBrand = _textValue(['pv_panel_brand']);
    final pvPanelModel = _textValue(['pv_panel_model']);
    final pvPanelQty = _textValue(['pv_panel_quantity']);
    final pvPanelWatts = _textValue(['pv_panel_module_watts']);
    final evBrand = _textValue(['ev_charger_brand']);
    final evModel = _textValue(['ev_charger_model']);
    final batterySize = _textValue(['battery_size_kwh']);
    final batteryBrand = _textValue(['battery_brand']);
    final batteryModel = _textValue(['battery_model']);
    final inspectionDate = _formattedDateTime([
      'site_inspection_scheduled_at',
      'site_inspection_date',
    ]);
    final inspectorName = _textValue(['inspector_name', 'assigned_to_name']);
    final salesSegment = _textValue(['sales_segment']);
    final salesSegmentLabel = salesSegment == 'b2c'
        ? 'Residential (B2C)'
        : salesSegment == 'b2b'
        ? 'Commercial (B2B)'
        : salesSegment;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Align(
          alignment: Alignment.centerRight,
          child: _editing
              ? Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextButton(
                      onPressed: _saving
                          ? null
                          : () => setState(() => _editing = false),
                      child: const Text('Cancel'),
                    ),
                    const SizedBox(width: 8),
                    FilledButton(
                      onPressed: _saving ? null : _saveDetails,
                      child: _saving
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Save'),
                    ),
                  ],
                )
              : OutlinedButton.icon(
                  onPressed: () => setState(() => _editing = true),
                  icon: const Icon(Icons.edit_outlined, size: 18),
                  label: const Text('Edit details'),
                ),
        ),
        const SizedBox(height: 10),
        _DetailCard(
          title: 'Contact Information',
          children: [
            _DetailRow('Name', lead.customerName),
            if (lead.email != null) _DetailRow('Email', lead.email!),
            if (lead.phone != null) _DetailRow('Phone', lead.phone!),
            if (lead.suburb != null) _DetailRow('Suburb', lead.suburb!),
            if (lead.address != null) _DetailRow('Address', lead.address!),
            if (salesSegmentLabel != null)
              _DetailRow('Sales channel', salesSegmentLabel),
          ],
        ),
        const SizedBox(height: 14),
        _DetailCard(
          title: 'Project Information',
          children: [
            if (lead.systemSize != null)
              _DetailRow('System Size', lead.systemSize!),
            if (lead.source != null) _DetailRow('Source', lead.source!),
            _DetailRow('Stage', Lead.stageLabels[lead.stage] ?? lead.stage),
            if (lead.lastActivity != null)
              _DetailRow('Last Activity', lead.lastActivity!),
          ],
        ),
        const SizedBox(height: 14),
        _DetailCard(
          title: 'System Information',
          children: _editing
              ? [
                  _dropdownField(
                    label: 'System type',
                    value: _systemType,
                    options: _systemTypeOptions,
                    onChanged: (next) {
                      setState(() => _systemType = next);
                      _ensureCecDataLoaded();
                    },
                  ),
                  _inspectorDropdown(),
                  _inspectionDateTimeField(),
                  if (_cecLoading)
                    const Padding(
                      padding: EdgeInsets.only(top: 8),
                      child: LinearProgressIndicator(minHeight: 2),
                    ),
                ]
              : [
                  _DetailRow('System type', _safeDisplay(systemType)),
                  _DetailRow('Inspector', _safeDisplay(inspectorName)),
                ],
        ),
        if (_editing && _hasPvFields) ...[
          const SizedBox(height: 14),
          _DetailCard(
            title: 'PV System Details',
            children: [
              _editableField(
                'System size (kW)',
                _pvSystemSizeCtrl,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
              ),
              _editableField(
                'Inverter size (kW)',
                _pvInverterSizeCtrl,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
              ),
              _searchableDropdownField(
                label: 'Inverter brand',
                controller: _pvInverterBrandCtrl,
                options: _inverterBrands,
                onSelected: (next) {
                  setState(() {
                    _pvInverterBrandCtrl.text = next ?? '';
                    _pvInverterModelCtrl.clear();
                    _pvInverterSeriesCtrl.clear();
                    _pvInverterPowerCtrl.clear();
                    _pvInverterSizeCtrl.clear();
                    _inverterModels = const [];
                    _inverterSeries = const [];
                    _inverterModelsForBrand = null;
                    _inverterSeriesForKey = null;
                  });
                  _ensureCecDataLoaded();
                },
              ),
              _searchableDropdownField(
                label: 'Inverter model',
                controller: _pvInverterModelCtrl,
                options: _inverterModels,
                onSelected: (next) {
                  setState(() {
                    _pvInverterModelCtrl.text = next ?? '';
                    _pvInverterSeriesCtrl.clear();
                    _pvInverterPowerCtrl.clear();
                    _pvInverterSizeCtrl.clear();
                    _inverterSeries = const [];
                    _inverterSeriesForKey = null;
                  });
                  _ensureCecDataLoaded();
                },
              ),
              _searchableDropdownField(
                label: 'Inverter series',
                controller: _pvInverterSeriesCtrl,
                options: _inverterSeries,
                onSelected: (next) =>
                    setState(() => _pvInverterSeriesCtrl.text = next ?? ''),
              ),
              _editableField(
                'Inverter power (kW)',
                _pvInverterPowerCtrl,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
              ),
              _editableField(
                'Number of inverter',
                _pvInverterQuantityCtrl,
                keyboardType: TextInputType.number,
              ),
              _searchableDropdownField(
                label: 'Panel brand',
                controller: _pvPanelBrandCtrl,
                options: _pvPanelBrands,
                onSelected: (next) {
                  setState(() {
                    _pvPanelBrandCtrl.text = next ?? '';
                    _pvPanelModelCtrl.clear();
                    _pvPanelModuleWattsCtrl.clear();
                    _pvPanelModels = const [];
                    _pvPanelModelsForBrand = null;
                  });
                  _ensureCecDataLoaded();
                },
              ),
              _searchableDropdownField(
                label: 'Panel model',
                controller: _pvPanelModelCtrl,
                options: _pvPanelModels,
                onSelected: (next) {
                  setState(() {
                    _pvPanelModelCtrl.text = next ?? '';
                    _pvPanelModuleWattsCtrl.clear();
                    _pvSystemSizeCtrl.clear();
                  });
                  _ensureCecDataLoaded();
                },
              ),
              _editableField(
                'Quantity of panel',
                _pvPanelQuantityCtrl,
                keyboardType: TextInputType.number,
              ),
              _editableField(
                'Panel module (W)',
                _pvPanelModuleWattsCtrl,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
              ),
            ],
          ),
        ],
        if (_editing && _hasEvFields) ...[
          const SizedBox(height: 14),
          _DetailCard(
            title: 'EV Charger Details',
            children: [
              _editableField('EV charger brand', _evChargerBrandCtrl),
              _editableField('EV charger model', _evChargerModelCtrl),
            ],
          ),
        ],
        if (_editing && _hasBatteryFields) ...[
          const SizedBox(height: 14),
          _DetailCard(
            title: 'Battery Details',
            children: [
              _editableField(
                'Battery size (kWh)',
                _batterySizeCtrl,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
              ),
              _searchableDropdownField(
                label: 'Battery brand',
                controller: _batteryBrandCtrl,
                options: _batteryBrands,
                onSelected: (next) {
                  setState(() {
                    _batteryBrandCtrl.text = next ?? '';
                    _batteryModelCtrl.clear();
                    _batteryModels = const [];
                    _batteryModelsForBrand = null;
                  });
                  _ensureCecDataLoaded();
                },
              ),
              _searchableDropdownField(
                label: 'Battery model',
                controller: _batteryModelCtrl,
                options: _batteryModels,
                onSelected: (next) =>
                    setState(() => _batteryModelCtrl.text = next ?? ''),
              ),
            ],
          ),
        ],
        const SizedBox(height: 14),
        _DetailCard(
          title: 'Property Information',
          children: _editing
              ? [
                  _dropdownField(
                    label: 'House storey',
                    value: _houseStorey,
                    options: _houseStoreyOptions,
                    onChanged: (next) => setState(() => _houseStorey = next),
                  ),
                  _dropdownField(
                    label: 'Roof type',
                    value: _roofType,
                    options: _roofTypeOptions,
                    onChanged: (next) => setState(() => _roofType = next),
                  ),
                  _dropdownField(
                    label: 'Meter phase',
                    value: _meterPhase,
                    options: _meterPhaseOptions,
                    onChanged: (next) => setState(() => _meterPhase = next),
                  ),
                  _boolDropdown(
                    'Access to 2nd storey',
                    _accessSecondStorey,
                    (value) => setState(() => _accessSecondStorey = value),
                  ),
                  _boolDropdown(
                    'Access to inverter',
                    _accessInverter,
                    (value) => setState(() => _accessInverter = value),
                  ),
                ]
              : [
                  _DetailRow('House storey', _safeDisplay(houseStorey)),
                  _DetailRow('Roof type', _safeDisplay(roofType)),
                  _DetailRow('Meter phase', _safeDisplay(meterPhase)),
                  _DetailRow(
                    'Access to 2nd storey',
                    _boolDisplay(_toBool(accessSecondStorey)),
                  ),
                  _DetailRow(
                    'Access to inverter',
                    _boolDisplay(_toBool(accessInverter)),
                  ),
                ],
        ),
        const SizedBox(height: 14),
        _DetailCard(
          title: 'Utility Information',
          children: _editing
              ? [
                  _editableField('Pre-approval ref no', _preApprovalCtrl),
                  _editableField('Energy retailer', _energyRetailerCtrl),
                  _dropdownField(
                    label: 'Energy distributor',
                    value: _energyDistributor,
                    options: _energyDistributorOptions,
                    onChanged: (next) =>
                        setState(() => _energyDistributor = next),
                  ),
                  _boolDropdown(
                    'Solar Vic eligibility',
                    _solarVicEligibility,
                    (value) => setState(() => _solarVicEligibility = value),
                    trueLabel: 'Eligible',
                    falseLabel: 'Not eligible',
                  ),
                  _editableField('NMI number', _nmiCtrl),
                  _editableField('Meter number', _meterNumberCtrl),
                ]
              : [
                  _DetailRow(
                    'Pre-approval ref no',
                    _safeDisplay(preApprovalRef),
                  ),
                  _DetailRow('Energy retailer', _safeDisplay(energyRetailer)),
                  _DetailRow(
                    'Energy distributor',
                    _safeDisplay(energyDistributor),
                  ),
                  _DetailRow(
                    'Solar Vic eligibility',
                    _boolDisplay(
                      _toBool(solarVicEligibility),
                      trueLabel: 'Eligible',
                      falseLabel: 'Not eligible',
                    ),
                  ),
                  _DetailRow('NMI number', _safeDisplay(nmiNumber)),
                  _DetailRow('Meter number', _safeDisplay(meterNumber)),
                ],
        ),
        if (_editing) ...[
          const SizedBox(height: 10),
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton(
              onPressed: _saving ? null : _saveDetails,
              child: _saving
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Save details'),
            ),
          ),
        ],
        if (_rows([
          _FieldView('PV system size (kW)', pvSystemSize),
          _FieldView('PV inverter size (kW)', pvInverterSize),
          _FieldView('Inverter brand', pvInverterBrand),
          _FieldView('Inverter model', pvInverterModel),
          _FieldView('Inverter series', pvInverterSeries),
          _FieldView('Inverter power (kW)', pvInverterPower),
          _FieldView('Number of inverter', pvInverterQty),
          _FieldView('Panel brand', pvPanelBrand),
          _FieldView('Panel model', pvPanelModel),
          _FieldView('Quantity of panel', pvPanelQty),
          _FieldView('Panel module (W)', pvPanelWatts),
        ]).isNotEmpty) ...[
          const SizedBox(height: 14),
          _DetailCard(
            title: 'PV System Details',
            children: _rows([
              _FieldView('PV system size (kW)', pvSystemSize),
              _FieldView('PV inverter size (kW)', pvInverterSize),
              _FieldView('Inverter brand', pvInverterBrand),
              _FieldView('Inverter model', pvInverterModel),
              _FieldView('Inverter series', pvInverterSeries),
              _FieldView('Inverter power (kW)', pvInverterPower),
              _FieldView('Number of inverter', pvInverterQty),
              _FieldView('Panel brand', pvPanelBrand),
              _FieldView('Panel model', pvPanelModel),
              _FieldView('Quantity of panel', pvPanelQty),
              _FieldView('Panel module (W)', pvPanelWatts),
            ]),
          ),
        ],
        if (_rows([
          _FieldView('EV charger brand', evBrand),
          _FieldView('EV charger model', evModel),
        ]).isNotEmpty) ...[
          const SizedBox(height: 14),
          _DetailCard(
            title: 'EV Charger Details',
            children: _rows([
              _FieldView('EV charger brand', evBrand),
              _FieldView('EV charger model', evModel),
            ]),
          ),
        ],
        if (_rows([
          _FieldView('Battery size (kWh)', batterySize),
          _FieldView('Battery brand', batteryBrand),
          _FieldView('Battery model', batteryModel),
        ]).isNotEmpty) ...[
          const SizedBox(height: 14),
          _DetailCard(
            title: 'Battery Details',
            children: _rows([
              _FieldView('Battery size (kWh)', batterySize),
              _FieldView('Battery brand', batteryBrand),
              _FieldView('Battery model', batteryModel),
            ]),
          ),
        ],
        if (_rows([
          _FieldView('Date & time', inspectionDate),
          _FieldView('Inspector', inspectorName),
        ]).isNotEmpty) ...[
          const SizedBox(height: 14),
          _DetailCard(
            title: 'Inspection Details',
            children: _rows([
              _FieldView('Date & time', inspectionDate),
              _FieldView('Inspector', inspectorName),
            ]),
          ),
        ],
        const SizedBox(height: 14),
        _DetailCard(
          title: 'Timestamps',
          children: [
            if (lead.createdAt != null)
              _DetailRow('Created', dateFmt.format(lead.createdAt!)),
            if (lead.updatedAt != null)
              _DetailRow('Updated', dateFmt.format(lead.updatedAt!)),
          ],
        ),
      ],
    );
  }
}

class _FieldView {
  final String label;
  final String? value;
  const _FieldView(this.label, this.value);
}

// ---------------------------------------------------------------------------
// Activity tab
// ---------------------------------------------------------------------------
class _ActivityTab extends StatelessWidget {
  final List<ActivityItem> activities;
  final TextEditingController noteController;
  final VoidCallback onAddNote;

  const _ActivityTab({
    required this.activities,
    required this.noteController,
    required this.onAddNote,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: activities.isEmpty
              ? const Center(
                  child: Text(
                    'No activity yet',
                    style: TextStyle(color: AppColors.textSecondary),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                  itemCount: activities.length,
                  itemBuilder: (_, i) => _TimelineItem(
                    activity: activities[i],
                    isLast: i == activities.length - 1,
                  ),
                ),
        ),
        Container(
          padding: const EdgeInsets.fromLTRB(16, 8, 8, 8),
          decoration: BoxDecoration(
            color: AppColors.white,
            border: Border(
              top: BorderSide(color: AppColors.divider.withOpacity(0.6)),
            ),
          ),
          child: SafeArea(
            top: false,
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: noteController,
                    decoration: InputDecoration(
                      hintText: 'Add a note...',
                      hintStyle: const TextStyle(
                        color: AppColors.textSecondary,
                      ),
                      filled: true,
                      fillColor: AppColors.surface,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 10,
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                    ),
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => onAddNote(),
                  ),
                ),
                const SizedBox(width: 4),
                IconButton(
                  onPressed: onAddNote,
                  icon: const Icon(Icons.send_rounded),
                  color: AppColors.primary,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _TimelineItem extends StatelessWidget {
  final ActivityItem activity;
  final bool isLast;

  const _TimelineItem({required this.activity, this.isLast = false});

  IconData get _icon {
    switch (activity.type) {
      case 'lead_created':
        return Icons.person_add_rounded;
      case 'stage_changed':
        return Icons.swap_horiz_rounded;
      case 'note_added':
      case 'note':
        return Icons.sticky_note_2_rounded;
      case 'log':
        return Icons.history_rounded;
      case 'call':
        return Icons.phone_rounded;
      case 'email':
        return Icons.email_rounded;
      case 'document':
        return Icons.attach_file_rounded;
      default:
        return Icons.circle;
    }
  }

  Color get _color {
    switch (activity.type) {
      case 'lead_created':
        return AppColors.success;
      case 'stage_changed':
        return AppColors.info;
      case 'note_added':
      case 'note':
        return AppColors.warning;
      case 'log':
        return AppColors.primary;
      default:
        return AppColors.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final timeFmt = DateFormat('d MMM, h:mm a');

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 40,
            child: Column(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: _color.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(_icon, size: 16, color: _color),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      color: AppColors.divider,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    activity.description,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      if (activity.userName != null) ...[
                        Text(
                          activity.userName!,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          width: 3,
                          height: 3,
                          decoration: const BoxDecoration(
                            color: AppColors.textSecondary,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                      ],
                      if (activity.createdAt != null)
                        Text(
                          timeFmt.format(activity.createdAt!),
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textSecondary,
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Documents tab
// ---------------------------------------------------------------------------
class _DocumentsTab extends StatelessWidget {
  final List<Map<String, dynamic>> documents;
  final VoidCallback onUpload;

  const _DocumentsTab({required this.documents, required this.onUpload});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Row(
            children: [
              const Text(
                'Documents',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
              const Spacer(),
              FilledButton.tonalIcon(
                onPressed: onUpload,
                icon: const Icon(Icons.upload_file, size: 18),
                label: const Text('Upload'),
              ),
            ],
          ),
        ),
        Expanded(
          child: documents.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.folder_open_rounded,
                        size: 48,
                        color: AppColors.disabled,
                      ),
                      SizedBox(height: 8),
                      Text(
                        'No documents yet',
                        style: TextStyle(color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 4,
                  ),
                  itemCount: documents.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) => _DocumentTile(doc: documents[i]),
                ),
        ),
      ],
    );
  }
}

class _DocumentTile extends StatelessWidget {
  final Map<String, dynamic> doc;
  const _DocumentTile({required this.doc});

  IconData get _icon {
    final name = (doc['file_name'] ?? doc['filename'] ?? doc['name'] ?? '')
        .toString()
        .toLowerCase();
    if (name.endsWith('.pdf')) return Icons.picture_as_pdf_rounded;
    if (name.endsWith('.jpg') ||
        name.endsWith('.png') ||
        name.endsWith('.jpeg')) {
      return Icons.image_rounded;
    }
    if (name.endsWith('.doc') || name.endsWith('.docx')) {
      return Icons.description_rounded;
    }
    return Icons.insert_drive_file_rounded;
  }

  @override
  Widget build(BuildContext context) {
    final name =
        doc['file_name'] ?? doc['filename'] ?? doc['name'] ?? 'Unknown file';
    final storagePath = (doc['storage_url'] ?? doc['url'] ?? '')
        .toString()
        .trim();
    final openUrl = storagePath.isEmpty
        ? null
        : Uri.parse(
            storagePath.startsWith('http')
                ? storagePath
                : '${ApiConfig.baseUrl}$storagePath',
          );
    final dateFmt = DateFormat('d MMM yyyy');
    final uploadedAt = doc['created_at'] != null
        ? dateFmt.format(DateTime.parse(doc['created_at'].toString()))
        : '';

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: openUrl == null ? null : () => launchUrl(openUrl),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.border.withOpacity(0.5)),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(_icon, size: 22, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name.toString(),
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (uploadedAt.isNotEmpty)
                      Text(
                        uploadedAt,
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.textSecondary,
                        ),
                      ),
                  ],
                ),
              ),
              Icon(
                openUrl == null
                    ? Icons.insert_drive_file
                    : Icons.download_rounded,
                size: 20,
                color: AppColors.textSecondary,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Detail card & row helpers
// ---------------------------------------------------------------------------
class _DetailCard extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _DetailCard({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const Divider(height: 20),
          ...children,
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _DetailRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
