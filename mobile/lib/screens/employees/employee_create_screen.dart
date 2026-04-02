import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../providers/employees_provider.dart';
import '../../widgets/common/loading_overlay.dart';

class EmployeeCreateScreen extends StatefulWidget {
  const EmployeeCreateScreen({super.key});

  @override
  State<EmployeeCreateScreen> createState() => _EmployeeCreateScreenState();
}

class _EmployeeCreateScreenState extends State<EmployeeCreateScreen> {
  int _currentStep = 0;
  bool _submitting = false;
  final _formKeys = List.generate(6, (_) => GlobalKey<FormState>());

  // Step 1 - Personal Info
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _dob = TextEditingController();
  String? _gender;
  DateTime? _dobDate;

  // Step 2 - Contact & Address
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _street = TextEditingController();
  final _city = TextEditingController();
  final _stateCtrl = TextEditingController();
  final _postcode = TextEditingController();

  // Step 3 - Employment
  String? _departmentId;
  String? _jobRoleId;
  String? _employmentType;
  final _startDate = TextEditingController();
  final _rate = TextEditingController();
  DateTime? _startDateValue;

  // Step 4 - Account
  bool _enableLogin = false;
  final _password = TextEditingController();
  final _confirmPassword = TextEditingController();
  bool _obscurePass = true;

  // Step 5 - Emergency Contacts
  final _ecName = TextEditingController();
  final _ecPhone = TextEditingController();
  final _ecRelation = TextEditingController();

  static const _genderOptions = ['Male', 'Female', 'Other'];
  static const _employmentTypes = [
    'Full-time',
    'Part-time',
    'Casual',
    'Contract',
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<EmployeesProvider>().loadJobRoles();
    });
  }

  @override
  void dispose() {
    for (final c in [
      _firstName, _lastName, _dob, _email, _phone, _street, _city,
      _stateCtrl, _postcode, _startDate, _rate, _password, _confirmPassword,
      _ecName, _ecPhone, _ecRelation,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Add Employee'),
      ),
      body: LoadingOverlay(
        isLoading: _submitting,
        message: 'Creating employee...',
        child: Column(
          children: [
            _buildStepIndicator(),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: _buildCurrentStep(),
              ),
            ),
            _buildNavButtons(),
          ],
        ),
      ),
    );
  }

  // -------------------------------------------------------------------------
  // Step indicator
  // -------------------------------------------------------------------------
  Widget _buildStepIndicator() {
    const labels = [
      'Personal',
      'Contact',
      'Employment',
      'Account',
      'Emergency',
      'Review',
    ];
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16),
      decoration: const BoxDecoration(
        color: AppColors.white,
        border: Border(bottom: BorderSide(color: AppColors.divider)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Row(
          children: List.generate(labels.length, (i) {
            final isCompleted = i < _currentStep;
            final isCurrent = i == _currentStep;
            return Row(
              children: [
                GestureDetector(
                  onTap: i <= _currentStep ? () => setState(() => _currentStep = i) : null,
                  child: Column(
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isCompleted
                              ? AppColors.success
                              : isCurrent
                                  ? AppColors.primary
                                  : AppColors.surface,
                          border: Border.all(
                            color: isCompleted
                                ? AppColors.success
                                : isCurrent
                                    ? AppColors.primary
                                    : AppColors.border,
                            width: 2,
                          ),
                        ),
                        child: Center(
                          child: isCompleted
                              ? const Icon(Icons.check, size: 16, color: AppColors.white)
                              : Text(
                                  '${i + 1}',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: isCurrent
                                        ? AppColors.white
                                        : AppColors.textSecondary,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        labels[i],
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: isCurrent ? FontWeight.w600 : FontWeight.normal,
                          color: isCurrent ? AppColors.primary : AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                if (i < labels.length - 1)
                  Container(
                    width: 24,
                    height: 2,
                    margin: const EdgeInsets.only(bottom: 16),
                    color: isCompleted ? AppColors.success : AppColors.divider,
                  ),
              ],
            );
          }),
        ),
      ),
    );
  }

  // -------------------------------------------------------------------------
  // Step content
  // -------------------------------------------------------------------------
  Widget _buildCurrentStep() {
    switch (_currentStep) {
      case 0:
        return _stepPersonalInfo();
      case 1:
        return _stepContactAddress();
      case 2:
        return _stepEmployment();
      case 3:
        return _stepAccount();
      case 4:
        return _stepEmergencyContacts();
      case 5:
        return _stepReview();
      default:
        return const SizedBox.shrink();
    }
  }

  // Step 1: Personal Info
  Widget _stepPersonalInfo() {
    return Form(
      key: _formKeys[0],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionLabel('Personal Information'),
          const SizedBox(height: 12),
          _field(
            controller: _firstName,
            label: 'First Name *',
            icon: Icons.person_outline,
            validator: _required('First name is required'),
          ),
          const SizedBox(height: 14),
          _field(
            controller: _lastName,
            label: 'Last Name *',
            icon: Icons.person_outline,
            validator: _required('Last name is required'),
          ),
          const SizedBox(height: 14),
          _field(
            controller: _dob,
            label: 'Date of Birth',
            icon: Icons.cake_outlined,
            readOnly: true,
            onTap: () => _pickDate(
              current: _dobDate,
              onPicked: (d) {
                _dobDate = d;
                _dob.text = '${d.day}/${d.month}/${d.year}';
              },
            ),
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            value: _gender,
            decoration: _inputDecoration('Gender', Icons.wc_outlined),
            items: _genderOptions
                .map((g) => DropdownMenuItem(value: g, child: Text(g)))
                .toList(),
            onChanged: (v) => setState(() => _gender = v),
          ),
        ],
      ),
    );
  }

  // Step 2: Contact & Address
  Widget _stepContactAddress() {
    return Form(
      key: _formKeys[1],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionLabel('Contact Details'),
          const SizedBox(height: 12),
          _field(
            controller: _email,
            label: 'Email *',
            icon: Icons.email_outlined,
            keyboardType: TextInputType.emailAddress,
            validator: (v) {
              if (v == null || v.trim().isEmpty) return 'Email is required';
              if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(v.trim())) {
                return 'Enter a valid email';
              }
              return null;
            },
          ),
          const SizedBox(height: 14),
          _field(
            controller: _phone,
            label: 'Phone',
            icon: Icons.phone_outlined,
            keyboardType: TextInputType.phone,
          ),
          const SizedBox(height: 20),
          _sectionLabel('Address'),
          const SizedBox(height: 12),
          _field(controller: _street, label: 'Street', icon: Icons.home_outlined),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _field(
                    controller: _city,
                    label: 'City',
                    icon: Icons.location_city_outlined),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _field(
                    controller: _stateCtrl,
                    label: 'State',
                    icon: Icons.map_outlined),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _field(
            controller: _postcode,
            label: 'Postcode',
            icon: Icons.local_post_office_outlined,
            keyboardType: TextInputType.number,
          ),
        ],
      ),
    );
  }

  // Step 3: Employment
  Widget _stepEmployment() {
    final provider = context.watch<EmployeesProvider>();
    return Form(
      key: _formKeys[2],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionLabel('Employment Details'),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _jobRoleId,
            decoration: _inputDecoration('Job Role *', Icons.work_outline),
            items: provider.jobRoles
                .map((r) => DropdownMenuItem(
                    value: r.id.toString(), child: Text(r.name)))
                .toList(),
            onChanged: (v) => setState(() => _jobRoleId = v),
            validator: (v) =>
                v == null || v.isEmpty ? 'Job role is required' : null,
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            value: _employmentType,
            decoration:
                _inputDecoration('Employment Type', Icons.badge_outlined),
            items: _employmentTypes
                .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                .toList(),
            onChanged: (v) => setState(() => _employmentType = v),
          ),
          const SizedBox(height: 14),
          _field(
            controller: _startDate,
            label: 'Start Date',
            icon: Icons.calendar_today_outlined,
            readOnly: true,
            onTap: () => _pickDate(
              current: _startDateValue,
              firstDate: DateTime(2000),
              lastDate: DateTime.now().add(const Duration(days: 365)),
              onPicked: (d) {
                _startDateValue = d;
                _startDate.text = '${d.day}/${d.month}/${d.year}';
              },
            ),
          ),
          const SizedBox(height: 14),
          _field(
            controller: _rate,
            label: 'Pay Rate',
            icon: Icons.attach_money,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
          ),
        ],
      ),
    );
  }

  // Step 4: Account
  Widget _stepAccount() {
    return Form(
      key: _formKeys[3],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionLabel('Login Account'),
          const SizedBox(height: 12),
          SwitchListTile(
            title: const Text('Enable Login'),
            subtitle:
                const Text('Allow this employee to log in to the app'),
            value: _enableLogin,
            activeColor: AppColors.primary,
            onChanged: (v) => setState(() => _enableLogin = v),
            contentPadding: EdgeInsets.zero,
          ),
          if (_enableLogin) ...[
            const SizedBox(height: 14),
            TextFormField(
              controller: _password,
              obscureText: _obscurePass,
              decoration: InputDecoration(
                labelText: 'Password *',
                prefixIcon: const Icon(Icons.lock_outline),
                suffixIcon: IconButton(
                  icon: Icon(_obscurePass
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined),
                  onPressed: () =>
                      setState(() => _obscurePass = !_obscurePass),
                ),
                border: const OutlineInputBorder(),
              ),
              validator: (v) {
                if (!_enableLogin) return null;
                if (v == null || v.length < 6) return 'Min 6 characters';
                return null;
              },
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _confirmPassword,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Confirm Password *',
                prefixIcon: Icon(Icons.lock_outline),
                border: OutlineInputBorder(),
              ),
              validator: (v) {
                if (!_enableLogin) return null;
                if (v != _password.text) return 'Passwords do not match';
                return null;
              },
            ),
          ],
        ],
      ),
    );
  }

  // Step 5: Emergency Contacts
  Widget _stepEmergencyContacts() {
    return Form(
      key: _formKeys[4],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionLabel('Emergency Contact'),
          const SizedBox(height: 12),
          _field(
            controller: _ecName,
            label: 'Contact Name',
            icon: Icons.person_outline,
          ),
          const SizedBox(height: 14),
          _field(
            controller: _ecPhone,
            label: 'Contact Phone',
            icon: Icons.phone_outlined,
            keyboardType: TextInputType.phone,
          ),
          const SizedBox(height: 14),
          _field(
            controller: _ecRelation,
            label: 'Relationship',
            icon: Icons.family_restroom,
          ),
        ],
      ),
    );
  }

  // Step 6: Review
  Widget _stepReview() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionLabel('Review & Submit'),
        const SizedBox(height: 12),
        _reviewCard('Personal', [
          _reviewRow('Name', '${_firstName.text} ${_lastName.text}'),
          _reviewRow('Date of Birth', _dob.text.isEmpty ? '-' : _dob.text),
          _reviewRow('Gender', _gender ?? '-'),
        ]),
        _reviewCard('Contact', [
          _reviewRow('Email', _email.text.isEmpty ? '-' : _email.text),
          _reviewRow('Phone', _phone.text.isEmpty ? '-' : _phone.text),
          _reviewRow('Address', [_street.text, _city.text, _stateCtrl.text, _postcode.text]
              .where((s) => s.isNotEmpty)
              .join(', ')),
        ]),
        _reviewCard('Employment', [
          _reviewRow('Job Role', _jobRoleName()),
          _reviewRow('Employment Type', _employmentType ?? '-'),
          _reviewRow('Start Date', _startDate.text.isEmpty ? '-' : _startDate.text),
          _reviewRow('Rate', _rate.text.isEmpty ? '-' : '\$${_rate.text}'),
        ]),
        _reviewCard('Account', [
          _reviewRow('Login Enabled', _enableLogin ? 'Yes' : 'No'),
        ]),
        if (_ecName.text.isNotEmpty)
          _reviewCard('Emergency', [
            _reviewRow('Name', _ecName.text),
            _reviewRow('Phone', _ecPhone.text),
            _reviewRow('Relation', _ecRelation.text),
          ]),
      ],
    );
  }

  String _jobRoleName() {
    final roles = context.read<EmployeesProvider>().jobRoles;
    final match = roles.where((r) => r.id.toString() == _jobRoleId);
    return match.isNotEmpty ? match.first.name : '-';
  }

  Widget _reviewCard(String title, List<Widget> rows) {
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.border, width: 0.5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 14,
                color: AppColors.primary,
              ),
            ),
            const Divider(height: 16),
            ...rows,
          ],
        ),
      ),
    );
  }

  Widget _reviewRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
            ),
          ),
          Expanded(
            child: Text(
              value.isEmpty ? '-' : value,
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

  // -------------------------------------------------------------------------
  // Navigation buttons
  // -------------------------------------------------------------------------
  Widget _buildNavButtons() {
    final isLast = _currentStep == 5;
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: const BoxDecoration(
        color: AppColors.white,
        border: Border(top: BorderSide(color: AppColors.divider)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            if (_currentStep > 0)
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => _currentStep--),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    side: const BorderSide(color: AppColors.border),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: const Text('Back'),
                ),
              ),
            if (_currentStep > 0) const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: FilledButton(
                onPressed: _submitting ? null : (isLast ? _submit : _nextStep),
                style: FilledButton.styleFrom(
                  backgroundColor: isLast ? AppColors.success : AppColors.primary,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: Text(isLast ? 'Create Employee' : 'Continue'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _nextStep() {
    if (_currentStep < 5 && _formKeys[_currentStep].currentState != null) {
      if (!_formKeys[_currentStep].currentState!.validate()) return;
    }
    setState(() => _currentStep++);
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    try {
      final data = <String, dynamic>{
        'first_name': _firstName.text.trim(),
        'last_name': _lastName.text.trim(),
        'email': _email.text.trim(),
        'phone': _phone.text.trim(),
        if (_gender != null) 'gender': _gender!.toLowerCase(),
        if (_dobDate != null) 'date_of_birth': _dobDate!.toIso8601String().split('T')[0],
        if (_street.text.isNotEmpty) 'street': _street.text.trim(),
        if (_city.text.isNotEmpty) 'city': _city.text.trim(),
        if (_stateCtrl.text.isNotEmpty) 'state': _stateCtrl.text.trim(),
        if (_postcode.text.isNotEmpty) 'postcode': _postcode.text.trim(),
        if (_jobRoleId != null) 'job_role_id': int.tryParse(_jobRoleId!) ?? _jobRoleId,
        if (_departmentId != null) 'department_id': int.tryParse(_departmentId!) ?? _departmentId,
        if (_employmentType != null)
          'employment_type': _employmentType!.toLowerCase().replaceAll('-', '_'),
        if (_startDateValue != null)
          'start_date': _startDateValue!.toIso8601String().split('T')[0],
        if (_rate.text.isNotEmpty) 'rate': double.tryParse(_rate.text) ?? 0,
        if (_enableLogin) 'enable_login': true,
        if (_enableLogin && _password.text.isNotEmpty) 'password': _password.text,
        if (_ecName.text.isNotEmpty)
          'emergency_contacts': [
            {
              'name': _ecName.text.trim(),
              'phone': _ecPhone.text.trim(),
              'relationship': _ecRelation.text.trim(),
            }
          ],
      };

      await context.read<EmployeesProvider>().createEmployee(data);
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Employee created successfully'),
          backgroundColor: AppColors.success,
        ),
      );
      context.pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to create employee: $e'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  Widget _sectionLabel(String text) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: AppColors.textPrimary,
      ),
    );
  }

  Widget _field({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
    bool readOnly = false,
    VoidCallback? onTap,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      readOnly: readOnly,
      onTap: onTap,
      validator: validator,
      decoration: _inputDecoration(label, icon),
    );
  }

  InputDecoration _inputDecoration(String label, IconData icon) {
    return InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon),
      border: const OutlineInputBorder(),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
    );
  }

  String? Function(String?) _required(String message) =>
      (v) => (v == null || v.trim().isEmpty) ? message : null;

  Future<void> _pickDate({
    DateTime? current,
    DateTime? firstDate,
    DateTime? lastDate,
    required void Function(DateTime) onPicked,
  }) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: current ?? DateTime.now(),
      firstDate: firstDate ?? DateTime(1950),
      lastDate: lastDate ?? DateTime.now(),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: Theme.of(ctx).colorScheme.copyWith(
                primary: AppColors.primary,
              ),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() => onPicked(picked));
    }
  }
}
