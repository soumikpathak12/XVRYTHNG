import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../services/companies_service.dart';

class CompanyCreateScreen extends StatefulWidget {
  const CompanyCreateScreen({super.key});

  @override
  State<CompanyCreateScreen> createState() => _CompanyCreateScreenState();
}

class _CompanyCreateScreenState extends State<CompanyCreateScreen> {
  final _service = CompaniesService();
  final _formKey = GlobalKey<FormState>();

  final _companyNameCtrl = TextEditingController();
  final _abnCtrl = TextEditingController();
  final _contactEmailCtrl = TextEditingController();
  final _contactPhoneCtrl = TextEditingController();
  final _address1Ctrl = TextEditingController();
  final _address2Ctrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _stateCtrl = TextEditingController();
  final _postcodeCtrl = TextEditingController();
  final _countryCtrl = TextEditingController(text: 'Australia');
  final _adminNameCtrl = TextEditingController();
  final _adminEmailCtrl = TextEditingController();
  final _adminPasswordCtrl = TextEditingController();

  List<Map<String, dynamic>> _companyTypes = const [];
  String? _companyTypeId;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadTypes();
  }

  @override
  void dispose() {
    _companyNameCtrl.dispose();
    _abnCtrl.dispose();
    _contactEmailCtrl.dispose();
    _contactPhoneCtrl.dispose();
    _address1Ctrl.dispose();
    _address2Ctrl.dispose();
    _cityCtrl.dispose();
    _stateCtrl.dispose();
    _postcodeCtrl.dispose();
    _countryCtrl.dispose();
    _adminNameCtrl.dispose();
    _adminEmailCtrl.dispose();
    _adminPasswordCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadTypes() async {
    try {
      final types = await _service.getCompanyTypes();
      if (!mounted) return;
      setState(() {
        _companyTypes = types;
        if (_companyTypes.isNotEmpty) {
          _companyTypeId = '${_companyTypes.first['id']}';
        }
      });
    } catch (_) {
      // Keep optional dropdown empty if types fail.
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      await _service.createCompany({
        'company': {
          'name': _companyNameCtrl.text.trim(),
          if (_abnCtrl.text.trim().isNotEmpty) 'abn': _abnCtrl.text.trim(),
          if (_contactEmailCtrl.text.trim().isNotEmpty)
            'contact_email': _contactEmailCtrl.text.trim(),
          if (_contactPhoneCtrl.text.trim().isNotEmpty)
            'contact_phone': _contactPhoneCtrl.text.trim(),
          if (_companyTypeId != null && _companyTypeId!.isNotEmpty)
            'company_type_id': int.tryParse(_companyTypeId!),
          if (_address1Ctrl.text.trim().isNotEmpty)
            'address_line1': _address1Ctrl.text.trim(),
          if (_address2Ctrl.text.trim().isNotEmpty)
            'address_line2': _address2Ctrl.text.trim(),
          if (_cityCtrl.text.trim().isNotEmpty) 'city': _cityCtrl.text.trim(),
          if (_stateCtrl.text.trim().isNotEmpty)
            'state': _stateCtrl.text.trim(),
          if (_postcodeCtrl.text.trim().isNotEmpty)
            'postcode': _postcodeCtrl.text.trim(),
          if (_countryCtrl.text.trim().isNotEmpty)
            'country': _countryCtrl.text.trim(),
        },
        'admin': {
          'name': _adminNameCtrl.text.trim(),
          'email': _adminEmailCtrl.text.trim(),
          'password': _adminPasswordCtrl.text,
        }
      });
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Add Partner Company'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          children: [
            if (_error != null) ...[
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.danger.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.danger.withOpacity(0.2)),
                ),
                child: Text(
                  _error!,
                  style: const TextStyle(
                    color: AppColors.danger,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
            TextFormField(
              controller: _companyNameCtrl,
              decoration: const InputDecoration(
                labelText: 'Company Name',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.business),
              ),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _abnCtrl,
              decoration: const InputDecoration(
                labelText: 'ABN',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.numbers),
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _contactEmailCtrl,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Contact Email',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.email_outlined),
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _contactPhoneCtrl,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Contact Phone',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.phone_outlined),
              ),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _companyTypeId,
              decoration: const InputDecoration(
                labelText: 'Company Type',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.category_outlined),
              ),
              items: _companyTypes.map((t) {
                final id = '${t['id']}';
                final label =
                    (t['name'] ?? id).toString().replaceAll('_', ' ');
                return DropdownMenuItem(value: id, child: Text(label));
              }).toList(),
              onChanged: (v) => setState(() => _companyTypeId = v),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _address1Ctrl,
              decoration: const InputDecoration(
                labelText: 'Address Line 1',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.location_on_outlined),
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _address2Ctrl,
              decoration: const InputDecoration(
                labelText: 'Address Line 2',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.map_outlined),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _cityCtrl,
                    decoration: const InputDecoration(
                      labelText: 'City',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextFormField(
                    controller: _stateCtrl,
                    decoration: const InputDecoration(
                      labelText: 'State',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _postcodeCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Postcode',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextFormField(
                    controller: _countryCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Country',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            const Text(
              'Company Admin Account',
              style: TextStyle(
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _adminNameCtrl,
              decoration: const InputDecoration(
                labelText: 'Admin Name',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.person_outline),
              ),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _adminEmailCtrl,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Admin Email',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.alternate_email),
              ),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Required';
                if (!v.contains('@')) return 'Invalid email';
                return null;
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _adminPasswordCtrl,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Admin Password (min 8 chars)',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.lock_outline),
              ),
              validator: (v) {
                if (v == null || v.isEmpty) return 'Required';
                if (v.length < 8) return 'Minimum 8 characters';
                return null;
              },
            ),
            const SizedBox(height: 18),
            SizedBox(
              height: 50,
              child: FilledButton(
                onPressed: _submitting ? null : _submit,
                child: Text(_submitting ? 'Creating...' : 'Create Company'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
