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

  @override
  void initState() {
    super.initState();
    final l = widget.lead;
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
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _saving = true;
      _error = null;
    });

    final data = <String, dynamic>{
      'customer_name': _nameCtrl.text.trim(),
      'email':
          _emailCtrl.text.trim().isEmpty ? null : _emailCtrl.text.trim(),
      'phone':
          _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
      'suburb':
          _suburbCtrl.text.trim().isEmpty ? null : _suburbCtrl.text.trim(),
      'address': _addressCtrl.text.trim().isEmpty
          ? null
          : _addressCtrl.text.trim(),
      'system_size': _systemSizeCtrl.text.trim().isEmpty
          ? null
          : _systemSizeCtrl.text.trim(),
      'value': _valueCtrl.text.trim().isEmpty
          ? null
          : double.tryParse(_valueCtrl.text.trim()),
      'source': _source.isEmpty ? null : _source,
      'stage': _stage,
      'notes':
          _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
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
