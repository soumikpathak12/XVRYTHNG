import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../services/projects_service.dart';
import '../../widgets/common/loading_overlay.dart';

/// Create a new in-house project form.
class ProjectFormScreen extends StatefulWidget {
  final bool isRetailer;
  const ProjectFormScreen({super.key, this.isRetailer = false});

  @override
  State<ProjectFormScreen> createState() => _ProjectFormScreenState();
}

class _ProjectFormScreenState extends State<ProjectFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _service = ProjectsService();

  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _suburbCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _systemCtrl = TextEditingController();
  final _valueCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();

  String _jobType = 'site_inspection';
  DateTime? _scheduledDate;
  TimeOfDay? _scheduledTime;
  bool _saving = false;
  String? _error;

  static const _jobTypes = [
    {'value': 'site_inspection', 'label': 'Site Inspection'},
    {'value': 'stage_one', 'label': 'Stage One'},
    {'value': 'stage_two', 'label': 'Stage Two'},
    {'value': 'full_system', 'label': 'Full System'},
  ];

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _suburbCtrl.dispose();
    _addressCtrl.dispose();
    _systemCtrl.dispose();
    _valueCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (!widget.isRetailer) {
      setState(() {
        _error =
            'In-house projects are generated from converted leads. Please create/convert a lead first.';
      });
      return;
    }
    if (_scheduledDate == null) {
      setState(() => _error = 'Scheduled date is required.');
      return;
    }
    if (_jobType == 'site_inspection' && _scheduledTime == null) {
      setState(() => _error = 'Scheduled time is required for site inspection.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });

    final data = <String, dynamic>{
      'customer_name': _nameCtrl.text.trim(),
      'job_type': _jobType,
      'scheduled_date': _formatDate(_scheduledDate!),
      'scheduled_time': _scheduledTime == null
          ? null
          : _formatTime(_scheduledTime!),
      'customer_email':
          _emailCtrl.text.trim().isEmpty ? null : _emailCtrl.text.trim(),
      'customer_contact':
          _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
      'suburb': _suburbCtrl.text.trim().isEmpty ? null : _suburbCtrl.text.trim(),
      'address': _addressCtrl.text.trim().isEmpty
          ? null
          : _addressCtrl.text.trim(),
      'system_size_kw': _systemCtrl.text.trim().isEmpty
          ? null
          : double.tryParse(_systemCtrl.text.trim()),
      'value_amount': _valueCtrl.text.trim().isEmpty
          ? null
          : double.tryParse(_valueCtrl.text.trim()),
      'system_type': 'Solar PV',
      'notes':
          _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
    };

    try {
      await _service.createRetailerProject(data);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Retailer project created'),
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
        title: Text(
            widget.isRetailer ? 'New Retailer Project' : 'New Project'),
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
                          strokeWidth: 2, color: Colors.white))
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
              _section('Customer Information'),
              const SizedBox(height: 12),
              _card([
                _field(_nameCtrl, 'Customer Name', Icons.person_outline,
                    required: true),
                const SizedBox(height: 16),
                _field(_emailCtrl, 'Email', Icons.email_outlined,
                    keyboard: TextInputType.emailAddress),
                const SizedBox(height: 16),
                _field(_phoneCtrl, 'Phone', Icons.phone_outlined,
                    keyboard: TextInputType.phone),
                const SizedBox(height: 16),
                _field(_suburbCtrl, 'Suburb', Icons.location_on_outlined),
                const SizedBox(height: 16),
                _field(_addressCtrl, 'Address', Icons.home_outlined,
                    maxLines: 2),
              ]),
              const SizedBox(height: 24),
              _section('System Details'),
              const SizedBox(height: 12),
              _card([
                DropdownButtonFormField<String>(
                  initialValue: _jobType,
                  decoration:
                      _decoration('Job Type', Icons.miscellaneous_services_outlined),
                  items: _jobTypes
                      .map((t) => DropdownMenuItem<String>(
                            value: t['value'],
                            child: Text(t['label']!),
                          ))
                      .toList(),
                  onChanged: (v) => setState(() => _jobType = v ?? _jobType),
                ),
                const SizedBox(height: 16),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Scheduled Date *'),
                  subtitle: Text(
                    _scheduledDate == null
                        ? 'Select a date'
                        : _formatDate(_scheduledDate!),
                  ),
                  trailing: const Icon(Icons.calendar_month_outlined),
                  onTap: _pickDate,
                ),
                if (_jobType == 'site_inspection') ...[
                  const SizedBox(height: 8),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Scheduled Time *'),
                    subtitle: Text(
                      _scheduledTime == null
                          ? 'Select a time'
                          : _formatTime(_scheduledTime!),
                    ),
                    trailing: const Icon(Icons.access_time_outlined),
                    onTap: _pickTime,
                  ),
                ],
                const SizedBox(height: 16),
                _field(_systemCtrl, 'System Summary',
                    Icons.solar_power_outlined),
                const SizedBox(height: 16),
                _field(_valueCtrl, 'Value (\$)', Icons.attach_money,
                    keyboard: const TextInputType.numberWithOptions(
                        decimal: true),
                    formatters: [
                      FilteringTextInputFormatter.allow(
                          RegExp(r'^\d+\.?\d{0,2}')),
                    ]),
              ]),
              const SizedBox(height: 24),
              _section('Notes'),
              const SizedBox(height: 12),
              _card([
                _field(_notesCtrl, 'Notes',
                    Icons.sticky_note_2_outlined,
                    maxLines: 4),
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
                              strokeWidth: 2, color: Colors.white))
                      : Text(
                          'Create ${widget.isRetailer ? 'Retailer ' : ''}Project',
                          style: const TextStyle(
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

  Widget _field(
    TextEditingController ctrl,
    String label,
    IconData icon, {
    bool required = false,
    TextInputType? keyboard,
    int maxLines = 1,
    List<TextInputFormatter>? formatters,
  }) {
    return TextFormField(
      controller: ctrl,
      decoration: _decoration(label, icon),
      keyboardType: keyboard,
      maxLines: maxLines,
      inputFormatters: formatters,
      textCapitalization: TextCapitalization.words,
      validator: required
          ? (v) => (v == null || v.trim().isEmpty) ? '$label is required' : null
          : null,
    );
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 5),
      initialDate: _scheduledDate ?? now,
    );
    if (date != null && mounted) {
      setState(() => _scheduledDate = date);
    }
  }

  Future<void> _pickTime() async {
    final now = TimeOfDay.now();
    final picked = await showTimePicker(
      context: context,
      initialTime: _scheduledTime ?? now,
    );
    if (picked != null && mounted) {
      setState(() => _scheduledTime = picked);
    }
  }

  String _formatDate(DateTime dt) {
    final yyyy = dt.year.toString().padLeft(4, '0');
    final mm = dt.month.toString().padLeft(2, '0');
    final dd = dt.day.toString().padLeft(2, '0');
    return '$yyyy-$mm-$dd';
  }

  String _formatTime(TimeOfDay t) {
    final hh = t.hour.toString().padLeft(2, '0');
    final mm = t.minute.toString().padLeft(2, '0');
    return '$hh:$mm';
  }

  InputDecoration _decoration(String label, IconData icon) {
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

  Widget _section(String title) => Text(
        title,
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: AppColors.textSecondary,
          letterSpacing: 0.3,
        ),
      );

  Widget _card(List<Widget> children) => Container(
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
