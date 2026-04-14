import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../models/employee.dart';
import '../../models/lead.dart';
import '../../providers/leads_provider.dart';
import '../../services/employees_service.dart';
import '../../widgets/common/loading_overlay.dart';

class LeadFormScreen extends StatefulWidget {
  const LeadFormScreen({super.key});

  @override
  State<LeadFormScreen> createState() => _LeadFormScreenState();
}

class _LeadFormScreenState extends State<LeadFormScreen> {
  final _formKey = GlobalKey<FormState>();

  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _suburbCtrl = TextEditingController();
  final _sourceOtherCtrl = TextEditingController();

  String _source = '';
  String _stage = Lead.stages.first;
  String _salesSegment = '';
  bool _salesSegmentLocked = false;
  String _inspectionDateLabel = '';
  DateTime? _inspectionDateTime;
  String _inspectorId = '';
  List<Employee> _inspectors = const [];
  bool _saving = false;
  bool _loadingInspectors = true;
  String? _error;
  bool _initializedFromRoute = false;

  static const _sources = [
    'Website',
    'Solar Quotes',
    'Facebook',
    'Other',
  ];

  static const _salesSegments = [
    {'value': 'b2c', 'label': 'Residential (B2C)'},
    {'value': 'b2b', 'label': 'Commercial (B2B)'},
  ];

  @override
  void initState() {
    super.initState();
    _loadInspectors();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initializedFromRoute) return;
    _initializedFromRoute = true;
    final segment = GoRouterState.of(context).uri.queryParameters['segment'];
    if (segment == 'b2c' || segment == 'b2b') {
      _salesSegment = segment!;
      _salesSegmentLocked = true;
    }
  }

  Future<void> _loadInspectors() async {
    try {
      final inspectors = await EmployeesService().listEmployees(status: 'active');
      if (!mounted) return;
      setState(() {
        _inspectors = inspectors;
      });
    } catch (_) {
      // Keep the form functional even if inspectors fail to load.
    } finally {
      if (mounted) {
        setState(() {
          _loadingInspectors = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _suburbCtrl.dispose();
    _sourceOtherCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _saving = true;
      _error = null;
    });

    final data = <String, dynamic>{
      'stage': _stage,
      'customer_name': _nameCtrl.text.trim(),
      'email': _emailCtrl.text.trim(),
      'phone': _phoneCtrl.text.trim(),
      'suburb': _suburbCtrl.text.trim(),
      'source': _source == 'Other' ? _sourceOtherCtrl.text.trim() : _source,
      'site_inspection_date': _inspectionDateTime == null
          ? null
          : _toMySqlDateTime(_inspectionDateTime!),
      'inspector_id': _inspectorId.isEmpty ? null : int.tryParse(_inspectorId),
      'sales_segment': _salesSegment,
    };

    try {
      await context.read<LeadsProvider>().createLead(data);
      if (!mounted) return;
      if (_saving) {
        setState(() => _saving = false);
      }
      final leadsRoute = _resolveLeadsListRoute();
      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (dialogContext) {
          return AlertDialog(
            title: const Text('Lead Created'),
            content: const Text('Lead has been created successfully.'),
            actions: [
              FilledButton(
                onPressed: () => Navigator.of(dialogContext).pop(),
                child: const Text('Go to Leads'),
              ),
            ],
          );
        },
      );
      if (!mounted) return;
      context.go(leadsRoute);
      return;
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted && _saving) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: Text(_salesSegment == 'b2c'
            ? 'New Lead - Residential'
            : _salesSegment == 'b2b'
                ? 'New Lead - Commercial'
                : 'New Lead'),
        centerTitle: false,
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

              _SectionHeader(title: 'Customer Information'),
              const SizedBox(height: 12),

              _FormCard(
                children: [
                  TextFormField(
                    controller: _nameCtrl,
                    decoration: _inputDecoration(
                      label: 'Customer Name',
                      icon: Icons.person_outline,
                    ),
                    textCapitalization: TextCapitalization.words,
                    validator: (v) => (v == null || v.trim().isEmpty)
                        ? 'Customer name is required'
                        : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _emailCtrl,
                    decoration: _inputDecoration(
                      label: 'Email *',
                      icon: Icons.email_outlined,
                    ),
                    keyboardType: TextInputType.emailAddress,
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) {
                        return 'Email is required';
                      }
                      if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
                          .hasMatch(v.trim())) {
                        return 'Enter a valid email';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _phoneCtrl,
                    decoration: _inputDecoration(
                      label: 'Phone *',
                      icon: Icons.phone_outlined,
                    ),
                    keyboardType: TextInputType.phone,
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) {
                        return 'Phone is required';
                      }
                      if (!RegExp(r'^[0-9()+\-\s]*[0-9][0-9()+\-\s]*$')
                          .hasMatch(v.trim())) {
                        return 'Enter a valid phone';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _suburbCtrl,
                    decoration: _inputDecoration(
                      label: 'Location *',
                      icon: Icons.location_on_outlined,
                    ),
                    textCapitalization: TextCapitalization.words,
                    validator: (v) => (v == null || v.trim().isEmpty)
                        ? 'Location is required'
                        : null,
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    initialValue: _stage,
                    decoration: _inputDecoration(
                      label: 'Stage *',
                      icon: Icons.filter_alt_outlined,
                    ),
                    items: Lead.stages
                        .map((s) => DropdownMenuItem(
                              value: s,
                              child: Text(Lead.stageLabels[s] ?? s),
                            ))
                        .toList(),
                    onChanged: (v) => setState(() => _stage = v ?? Lead.stages.first),
                  ),
                ],
              ),

              const SizedBox(height: 24),
              _SectionHeader(title: 'Lead Details'),
              const SizedBox(height: 12),
              _FormCard(
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: _source.isEmpty ? null : _source,
                    decoration: _inputDecoration(
                      label: 'Source *',
                      icon: Icons.campaign_outlined,
                    ),
                    items: _sources
                        .map((s) =>
                            DropdownMenuItem(value: s, child: Text(s)))
                        .toList(),
                    onChanged: (v) => setState(() => _source = v ?? ''),
                    validator: (v) =>
                        (v == null || v.isEmpty) ? 'Source is required' : null,
                  ),
                  if (_source == 'Other') ...[
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _sourceOtherCtrl,
                      decoration: _inputDecoration(
                        label: 'Source type *',
                        icon: Icons.edit_outlined,
                      ),
                      validator: (v) {
                        if (_source == 'Other' &&
                            (v == null || v.trim().isEmpty)) {
                          return 'Please specify source type';
                        }
                        return null;
                      },
                    ),
                  ],
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    initialValue: _salesSegment.isEmpty ? null : _salesSegment,
                    decoration: _inputDecoration(
                      label: 'Sales channel *',
                      icon: Icons.account_tree_outlined,
                    ),
                    items: _salesSegments
                        .map((s) => DropdownMenuItem(
                              value: s['value'],
                              child: Text(s['label']!),
                            ))
                        .toList(),
                    onChanged: _salesSegmentLocked
                        ? null
                        : (v) => setState(() => _salesSegment = v ?? ''),
                    validator: (v) => (v == null || v.isEmpty)
                        ? 'Select Residential (B2C) or Commercial (B2B)'
                        : null,
                  ),
                  const SizedBox(height: 16),
                  InkWell(
                    onTap: _pickInspectionDateTime,
                    borderRadius: BorderRadius.circular(12),
                    child: InputDecorator(
                      decoration: _inputDecoration(
                        label: 'Site inspection date (optional)',
                        icon: Icons.event_outlined,
                      ).copyWith(
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.calendar_month_outlined),
                          onPressed: _pickInspectionDateTime,
                        ),
                      ),
                      child: Text(
                        _inspectionDateLabel.isEmpty
                            ? 'Not scheduled'
                            : _inspectionDateLabel,
                        style: TextStyle(
                          color: _inspectionDateLabel.isEmpty
                              ? AppColors.textSecondary
                              : AppColors.textPrimary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    initialValue: _inspectorId.isEmpty ? null : _inspectorId,
                    decoration: _inputDecoration(
                      label: 'Inspector',
                      icon: Icons.badge_outlined,
                    ),
                    items: [
                      const DropdownMenuItem<String>(
                        value: '',
                        child: Text('Select inspector'),
                      ),
                      ..._inspectors.map(
                        (e) => DropdownMenuItem<String>(
                          value: e.id.toString(),
                          child: Text(e.fullName.trim()),
                        ),
                      ),
                    ],
                    onChanged: _loadingInspectors
                        ? null
                        : (v) => setState(() => _inspectorId = v ?? ''),
                  ),
                ],
              ),

              const SizedBox(height: 32),
              SizedBox(
                height: 52,
                child: FilledButton(
                  onPressed: _saving ? null : _save,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: _saving
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text(
                          'Create Lead',
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
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.danger),
      ),
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
    );
  }

  Future<void> _pickInspectionDateTime() async {
    final now = DateTime.now();
    final pickedDate = await showDatePicker(
      context: context,
      firstDate: DateTime(now.year - 2),
      lastDate: DateTime(now.year + 5),
      initialDate: _inspectionDateTime ?? now,
    );
    if (pickedDate == null || !mounted) return;
    final pickedTime = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_inspectionDateTime ?? now),
    );
    if (pickedTime == null || !mounted) return;
    final combined = DateTime(
      pickedDate.year,
      pickedDate.month,
      pickedDate.day,
      pickedTime.hour,
      pickedTime.minute,
    );
    setState(() {
      _inspectionDateTime = combined;
      _inspectionDateLabel = _formatDateTimeLabel(combined);
    });
  }

  String _toMySqlDateTime(DateTime dt) {
    final yyyy = dt.year.toString().padLeft(4, '0');
    final mm = dt.month.toString().padLeft(2, '0');
    final dd = dt.day.toString().padLeft(2, '0');
    final hh = dt.hour.toString().padLeft(2, '0');
    final mi = dt.minute.toString().padLeft(2, '0');
    return '$yyyy-$mm-$dd $hh:$mi:00';
  }

  String _formatDateTimeLabel(DateTime dt) {
    final yyyy = dt.year.toString().padLeft(4, '0');
    final mm = dt.month.toString().padLeft(2, '0');
    final dd = dt.day.toString().padLeft(2, '0');
    final hh = dt.hour.toString().padLeft(2, '0');
    final mi = dt.minute.toString().padLeft(2, '0');
    return '$yyyy-$mm-$dd $hh:$mi';
  }

  String _resolveLeadsListRoute() {
    final currentPath = GoRouterState.of(context).uri.path;
    if (currentPath.startsWith('/dashboard/')) return '/dashboard/leads';
    if (currentPath.startsWith('/admin/')) return '/admin/leads';
    if (currentPath.startsWith('/employee/')) return '/employee/leads';
    return '/admin/leads';
  }
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Form card container
// ---------------------------------------------------------------------------
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
