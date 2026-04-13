import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_colors.dart';
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

  final _customerNameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _suburbCtrl = TextEditingController();
  final _systemSizeCtrl = TextEditingController();
  final _valueAmountCtrl = TextEditingController();
  final _postInstallRefCtrl = TextEditingController();

  DateTime? _expectedCompletionDate;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final d = widget.initialData;
    _customerNameCtrl.text = (d['customer_name'] ?? d['customerName'] ?? '').toString();
    _emailCtrl.text = (d['email'] ?? '').toString();
    _phoneCtrl.text = (d['phone'] ?? '').toString();
    _suburbCtrl.text = (d['suburb'] ?? '').toString();
    _systemSizeCtrl.text = (d['system_size_kw'] ?? '').toString();
    _valueAmountCtrl.text = (d['value_amount'] ?? d['lead_value_amount'] ?? '').toString();
    _postInstallRefCtrl.text = (d['post_install_reference_no'] ?? '').toString();
    _expectedCompletionDate = _tryParseDate(d['expected_completion_date']);
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
      'suburb': _suburbCtrl.text.trim().isEmpty ? null : _suburbCtrl.text.trim(),
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
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Project updated'),
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
                      const Icon(Icons.error_outline,
                          color: AppColors.danger, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _error!,
                          style: const TextStyle(
                              fontSize: 13, color: AppColors.danger),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],
              _card([
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
                _field(
                  controller: _systemSizeCtrl,
                  label: 'System Size (kW)',
                  icon: Icons.solar_power_outlined,
                  keyboard: const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                  ],
                ),
                const SizedBox(height: 16),
                _field(
                  controller: _valueAmountCtrl,
                  label: 'Value Amount',
                  icon: Icons.attach_money_outlined,
                  keyboard: const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                  ],
                ),
                const SizedBox(height: 16),
                _field(
                  controller: _postInstallRefCtrl,
                  label: 'Post-install Reference #',
                  icon: Icons.confirmation_number_outlined,
                ),
                const SizedBox(height: 8),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Expected Completion'),
                  subtitle: Text(
                    _expectedCompletionDate == null
                        ? 'Not set'
                        : DateFormat('d MMM yyyy').format(_expectedCompletionDate!),
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
}

