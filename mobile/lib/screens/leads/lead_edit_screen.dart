import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../models/lead.dart';
import '../../providers/leads_provider.dart';
import '../../widgets/common/loading_overlay.dart';

/// Edit an existing lead — pre-populated form.
class LeadEditScreen extends StatefulWidget {
  final Lead lead;
  const LeadEditScreen({super.key, required this.lead});

  @override
  State<LeadEditScreen> createState() => _LeadEditScreenState();
}

class _LeadEditScreenState extends State<LeadEditScreen> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _nameCtrl;
  late final TextEditingController _emailCtrl;
  late final TextEditingController _phoneCtrl;
  late final TextEditingController _suburbCtrl;
  late final TextEditingController _addressCtrl;
  late final TextEditingController _systemSizeCtrl;
  late final TextEditingController _valueCtrl;
  late final TextEditingController _notesCtrl;

  late final TextEditingController _systemTypeCtrl;
  late final TextEditingController _houseStoreyCtrl;
  late final TextEditingController _roofTypeCtrl;
  late final TextEditingController _meterPhaseCtrl;
  bool _accessSecondStorey = false;
  bool _accessInverter = false;

  late final TextEditingController _preApprovalRefCtrl;
  late final TextEditingController _energyRetailerCtrl;
  late final TextEditingController _energyDistributorCtrl;
  bool _solarVicEligibility = false;
  late final TextEditingController _nmiNumberCtrl;
  late final TextEditingController _meterNumberCtrl;

  late final TextEditingController _pvSystemSizeKwCtrl;
  late final TextEditingController _pvInverterSizeKwCtrl;
  late final TextEditingController _pvInverterBrandCtrl;
  late final TextEditingController _pvInverterModelCtrl;
  late final TextEditingController _pvInverterPowerKwCtrl;
  late final TextEditingController _pvPanelBrandCtrl;
  late final TextEditingController _pvPanelModelCtrl;
  late final TextEditingController _evChargerBrandCtrl;
  late final TextEditingController _evChargerModelCtrl;
  late final TextEditingController _batterySizeKwhCtrl;
  late final TextEditingController _batteryBrandCtrl;
  late final TextEditingController _batteryModelCtrl;

  late String _source;
  late String _stage;
  bool _saving = false;
  String? _error;

  static const _sources = [
    'Website',
    'Referral',
    'Facebook',
    'Google Ads',
    'Door Knock',
    'Phone Inquiry',
    'Trade Show',
    'SolarQuotes',
    'Other',
  ];

  String _getString(Map<String, dynamic>? raw, List<String> keys) {
    if (raw == null) return '';
    for (final key in keys) {
      if (raw[key] != null && raw[key].toString().trim().isNotEmpty) {
        return raw[key].toString().trim();
      }
    }
    return '';
  }

  bool _getBool(Map<String, dynamic>? raw, List<String> keys) {
    if (raw == null) return false;
    for (final key in keys) {
      final v = raw[key];
      if (v == null) continue;
      final s = v.toString().toLowerCase();
      if (s == '1' || s == 'true' || s == 'yes' || s == 'y') return true;
    }
    return false;
  }

  @override
  void initState() {
    super.initState();
    final l = widget.lead;
    final r = l.raw;

    _nameCtrl = TextEditingController(text: l.customerName);
    _emailCtrl = TextEditingController(text: l.email ?? '');
    _phoneCtrl = TextEditingController(text: l.phone ?? '');
    _suburbCtrl = TextEditingController(text: l.suburb ?? '');
    _addressCtrl = TextEditingController(text: l.address ?? '');
    _systemSizeCtrl = TextEditingController(text: l.systemSize ?? '');
    _valueCtrl = TextEditingController(
        text: l.value != null ? l.value!.toStringAsFixed(0) : '');
    _notesCtrl = TextEditingController(text: l.notes ?? '');
    _source = l.source ?? '';
    _stage = l.stage;

    _systemTypeCtrl = TextEditingController(
        text: _getString(r, ['system_type', 'systemType']));
    _houseStoreyCtrl = TextEditingController(
        text: _getString(r, ['house_storey', 'houseStorey']));
    _roofTypeCtrl = TextEditingController(
        text: _getString(r, ['roof_type', 'roofType']));
    _meterPhaseCtrl = TextEditingController(
        text: _getString(r, ['meter_phase', 'meterPhase']));
    _accessSecondStorey = _getBool(
        r, ['access_to_second_storey', 'accessToSecondStorey']);
    _accessInverter =
        _getBool(r, ['access_to_inverter', 'accessToInverter']);

    _preApprovalRefCtrl = TextEditingController(
        text: _getString(
            r, ['pre_approval_reference_no', 'preApprovalReferenceNo']));
    _energyRetailerCtrl = TextEditingController(
        text: _getString(r, ['energy_retailer', 'energyRetailer']));
    _energyDistributorCtrl = TextEditingController(
        text: _getString(r, ['energy_distributor', 'energyDistributor']));
    _solarVicEligibility =
        _getBool(r, ['solar_vic_eligibility', 'solarVicEligibility']);
    _nmiNumberCtrl = TextEditingController(
        text: _getString(r, ['nmi_number', 'nmiNumber']));
    _meterNumberCtrl = TextEditingController(
        text: _getString(r, ['meter_number', 'meterNumber']));

    _pvSystemSizeKwCtrl =
        TextEditingController(text: _getString(r, ['pv_system_size_kw']));
    _pvInverterSizeKwCtrl = TextEditingController(
        text: _getString(r, ['pv_inverter_size_kw']));
    _pvInverterBrandCtrl =
        TextEditingController(text: _getString(r, ['pv_inverter_brand']));
    _pvInverterModelCtrl =
        TextEditingController(text: _getString(r, ['pv_inverter_model']));
    _pvInverterPowerKwCtrl = TextEditingController(
        text: _getString(r, ['pv_inverter_power_kw']));
    _pvPanelBrandCtrl =
        TextEditingController(text: _getString(r, ['pv_panel_brand']));
    _pvPanelModelCtrl =
        TextEditingController(text: _getString(r, ['pv_panel_model']));
    _evChargerBrandCtrl =
        TextEditingController(text: _getString(r, ['ev_charger_brand']));
    _evChargerModelCtrl =
        TextEditingController(text: _getString(r, ['ev_charger_model']));
    _batterySizeKwhCtrl =
        TextEditingController(text: _getString(r, ['battery_size_kwh']));
    _batteryBrandCtrl =
        TextEditingController(text: _getString(r, ['battery_brand']));
    _batteryModelCtrl =
        TextEditingController(text: _getString(r, ['battery_model']));
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _suburbCtrl.dispose();
    _addressCtrl.dispose();
    _systemSizeCtrl.dispose();
    _valueCtrl.dispose();
    _notesCtrl.dispose();

    _systemTypeCtrl.dispose();
    _houseStoreyCtrl.dispose();
    _roofTypeCtrl.dispose();
    _meterPhaseCtrl.dispose();

    _preApprovalRefCtrl.dispose();
    _energyRetailerCtrl.dispose();
    _energyDistributorCtrl.dispose();
    _nmiNumberCtrl.dispose();
    _meterNumberCtrl.dispose();

    _pvSystemSizeKwCtrl.dispose();
    _pvInverterSizeKwCtrl.dispose();
    _pvInverterBrandCtrl.dispose();
    _pvInverterModelCtrl.dispose();
    _pvInverterPowerKwCtrl.dispose();
    _pvPanelBrandCtrl.dispose();
    _pvPanelModelCtrl.dispose();
    _evChargerBrandCtrl.dispose();
    _evChargerModelCtrl.dispose();
    _batterySizeKwhCtrl.dispose();
    _batteryBrandCtrl.dispose();
    _batteryModelCtrl.dispose();

    super.dispose();
  }

  String? _nullIfEmpty(String value) =>
      value.trim().isEmpty ? null : value.trim();

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _saving = true;
      _error = null;
    });

    final data = <String, dynamic>{
      'customer_name': _nameCtrl.text.trim(),
      'email': _nullIfEmpty(_emailCtrl.text),
      'phone': _nullIfEmpty(_phoneCtrl.text),
      'suburb': _nullIfEmpty(_suburbCtrl.text),
      'address': _nullIfEmpty(_addressCtrl.text),
      'system_size': _nullIfEmpty(_systemSizeCtrl.text),
      'value': _valueCtrl.text.trim().isEmpty
          ? null
          : double.tryParse(_valueCtrl.text.trim()),
      'source': _source.isEmpty ? null : _source,
      'stage': _stage,
      'notes': _nullIfEmpty(_notesCtrl.text),
      'system_type': _nullIfEmpty(_systemTypeCtrl.text),
      'house_storey': _nullIfEmpty(_houseStoreyCtrl.text),
      'roof_type': _nullIfEmpty(_roofTypeCtrl.text),
      'meter_phase': _nullIfEmpty(_meterPhaseCtrl.text),
      'access_to_second_storey': _accessSecondStorey,
      'access_to_inverter': _accessInverter,
      'pre_approval_reference_no': _nullIfEmpty(_preApprovalRefCtrl.text),
      'energy_retailer': _nullIfEmpty(_energyRetailerCtrl.text),
      'energy_distributor': _nullIfEmpty(_energyDistributorCtrl.text),
      'solar_vic_eligibility': _solarVicEligibility,
      'nmi_number': _nullIfEmpty(_nmiNumberCtrl.text),
      'meter_number': _nullIfEmpty(_meterNumberCtrl.text),
      'pv_system_size_kw': _nullIfEmpty(_pvSystemSizeKwCtrl.text),
      'pv_inverter_size_kw': _nullIfEmpty(_pvInverterSizeKwCtrl.text),
      'pv_inverter_brand': _nullIfEmpty(_pvInverterBrandCtrl.text),
      'pv_inverter_model': _nullIfEmpty(_pvInverterModelCtrl.text),
      'pv_inverter_power_kw': _nullIfEmpty(_pvInverterPowerKwCtrl.text),
      'pv_panel_brand': _nullIfEmpty(_pvPanelBrandCtrl.text),
      'pv_panel_model': _nullIfEmpty(_pvPanelModelCtrl.text),
      'ev_charger_brand': _nullIfEmpty(_evChargerBrandCtrl.text),
      'ev_charger_model': _nullIfEmpty(_evChargerModelCtrl.text),
      'battery_size_kwh': _nullIfEmpty(_batterySizeKwhCtrl.text),
      'battery_brand': _nullIfEmpty(_batteryBrandCtrl.text),
      'battery_model': _nullIfEmpty(_batteryModelCtrl.text),
    };

    try {
      await context.read<LeadsProvider>().updateLead(widget.lead.id, data);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Lead updated successfully'),
          backgroundColor: AppColors.success,
        ),
      );
      context.pop(true);
    } catch (e) {
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
        title: const Text('Edit Lead'),
        centerTitle: false,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: FilledButton(
              onPressed: _saving ? null : _save,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(
                    horizontal: 20, vertical: 10),
              ),
              child: _saving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
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
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 40),
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
                      const Icon(Icons.error_outline,
                          color: AppColors.danger, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(_error!,
                            style: const TextStyle(
                                fontSize: 13, color: AppColors.danger)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              _SectionHeader(title: 'Customer Information'),
              const SizedBox(height: 12),
              _FormCard(children: [
                TextFormField(
                  controller: _nameCtrl,
                  decoration: _inputDecoration(
                      label: 'Customer Name', icon: Icons.person_outline),
                  textCapitalization: TextCapitalization.words,
                  validator: (v) => (v == null || v.trim().isEmpty)
                      ? 'Customer name is required'
                      : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _emailCtrl,
                  decoration: _inputDecoration(
                      label: 'Email', icon: Icons.email_outlined),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _phoneCtrl,
                  decoration: _inputDecoration(
                      label: 'Phone', icon: Icons.phone_outlined),
                  keyboardType: TextInputType.phone,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(10),
                  ],
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _suburbCtrl,
                  decoration: _inputDecoration(
                      label: 'Suburb', icon: Icons.location_on_outlined),
                  textCapitalization: TextCapitalization.words,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _addressCtrl,
                  decoration: _inputDecoration(
                      label: 'Address', icon: Icons.home_outlined),
                  textCapitalization: TextCapitalization.words,
                  maxLines: 2,
                ),
              ]),

              const SizedBox(height: 24),
              _SectionHeader(title: 'Project Details'),
              const SizedBox(height: 12),
              _FormCard(children: [
                TextFormField(
                  controller: _systemSizeCtrl,
                  decoration: _inputDecoration(
                      label: 'System Size (e.g. 6.6kW)',
                      icon: Icons.solar_power_outlined),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _valueCtrl,
                  decoration: _inputDecoration(
                      label: 'Value (\$)', icon: Icons.attach_money),
                  keyboardType: const TextInputType.numberWithOptions(
                      decimal: true),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(
                        RegExp(r'^\d+\.?\d{0,2}')),
                  ],
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: _source.isEmpty ? null : _source,
                  decoration: _inputDecoration(
                      label: 'Source', icon: Icons.campaign_outlined),
                  items: _sources
                      .map((s) =>
                          DropdownMenuItem(value: s, child: Text(s)))
                      .toList(),
                  onChanged: (v) => setState(() => _source = v ?? ''),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: _stage,
                  decoration: _inputDecoration(
                      label: 'Stage', icon: Icons.view_kanban_outlined),
                  items: Lead.stageLabels.entries
                      .map((e) => DropdownMenuItem(
                          value: e.key, child: Text(e.value)))
                      .toList(),
                  onChanged: (v) => setState(() => _stage = v ?? _stage),
                ),
              ]),

              const SizedBox(height: 24),
              _SectionHeader(title: 'Property Information'),
              const SizedBox(height: 12),
              _FormCard(children: [
                TextFormField(
                  controller: _systemTypeCtrl,
                  decoration: _inputDecoration(
                      label: 'System Type', icon: Icons.build_circle_outlined),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _houseStoreyCtrl,
                  decoration: _inputDecoration(
                      label: 'House Storey', icon: Icons.home_work_outlined),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _roofTypeCtrl,
                  decoration: _inputDecoration(
                      label: 'Roof Type', icon: Icons.roofing_outlined),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _meterPhaseCtrl,
                  decoration: _inputDecoration(
                      label: 'Meter Phase', icon: Icons.electric_bolt_outlined),
                ),
                const SizedBox(height: 16),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Access to 2nd Storey', style: TextStyle(fontSize: 14)),
                  value: _accessSecondStorey,
                  activeColor: AppColors.primary,
                  onChanged: (val) => setState(() => _accessSecondStorey = val),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Access to Inverter', style: TextStyle(fontSize: 14)),
                  value: _accessInverter,
                  activeColor: AppColors.primary,
                  onChanged: (val) => setState(() => _accessInverter = val),
                ),
              ]),

              const SizedBox(height: 24),
              _SectionHeader(title: 'Utility Information'),
              const SizedBox(height: 12),
              _FormCard(children: [
                TextFormField(
                  controller: _preApprovalRefCtrl,
                  decoration: _inputDecoration(
                      label: 'Pre-Approval Ref No', icon: Icons.numbers_outlined),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _energyRetailerCtrl,
                  decoration: _inputDecoration(
                      label: 'Energy Retailer', icon: Icons.storefront_outlined),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _energyDistributorCtrl,
                  decoration: _inputDecoration(
                      label: 'Energy Distributor', icon: Icons.factory_outlined),
                ),
                const SizedBox(height: 16),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Solar Vic Eligibility', style: TextStyle(fontSize: 14)),
                  value: _solarVicEligibility,
                  activeColor: AppColors.primary,
                  onChanged: (val) => setState(() => _solarVicEligibility = val),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _nmiNumberCtrl,
                  decoration: _inputDecoration(
                      label: 'NMI Number', icon: Icons.pin_outlined),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _meterNumberCtrl,
                  decoration: _inputDecoration(
                      label: 'Meter Number', icon: Icons.speed_outlined),
                ),
              ]),

              const SizedBox(height: 24),
              _SectionHeader(title: 'System Information'),
              const SizedBox(height: 12),
              _FormCard(children: [
                TextFormField(
                  controller: _pvSystemSizeKwCtrl,
                  decoration: _inputDecoration(
                      label: 'PV System Size (kW)', icon: Icons.solar_power_outlined),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _pvInverterSizeKwCtrl,
                  decoration: _inputDecoration(
                      label: 'PV Inverter Size (kW)', icon: Icons.flash_on_outlined),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _pvInverterBrandCtrl,
                  decoration: _inputDecoration(
                      label: 'Inverter Brand', icon: Icons.branding_watermark_outlined),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _pvInverterModelCtrl,
                  decoration: _inputDecoration(
                      label: 'Inverter Model', icon: Icons.model_training_outlined),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _pvInverterPowerKwCtrl,
                  decoration: _inputDecoration(
                      label: 'Inverter Power (kW)', icon: Icons.bolt_outlined),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _pvPanelBrandCtrl,
                  decoration: _inputDecoration(
                      label: 'Panel Brand', icon: Icons.grid_on_outlined),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _pvPanelModelCtrl,
                  decoration: _inputDecoration(
                      label: 'Panel Model', icon: Icons.grid_view_outlined),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _evChargerBrandCtrl,
                  decoration: _inputDecoration(
                      label: 'EV Charger Brand', icon: Icons.ev_station_outlined),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _evChargerModelCtrl,
                  decoration: _inputDecoration(
                      label: 'EV Charger Model', icon: Icons.electric_car_outlined),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _batterySizeKwhCtrl,
                  decoration: _inputDecoration(
                      label: 'Battery Size (kWh)', icon: Icons.battery_charging_full_outlined),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _batteryBrandCtrl,
                  decoration: _inputDecoration(
                      label: 'Battery Brand', icon: Icons.battery_std_outlined),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _batteryModelCtrl,
                  decoration: _inputDecoration(
                      label: 'Battery Model', icon: Icons.battery_unknown_outlined),
                ),
              ]),

              const SizedBox(height: 24),
              _SectionHeader(title: 'Notes'),
              const SizedBox(height: 12),
              _FormCard(children: [
                TextFormField(
                  controller: _notesCtrl,
                  decoration: _inputDecoration(
                      label: 'Notes', icon: Icons.sticky_note_2_outlined),
                  maxLines: 4,
                  textCapitalization: TextCapitalization.sentences,
                ),
              ]),

              const SizedBox(height: 32),
              SizedBox(
                height: 52,
                child: FilledButton(
                  onPressed: _saving ? null : _save,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                  ),
                  child: _saving
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Text(
                          'Update Lead',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration({
    required String label,
    required IconData icon,
  }) {
    return InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon, size: 20),
      filled: true,
      fillColor: AppColors.surface,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: AppColors.border.withOpacity(0.5)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: AppColors.border.withOpacity(0.5)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
      ),
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: AppColors.textSecondary,
        letterSpacing: 0.3,
      ),
    );
  }
}

class _FormCard extends StatelessWidget {
  final List<Widget> children;
  const _FormCard({required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
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
        children: children,
      ),
    );
  }
}
