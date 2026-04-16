import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_colors.dart';
import '../../services/cec_service.dart';
import '../../services/leads_service.dart';
import '../../services/projects_service.dart';
import '../../widgets/common/loading_overlay.dart';

class ProjectEditScreen extends StatefulWidget {
  final int projectId;
  final Map<String, dynamic> initialData;

  const ProjectEditScreen({
    super.key,
    required this.projectId,
    required this.initialData,
  });

  @override
  State<ProjectEditScreen> createState() => _ProjectEditScreenState();
}

class _ProjectEditScreenState extends State<ProjectEditScreen> {
  final _formKey = GlobalKey<FormState>();
  final _service = ProjectsService();
  final _leadsService = LeadsService();
  final _cecService = CecService();

  static const List<String> _systemTypes = [
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

  final _customerNameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _suburbCtrl = TextEditingController();
  final _systemSizeCtrl = TextEditingController();
  final _valueAmountCtrl = TextEditingController();
  final _postInstallRefCtrl = TextEditingController();
  final _preApprovalRefCtrl = TextEditingController();
  final _energyRetailerCtrl = TextEditingController();
  final _energyDistributorCtrl = TextEditingController();
  final _nmiNumberCtrl = TextEditingController();
  final _meterNumberCtrl = TextEditingController();
  final _pvSystemSizeCtrl = TextEditingController();
  final _pvInverterSizeCtrl = TextEditingController();
  final _pvInverterBrandCtrl = TextEditingController();
  final _pvInverterModelCtrl = TextEditingController();
  final _pvInverterSeriesCtrl = TextEditingController();
  final _pvInverterPowerCtrl = TextEditingController();
  final _pvInverterQuantityCtrl = TextEditingController();
  final _pvPanelBrandCtrl = TextEditingController();
  final _pvPanelModelCtrl = TextEditingController();
  final _pvPanelQuantityCtrl = TextEditingController();
  final _pvPanelModuleWattsCtrl = TextEditingController();
  final _evChargerBrandCtrl = TextEditingController();
  final _evChargerModelCtrl = TextEditingController();
  final _batterySizeCtrl = TextEditingController();
  final _batteryBrandCtrl = TextEditingController();
  final _batteryModelCtrl = TextEditingController();

  String _systemType = '';
  String _houseStorey = '';
  String _roofType = '';
  String _meterPhase = '';
  bool? _accessToSecondStorey;
  bool? _accessToInverter;
  bool? _solarVicEligibility;

  DateTime? _expectedCompletionDate;
  bool _saving = false;
  bool _cecLoading = false;
  String? _error;
  int? _leadId;

  List<String> _inverterBrands = const [];
  List<String> _inverterModels = const [];
  List<String> _inverterSeries = const [];
  List<String> _pvPanelBrands = const [];
  List<String> _pvPanelModels = const [];
  List<String> _batteryBrands = const [];
  List<String> _batteryModels = const [];

  String? _inverterModelsForBrand;
  String? _inverterSeriesForKey;
  String? _pvPanelModelsForBrand;
  String? _batteryModelsForBrand;

  @override
  void initState() {
    super.initState();
    final d = widget.initialData;
    String read(List<String> keys) {
      for (final key in keys) {
        final value = d[key];
        if (value == null) continue;
        final text = value.toString();
        if (text.trim().isNotEmpty) return text;
      }
      return '';
    }

    bool? parseBool(dynamic value) {
      if (value == null) return null;
      final normalized = value.toString().trim().toLowerCase();
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

    _leadId = int.tryParse(read(['lead_id']));
    _customerNameCtrl.text = read(['customer_name', 'customerName']);
    _emailCtrl.text = read(['email', 'lead_email']);
    _phoneCtrl.text = read(['phone', 'lead_phone']);
    _suburbCtrl.text = read(['suburb', 'lead_suburb']);
    _systemSizeCtrl.text = read(['system_size_kw', 'lead_system_size_kw']);
    _valueAmountCtrl.text = (d['value_amount'] ?? d['lead_value_amount'] ?? '')
        .toString();
    _systemType = read(['system_type', 'lead_system_type']);
    _houseStorey = read(['house_storey', 'lead_house_storey']);
    _roofType = read(['roof_type', 'lead_roof_type']);
    _meterPhase = read(['meter_phase', 'lead_meter_phase']);
    _accessToSecondStorey = parseBool(
      d['access_to_second_storey'] ?? d['lead_access_to_second_storey'],
    );
    _accessToInverter = parseBool(
      d['access_to_inverter'] ?? d['lead_access_to_inverter'],
    );
    _preApprovalRefCtrl.text = read([
      'pre_approval_reference_no',
      'lead_pre_approval_reference_no',
    ]);
    _energyRetailerCtrl.text = read([
      'energy_retailer',
      'lead_energy_retailer',
    ]);
    _energyDistributorCtrl.text = read([
      'energy_distributor',
      'lead_energy_distributor',
    ]);
    _solarVicEligibility = parseBool(
      d['solar_vic_eligibility'] ?? d['lead_solar_vic_eligibility'],
    );
    _nmiNumberCtrl.text = read(['nmi_number', 'lead_nmi_number']);
    _meterNumberCtrl.text = read(['meter_number', 'lead_meter_number']);
    _pvSystemSizeCtrl.text = read([
      'pv_system_size_kw',
      'lead_pv_system_size_kw',
    ]);
    _pvInverterSizeCtrl.text = read([
      'pv_inverter_size_kw',
      'lead_pv_inverter_size_kw',
    ]);
    _pvInverterBrandCtrl.text = read([
      'pv_inverter_brand',
      'lead_pv_inverter_brand',
    ]);
    _pvInverterModelCtrl.text = read([
      'pv_inverter_model',
      'lead_pv_inverter_model',
    ]);
    _pvInverterSeriesCtrl.text = read([
      'pv_inverter_series',
      'lead_pv_inverter_series',
    ]);
    _pvInverterPowerCtrl.text = read([
      'pv_inverter_power_kw',
      'lead_pv_inverter_power_kw',
    ]);
    _pvInverterQuantityCtrl.text = read([
      'pv_inverter_quantity',
      'lead_pv_inverter_quantity',
    ]);
    _pvPanelBrandCtrl.text = read(['pv_panel_brand', 'lead_pv_panel_brand']);
    _pvPanelModelCtrl.text = read(['pv_panel_model', 'lead_pv_panel_model']);
    _pvPanelQuantityCtrl.text = read([
      'pv_panel_quantity',
      'lead_pv_panel_quantity',
    ]);
    _pvPanelModuleWattsCtrl.text = read([
      'pv_panel_module_watts',
      'lead_pv_panel_module_watts',
    ]);
    _evChargerBrandCtrl.text = read([
      'ev_charger_brand',
      'lead_ev_charger_brand',
    ]);
    _evChargerModelCtrl.text = read([
      'ev_charger_model',
      'lead_ev_charger_model',
    ]);
    _batterySizeCtrl.text = read(['battery_size_kwh', 'lead_battery_size_kwh']);
    _batteryBrandCtrl.text = read(['battery_brand', 'lead_battery_brand']);
    _batteryModelCtrl.text = read(['battery_model', 'lead_battery_model']);
    _postInstallRefCtrl.text = read(['post_install_reference_no']);
    _expectedCompletionDate = _tryParseDate(d['expected_completion_date']);

    _ensureCecDataLoaded();
  }

  String? _normalizeOption(String? input, List<String> options) {
    final value = input?.trim() ?? '';
    if (value.isEmpty) return null;
    for (final option in options) {
      if (option.trim().toLowerCase() == value.toLowerCase()) return option;
    }
    return value;
  }

  Future<void> _ensureCecDataLoaded() async {
    if (!_hasPvFields && !_hasBatteryFields) return;
    if (_cecLoading) return;

    setState(() => _cecLoading = true);
    try {
      await _cecService.syncNow(force: false).catchError((_) {});
      final results = await Future.wait([
        _hasPvFields
            ? _cecService.getPvPanelBrands().catchError((_) => const <String>[])
            : Future.value(const <String>[]),
        _hasPvFields
            ? _cecService.getInverterBrands().catchError((_) => const <String>[])
            : Future.value(const <String>[]),
        _hasBatteryFields
            ? _cecService.getBatteryBrands().catchError((_) => const <String>[])
            : Future.value(const <String>[]),
      ]);

      if (!mounted) return;
      setState(() {
        _pvPanelBrands = results[0];
        _inverterBrands = results[1];
        _batteryBrands = results[2];
      });

      await _loadDependentCecOptions();
    } finally {
      if (mounted) setState(() => _cecLoading = false);
    }
  }

  Future<void> _loadDependentCecOptions() async {
    if (_hasPvFields) {
      final inverterBrand = _normalizeOption(_pvInverterBrandCtrl.text, _inverterBrands);
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

      final inverterModel = _normalizeOption(_pvInverterModelCtrl.text, _inverterModels);
      if (inverterBrand != null && inverterModel != null) {
        final key = '$inverterBrand::$inverterModel';
        if (key != _inverterSeriesForKey) {
          final series = await _cecService
              .getInverterSeries(inverterBrand, inverterModel)
              .catchError((_) => const <String>[]);
          if (!mounted) return;
          setState(() {
            _inverterSeriesForKey = key;
            _inverterSeries = series;
          });
        }
      }

      final panelBrand = _normalizeOption(_pvPanelBrandCtrl.text, _pvPanelBrands);
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
    }

    if (_hasBatteryFields) {
      final batteryBrand = _normalizeOption(_batteryBrandCtrl.text, _batteryBrands);
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
  }

  DateTime? _tryParseDate(dynamic v) {
    if (v == null) return null;
    final s = v.toString().trim();
    if (s.isEmpty) return null;
    // Accept both `YYYY-MM-DD` and full timestamps.
    return DateTime.tryParse(s) ?? DateTime.tryParse('${s}T00:00:00');
  }

  @override
  void dispose() {
    _customerNameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _suburbCtrl.dispose();
    _systemSizeCtrl.dispose();
    _valueAmountCtrl.dispose();
    _postInstallRefCtrl.dispose();
    _preApprovalRefCtrl.dispose();
    _energyRetailerCtrl.dispose();
    _energyDistributorCtrl.dispose();
    _nmiNumberCtrl.dispose();
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

  Future<void> _pickExpectedCompletionDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _expectedCompletionDate ?? now,
      firstDate: DateTime(now.year - 5),
      lastDate: DateTime(now.year + 10),
    );
    if (picked == null) return;
    setState(() => _expectedCompletionDate = picked);
  }

  String? _required(String? v) {
    if (v == null || v.trim().isEmpty) return 'Required';
    return null;
  }

  String? _normalize(String value) {
    final text = value.trim();
    return text.isEmpty ? null : text;
  }

  bool _hasSystemTypeToken(String token) {
    return _systemType.toLowerCase().contains(token.toLowerCase());
  }

  bool get _hasPvFields => _hasSystemTypeToken('pv');
  bool get _hasEvFields => _hasSystemTypeToken('ev');
  bool get _hasBatteryFields => _hasSystemTypeToken('battery');

  String? get _energyDistributorDropdownValue {
    final value = _energyDistributorCtrl.text.trim();
    if (value.isEmpty) return null;
    return _energyDistributorOptions.contains(value) ? value : null;
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });

    final payload = <String, dynamic>{
      'customer_name': _customerNameCtrl.text.trim(),
      'email': _emailCtrl.text.trim().isEmpty ? null : _emailCtrl.text.trim(),
      'phone': _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
      'suburb': _suburbCtrl.text.trim().isEmpty
          ? null
          : _suburbCtrl.text.trim(),
      'system_size_kw': _systemSizeCtrl.text.trim().isEmpty
          ? null
          : double.tryParse(_systemSizeCtrl.text.trim()),
      'value_amount': _valueAmountCtrl.text.trim().isEmpty
          ? null
          : double.tryParse(_valueAmountCtrl.text.trim()),
      'post_install_reference_no': _postInstallRefCtrl.text.trim().isEmpty
          ? null
          : _postInstallRefCtrl.text.trim(),
      'expected_completion_date': _expectedCompletionDate == null
          ? null
          : DateFormat('yyyy-MM-dd').format(_expectedCompletionDate!),
    };

    try {
      await _service.updateProject(widget.projectId, payload);
      if (_leadId != null) {
        await _leadsService.updateLead(_leadId!, {
          'customer_name': _customerNameCtrl.text.trim(),
          'email': _normalize(_emailCtrl.text),
          'phone': _normalize(_phoneCtrl.text),
          'suburb': _normalize(_suburbCtrl.text),
          'system_size_kw': _systemSizeCtrl.text.trim().isEmpty
              ? null
              : double.tryParse(_systemSizeCtrl.text.trim()),
          'value_amount': _valueAmountCtrl.text.trim().isEmpty
              ? null
              : double.tryParse(_valueAmountCtrl.text.trim()),
          'system_type': _systemType.isEmpty ? null : _systemType,
          'house_storey': _houseStorey.isEmpty ? null : _houseStorey,
          'roof_type': _roofType.isEmpty ? null : _roofType,
          'meter_phase': _meterPhase.isEmpty ? null : _meterPhase,
          'access_to_second_storey': _accessToSecondStorey,
          'access_to_inverter': _accessToInverter,
          'pre_approval_reference_no': _normalize(_preApprovalRefCtrl.text),
          'energy_retailer': _normalize(_energyRetailerCtrl.text),
          'energy_distributor': _normalize(_energyDistributorCtrl.text),
          'solar_vic_eligibility': _solarVicEligibility,
          'nmi_number': _normalize(_nmiNumberCtrl.text),
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
        });
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Project updated successfully'),
          backgroundColor: AppColors.success,
        ),
      );
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Edit Project'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: FilledButton(
              onPressed: _saving ? null : _save,
              style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
              child: _saving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Save'),
            ),
          ),
        ],
      ),
      body: LoadingOverlay(
        isLoading: _saving,
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
            children: [
              if (_error != null) ...[
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.danger.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.error_outline,
                        color: AppColors.danger,
                        size: 20,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _error!,
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.danger,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],
              _card([
                const _SectionTitle('Customer Details'),
                _field(
                  controller: _customerNameCtrl,
                  label: 'Customer Name',
                  icon: Icons.person_outline,
                  validator: _required,
                ),
                const SizedBox(height: 16),
                _field(
                  controller: _emailCtrl,
                  label: 'Email',
                  icon: Icons.email_outlined,
                  keyboard: TextInputType.emailAddress,
                ),
                const SizedBox(height: 16),
                _field(
                  controller: _phoneCtrl,
                  label: 'Phone',
                  icon: Icons.phone_outlined,
                  keyboard: TextInputType.phone,
                ),
                const SizedBox(height: 16),
                _field(
                  controller: _suburbCtrl,
                  label: 'Suburb',
                  icon: Icons.location_on_outlined,
                ),
              ]),
              const SizedBox(height: 16),
              _card([
                const _SectionTitle('System Specifications'),
                _dropdownField(
                  label: 'System Type',
                  icon: Icons.settings_input_component_outlined,
                  value: _systemType.isEmpty ? null : _systemType,
                  options: _systemTypes,
                  onChanged: (v) {
                    setState(() {
                      _systemType = v ?? '';
                      _inverterBrands = const [];
                      _inverterModels = const [];
                      _inverterSeries = const [];
                      _pvPanelBrands = const [];
                      _pvPanelModels = const [];
                      _batteryBrands = const [];
                      _batteryModels = const [];
                      _inverterModelsForBrand = null;
                      _inverterSeriesForKey = null;
                      _pvPanelModelsForBrand = null;
                      _batteryModelsForBrand = null;
                    });
                    _ensureCecDataLoaded();
                  },
                ),
                const SizedBox(height: 16),
                _field(
                  controller: _systemSizeCtrl,
                  label: 'System Size (kW)',
                  icon: Icons.solar_power_outlined,
                  keyboard: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                  ],
                ),
                const SizedBox(height: 16),
                _field(
                  controller: _valueAmountCtrl,
                  label: 'Estimated Value (AUD)',
                  icon: Icons.attach_money_outlined,
                  keyboard: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                  ],
                ),
              ]),
              if (_hasPvFields) ...[
                const SizedBox(height: 16),
                _card([
                  const _SectionTitle('PV System Details'),
                  if (_cecLoading)
                    const Padding(
                      padding: EdgeInsets.only(bottom: 12),
                      child: LinearProgressIndicator(minHeight: 2),
                    ),
                  _field(
                    controller: _pvSystemSizeCtrl,
                    label: 'PV System Size (kW)',
                    icon: Icons.solar_power_outlined,
                    keyboard: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _field(
                    controller: _pvInverterSizeCtrl,
                    label: 'PV Inverter Size (kW)',
                    icon: Icons.flash_on_outlined,
                    keyboard: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _searchableDropdownField(
                    controller: _pvInverterBrandCtrl,
                    label: 'Inverter Brand',
                    icon: Icons.branding_watermark_outlined,
                    options: _inverterBrands,
                    onSelected: (next) {
                      setState(() {
                        _pvInverterBrandCtrl.text = next ?? '';
                        _pvInverterModelCtrl.clear();
                        _pvInverterSeriesCtrl.clear();
                        _inverterModels = const [];
                        _inverterSeries = const [];
                        _inverterModelsForBrand = null;
                        _inverterSeriesForKey = null;
                      });
                      _ensureCecDataLoaded();
                    },
                  ),
                  const SizedBox(height: 16),
                  _searchableDropdownField(
                    controller: _pvInverterModelCtrl,
                    label: 'Inverter Model',
                    icon: Icons.memory_outlined,
                    options: _inverterModels,
                    onSelected: (next) {
                      setState(() {
                        _pvInverterModelCtrl.text = next ?? '';
                        _pvInverterSeriesCtrl.clear();
                        _inverterSeries = const [];
                        _inverterSeriesForKey = null;
                      });
                      _ensureCecDataLoaded();
                    },
                  ),
                  const SizedBox(height: 16),
                  _searchableDropdownField(
                    controller: _pvInverterSeriesCtrl,
                    label: 'Inverter Series',
                    icon: Icons.view_timeline_outlined,
                    options: _inverterSeries,
                    onSelected: (next) =>
                        setState(() => _pvInverterSeriesCtrl.text = next ?? ''),
                  ),
                  const SizedBox(height: 16),
                  _field(
                    controller: _pvInverterPowerCtrl,
                    label: 'Inverter Power (kW)',
                    icon: Icons.bolt_outlined,
                    keyboard: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _field(
                    controller: _pvInverterQuantityCtrl,
                    label: 'Number of Inverter',
                    icon: Icons.numbers_outlined,
                    keyboard: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  ),
                  const SizedBox(height: 16),
                  _searchableDropdownField(
                    controller: _pvPanelBrandCtrl,
                    label: 'Panel Brand',
                    icon: Icons.grid_view_outlined,
                    options: _pvPanelBrands,
                    onSelected: (next) {
                      setState(() {
                        _pvPanelBrandCtrl.text = next ?? '';
                        _pvPanelModelCtrl.clear();
                        _pvPanelModels = const [];
                        _pvPanelModelsForBrand = null;
                      });
                      _ensureCecDataLoaded();
                    },
                  ),
                  const SizedBox(height: 16),
                  _searchableDropdownField(
                    controller: _pvPanelModelCtrl,
                    label: 'Panel Model',
                    icon: Icons.widgets_outlined,
                    options: _pvPanelModels,
                    onSelected: (next) =>
                        setState(() => _pvPanelModelCtrl.text = next ?? ''),
                  ),
                  const SizedBox(height: 16),
                  _field(
                    controller: _pvPanelQuantityCtrl,
                    label: 'Quantity of Panel',
                    icon: Icons.pin_outlined,
                    keyboard: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  ),
                  const SizedBox(height: 16),
                  _field(
                    controller: _pvPanelModuleWattsCtrl,
                    label: 'Panel Module (Watts)',
                    icon: Icons.electric_bolt_outlined,
                    keyboard: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                    ],
                  ),
                ]),
              ],
              if (_hasEvFields) ...[
                const SizedBox(height: 16),
                _card([
                  const _SectionTitle('EV Charger Details'),
                  _field(
                    controller: _evChargerBrandCtrl,
                    label: 'EV Charger Brand',
                    icon: Icons.ev_station_outlined,
                  ),
                  const SizedBox(height: 16),
                  _field(
                    controller: _evChargerModelCtrl,
                    label: 'EV Charger Model',
                    icon: Icons.electric_car_outlined,
                  ),
                ]),
              ],
              if (_hasBatteryFields) ...[
                const SizedBox(height: 16),
                _card([
                  const _SectionTitle('Battery Details'),
                  if (_cecLoading)
                    const Padding(
                      padding: EdgeInsets.only(bottom: 12),
                      child: LinearProgressIndicator(minHeight: 2),
                    ),
                  _field(
                    controller: _batterySizeCtrl,
                    label: 'Battery Size (kWh)',
                    icon: Icons.battery_charging_full_outlined,
                    keyboard: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _searchableDropdownField(
                    controller: _batteryBrandCtrl,
                    label: 'Battery Brand',
                    icon: Icons.battery_std_outlined,
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
                  const SizedBox(height: 16),
                  _searchableDropdownField(
                    controller: _batteryModelCtrl,
                    label: 'Battery Model',
                    icon: Icons.battery_unknown_outlined,
                    options: _batteryModels,
                    onSelected: (next) =>
                        setState(() => _batteryModelCtrl.text = next ?? ''),
                  ),
                ]),
              ],
              const SizedBox(height: 16),
              _card([
                const _SectionTitle('Property Characteristics'),
                _dropdownField(
                  label: 'House Storey',
                  icon: Icons.layers_outlined,
                  value: _houseStorey.isEmpty ? null : _houseStorey,
                  options: _houseStoreyOptions,
                  onChanged: (v) => setState(() => _houseStorey = v ?? ''),
                ),
                const SizedBox(height: 16),
                _dropdownField(
                  label: 'Roof Type',
                  icon: Icons.roofing_outlined,
                  value: _roofType.isEmpty ? null : _roofType,
                  options: _roofTypeOptions,
                  onChanged: (v) => setState(() => _roofType = v ?? ''),
                ),
                const SizedBox(height: 16),
                _dropdownField(
                  label: 'Meter Phase',
                  icon: Icons.electric_meter_outlined,
                  value: _meterPhase.isEmpty ? null : _meterPhase,
                  options: _meterPhaseOptions,
                  onChanged: (v) => setState(() => _meterPhase = v ?? ''),
                ),
                const SizedBox(height: 16),
                _boolDropdown(
                  label: 'Access to 2nd Storey',
                  icon: Icons.stairs_outlined,
                  value: _accessToSecondStorey,
                  onChanged: (v) => setState(() => _accessToSecondStorey = v),
                ),
                const SizedBox(height: 16),
                _boolDropdown(
                  label: 'Access to Inverter',
                  icon: Icons.power_outlined,
                  value: _accessToInverter,
                  onChanged: (v) => setState(() => _accessToInverter = v),
                ),
              ]),
              const SizedBox(height: 16),
              _card([
                const _SectionTitle('Utility Information'),
                _field(
                  controller: _preApprovalRefCtrl,
                  label: 'Pre-approval Reference #',
                  icon: Icons.confirmation_number_outlined,
                ),
                const SizedBox(height: 16),
                _field(
                  controller: _postInstallRefCtrl,
                  label: 'Post-install Reference #',
                  icon: Icons.confirmation_number_outlined,
                ),
                const SizedBox(height: 16),
                _field(
                  controller: _energyRetailerCtrl,
                  label: 'Energy Retailer',
                  icon: Icons.storefront_outlined,
                ),
                const SizedBox(height: 16),
                _dropdownField(
                  label: 'Energy Distributor',
                  icon: Icons.account_tree_outlined,
                  value: _energyDistributorDropdownValue,
                  options: _energyDistributorOptions,
                  onChanged: (v) =>
                      setState(() => _energyDistributorCtrl.text = v ?? ''),
                ),
                const SizedBox(height: 16),
                _boolDropdown(
                  label: 'Solar Victoria Eligibility',
                  icon: Icons.verified_outlined,
                  value: _solarVicEligibility,
                  trueLabel: 'Eligible',
                  falseLabel: 'Not eligible',
                  onChanged: (v) => setState(() => _solarVicEligibility = v),
                ),
                const SizedBox(height: 16),
                _field(
                  controller: _nmiNumberCtrl,
                  label: 'NMI Number',
                  icon: Icons.numbers_outlined,
                ),
                const SizedBox(height: 16),
                _field(
                  controller: _meterNumberCtrl,
                  label: 'Meter Number',
                  icon: Icons.pin_outlined,
                ),
                const SizedBox(height: 8),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Expected Completion'),
                  subtitle: Text(
                    _expectedCompletionDate == null
                        ? 'Not set'
                        : DateFormat(
                            'd MMM yyyy',
                          ).format(_expectedCompletionDate!),
                  ),
                  trailing: const Icon(Icons.calendar_month_outlined),
                  onTap: _pickExpectedCompletionDate,
                ),
              ]),
            ],
          ),
        ),
      ),
    );
  }

  Widget _card(List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(children: children),
    );
  }

  Widget _field({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType? keyboard,
    List<TextInputFormatter>? inputFormatters,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboard,
      inputFormatters: inputFormatters,
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon),
        filled: true,
        fillColor: AppColors.surface,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  Widget _searchableDropdownField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    required List<String> options,
    required ValueChanged<String?> onSelected,
  }) {
    return RawAutocomplete<String>(
      initialValue: TextEditingValue(text: controller.text),
      optionsBuilder: (textEditingValue) {
        final query = textEditingValue.text.trim().toLowerCase();
        if (options.isEmpty) return const Iterable<String>.empty();
        if (query.isEmpty) return options.take(25);
        return options
            .where((item) => item.toLowerCase().contains(query))
            .take(25);
      },
      displayStringForOption: (option) => option,
      onSelected: (selection) {
        controller
          ..text = selection
          ..selection = TextSelection.collapsed(offset: selection.length);
        onSelected(selection);
      },
      fieldViewBuilder: (context, textEditingController, focusNode, onSubmit) {
        if (textEditingController.text != controller.text) {
          textEditingController.value = TextEditingValue(
            text: controller.text,
            selection: TextSelection.collapsed(offset: controller.text.length),
          );
        }
        return TextFormField(
          controller: textEditingController,
          focusNode: focusNode,
          onFieldSubmitted: (_) => onSubmit(),
          onChanged: (value) {
            controller
              ..text = value
              ..selection = TextSelection.collapsed(offset: value.length);
          },
          decoration: InputDecoration(
            labelText: label,
            prefixIcon: Icon(icon),
            suffixIcon: const Icon(Icons.search, size: 18),
            filled: true,
            fillColor: AppColors.surface,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
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
    );
  }

  Widget _dropdownField({
    required String label,
    required IconData icon,
    required String? value,
    required List<String> options,
    required ValueChanged<String?> onChanged,
  }) {
    return DropdownButtonFormField<String>(
      isExpanded: true,
      value: value,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon),
        filled: true,
        fillColor: AppColors.surface,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
      items: [
        const DropdownMenuItem<String>(value: null, child: Text('Select')),
        ...options.map(
          (option) =>
              DropdownMenuItem<String>(value: option, child: Text(option)),
        ),
      ],
      onChanged: onChanged,
    );
  }

  Widget _boolDropdown({
    required String label,
    required IconData icon,
    required bool? value,
    required ValueChanged<bool?> onChanged,
    String trueLabel = 'Yes',
    String falseLabel = 'No',
  }) {
    return DropdownButtonFormField<bool?>(
      value: value,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon),
        filled: true,
        fillColor: AppColors.surface,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
      items: [
        const DropdownMenuItem<bool?>(value: null, child: Text('Select')),
        DropdownMenuItem<bool?>(value: true, child: Text(trueLabel)),
        DropdownMenuItem<bool?>(value: false, child: Text(falseLabel)),
      ],
      onChanged: onChanged,
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w700,
          color: AppColors.textSecondary,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}
