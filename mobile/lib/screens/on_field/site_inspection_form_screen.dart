import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/config/api_config.dart';
import '../../core/theme/app_colors.dart';
import '../../models/lead.dart';
import '../../providers/auth_provider.dart';
import '../../services/leads_service.dart';
import '../../services/site_inspection_service.dart';
import '../../widgets/common/file_picker_bottom_sheet.dart';
import '../../widgets/common/loading_overlay.dart';
import '../../widgets/common/status_badge.dart';
import 'inspection_sections.dart';

class SiteInspectionFormScreen extends StatefulWidget {
  final int leadId;
  const SiteInspectionFormScreen({super.key, required this.leadId});

  @override
  State<SiteInspectionFormScreen> createState() => _SiteInspectionFormScreenState();
}

class _SiteInspectionFormScreenState extends State<SiteInspectionFormScreen> {
  final SiteInspectionService _siService = SiteInspectionService();
  final LeadsService _leadService = LeadsService();
  
  bool _loading = true;
  bool _submitting = false;
  String? _error;
  
  Lead? _lead;
  Map<String, dynamic> _formData = {};
  int? _inspectionId;
  String _status = 'draft';

  late final PageController _pageController;
  int _currentStep = 0;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _loadData();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    
    try {
      final leadData = await _leadService.getLead(widget.leadId);
      _lead = Lead.fromJson(leadData['lead'] ?? leadData['data'] ?? leadData);
      
      final siResp = await _siService.getInspection(widget.leadId);
      if (siResp != null) {
        _inspectionId = siResp['id'];
        _status = siResp['status'] ?? 'draft';
        _formData = _normalizedFormPayload(siResp);
        _mergeLeadDefaults(_formData);
      } else {
        _formData = {
          'inspected_at': DateTime.now().toIso8601String(),
          'inspector_name': context.read<AuthProvider>().user?.name ?? '',
          'customer_name': _lead?.customerName ?? '',
          'jobDetails.inspectionCompany': 'xTechs Renewables Pty Ltd',
        };
        _mergeLeadDefaults(_formData);
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// Resolve value from dotted path or flat key
  dynamic _getValue(String key) {
    if (_formData.containsKey(key)) return _formData[key];
    
    // Check nested if not found as flat
    if (key.contains('.')) {
      final parts = key.split('.');
      dynamic current = _formData;
      for (final part in parts) {
        if (current is Map && (current.containsKey(part) || current.containsKey(_toCamelCase(part)))) {
          current = current[part] ?? current[_toCamelCase(part)];
        } else {
          return null;
        }
      }
      return current;
    }
    return null;
  }

  String _toCamelCase(String s) => s.split('_').asMap().entries.map((e) => e.key == 0 ? e.value : e.value[0].toUpperCase() + e.value.substring(1)).join();

  void _setValue(String key, dynamic val) {
    setState(() {
      _formData[key] = val;
    });
  }

  String _resolveUrl(dynamic rawUrl) {
    if (rawUrl == null || rawUrl.toString().isEmpty) return '';
    final url = rawUrl.toString().trim().replaceAll('\\', '/');
    if (url.startsWith('http')) return url;
    final cleaned = url.replaceFirst(RegExp(r'^\.?/'), '/');
    final normalized = cleaned.startsWith('/') ? cleaned : '/$cleaned';
    return '${ApiConfig.baseUrl}$normalized';
  }

  String? _normalizeInspectorName(dynamic raw) {
    final v = raw?.toString().trim() ?? '';
    if (v.isEmpty) return null;
    const allowed = ['Ashley Bronson', 'Liam Jackman', 'Clarke Dean'];
    for (final item in allowed) {
      if (item.toLowerCase() == v.toLowerCase()) return item;
    }
    return null;
  }

  String? _normalizeRoofType(dynamic raw) {
    final v = raw?.toString().trim().toLowerCase() ?? '';
    if (v.isEmpty) return null;
    if (v.contains('klip')) return 'Tin Kliplock';
    if (v.contains('colorbond') || v.contains('colourbond')) return 'Tin Colorbond';
    if (v.contains('shilling')) return 'Tile Shillings';
    if (v.contains('terracotta')) return 'Tile Terracotta';
    if (v.contains('concrete') && v.contains('tile')) return 'Tile Concrete';
    if (v.contains('tile')) return 'Tile Concrete';
    return null;
  }

  String? _normalizeMeterPhase(dynamic raw) {
    final v = raw?.toString().trim().toLowerCase() ?? '';
    if (v.isEmpty) return null;
    if (v == '1' || v == 'single' || v == 'one') return 'Single';
    if (v == '2' || v == 'double' || v == 'two') return 'Double';
    if (v == '3' || v == 'three' || v == 'triple') return 'Three';
    return null;
  }

  String? _normalizeHouseStorey(dynamic raw) {
    final v = raw?.toString().trim().toLowerCase() ?? '';
    if (v.isEmpty) return null;
    if (v == '1' || v == 'single' || v == 'one' || v == 'one storey' || v == 'one-story') return 'Single';
    if (v == '2' || v == 'double' || v == 'two' || v == 'two storey' || v == 'two-story') return 'Double';
    if (v == '3' || v == 'triple' || v == 'three' || v == 'multi' || v == 'triple storey') return 'Triple';
    return null;
  }

  bool _isEmptyVal(dynamic v) => v == null || v.toString().trim().isEmpty;

  void _mergeLeadDefaults(Map<String, dynamic> form) {
    final raw = _lead?.raw ?? <String, dynamic>{};
    final inspector = _normalizeInspectorName(raw['inspector_name']);
    final roof = _normalizeRoofType(raw['roof_type']);
    final meter = _normalizeMeterPhase(raw['meter_phase']);
    final storey = _normalizeHouseStorey(raw['house_storey']);

    if (_isEmptyVal(form['inspector_name']) && inspector != null) form['inspector_name'] = inspector;
    if (_isEmptyVal(form['roof_type']) && roof != null) form['roof_type'] = roof;
    if (_isEmptyVal(form['meter_phase']) && meter != null) form['meter_phase'] = meter;
    if (_isEmptyVal(form['house_storey']) && storey != null) form['house_storey'] = storey;
  }

  Map<String, dynamic> _normalizedFormPayload(Map<String, dynamic> siResp) {
    final rawForm = siResp['form'];
    final form = rawForm is Map<String, dynamic>
        ? Map<String, dynamic>.from(rawForm)
        : rawForm is Map
            ? Map<String, dynamic>.from(rawForm)
            : <String, dynamic>{};

    const topLevelKeys = [
      'inspected_at',
      'inspector_name',
      'customer_name',
      'roof_type',
      'roof_pitch_deg',
      'house_storey',
      'meter_phase',
      'inverter_location',
      'msb_condition',
      'shading',
      'signature_url',
      'customer_notes',
    ];

    for (final key in topLevelKeys) {
      final val = siResp[key];
      if (val != null && (form[key] == null || form[key].toString().trim().isEmpty)) {
        form[key] = val;
      }
    }

    return form;
  }

  String _extractPhotoUrl(dynamic photoData) {
    if (photoData == null) return '';
    if (photoData is String) return _resolveUrl(photoData);
    if (photoData is Map) {
      final raw = photoData['storage_url'] ??
          photoData['storageUrl'] ??
          photoData['url'] ??
          photoData['file_url'] ??
          photoData['fileUrl'] ??
          photoData['path'];
      return _resolveUrl(raw);
    }
    return '';
  }

  Future<void> _pickFile(String fieldKey) async {
    final result = await showFilePickerSheet(context, imageOnly: true);
    if (result == null) return;

    setState(() => _submitting = true);
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          result.file.path,
          filename: result.name,
        ),
      });
      final uploaded = await _siService.uploadFile(widget.leadId, formData);
      _setValue(fieldKey, {
        ...uploaded,
        'storage_url': uploaded['storage_url'] ?? uploaded['storageUrl'] ?? uploaded['file_url'] ?? uploaded['fileUrl'] ?? uploaded['url'],
        'filename': uploaded['filename'] ?? result.name,
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Upload failed: $e'), backgroundColor: AppColors.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _submit(bool isDraft) async {
    setState(() => _submitting = true);
    try {
      final payload = Map<String, dynamic>.from(_formData);
      if (_inspectionId != null) payload['id'] = _inspectionId;

      if (isDraft) {
        await _siService.saveDraft(widget.leadId, payload);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Draft saved'), backgroundColor: AppColors.primary),
          );
        }
      } else {
        for (final section in inspectionSections) {
          for (final field in section.fields) {
            final val = _getValue(field.key);
            if (field.required && (val == null || val.toString().trim().isEmpty)) {
              setState(() => _currentStep = inspectionSections.indexOf(section));
              _pageController.jumpToPage(_currentStep);
              throw Exception('Field "${field.label}" in "${section.label}" is required.');
            }
          }
        }

        await _siService.submit(widget.leadId, payload);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Inspection submitted successfully'), backgroundColor: AppColors.success),
          );
          Navigator.pop(context, true);
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceAll('Exception: ', '')), backgroundColor: AppColors.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Site Inspection Form'),
        actions: [
          if (!_loading && _error == null)
            TextButton(
              onPressed: _submitting ? null : () => _submit(true),
              child: const Text('Save Draft', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
            ),
        ],
      ),
      body: LoadingOverlay(
        isLoading: _submitting,
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
            : _error != null
                ? _buildErrorState()
                : _buildMainContent(),
      ),
      bottomNavigationBar: _loading || _error != null ? null : _buildBottomActions(),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.error_outline, size: 48, color: AppColors.danger),
        const SizedBox(height: 16),
        Text(_error!, textAlign: TextAlign.center),
        const SizedBox(height: 24),
        FilledButton(onPressed: _loadData, child: const Text('Retry')),
      ])),
    );
  }

  Widget _buildMainContent() {
    return Column(
      children: [
        _buildStepRail(),
        _buildProgressIndicator(),
        Expanded(
          child: PageView.builder(
            controller: _pageController,
            onPageChanged: (idx) => setState(() => _currentStep = idx),
            itemCount: inspectionSections.length,
            itemBuilder: (context, idx) => _buildSectionForm(inspectionSections[idx]),
          ),
        ),
      ],
    );
  }

  Widget _buildStepRail() {
    return Container(
      height: 60,
      decoration: BoxDecoration(color: AppColors.white, border: Border(bottom: BorderSide(color: AppColors.border))),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        itemCount: inspectionSections.length,
        itemBuilder: (context, idx) {
          final active = idx == _currentStep;
          final done = idx < _currentStep;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: InkWell(
              onTap: () {
                setState(() => _currentStep = idx);
                _pageController.animateToPage(idx, duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
              },
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: active ? AppColors.primary : (done ? AppColors.primary.withOpacity(0.1) : AppColors.surface),
                  borderRadius: BorderRadius.circular(25),
                  border: Border.all(color: active ? AppColors.primary : AppColors.border),
                ),
                child: Row(
                  children: [
                    if (done) ...[const Icon(Icons.check_circle, size: 16, color: AppColors.primary), const SizedBox(width: 6)],
                    Text(
                      '${idx + 1}. ${inspectionSections[idx].label}',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: active ? FontWeight.w800 : (done ? FontWeight.w600 : FontWeight.w500),
                        color: active ? Colors.white : (done ? AppColors.primary : AppColors.textSecondary),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildProgressIndicator() {
    final progress = (_currentStep + 1) / inspectionSections.length;
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Step ${_currentStep + 1} of ${inspectionSections.length}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.textSecondary)),
              Text('${(progress * 100).round()}% Completed', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppColors.primary)),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 6,
              backgroundColor: AppColors.border,
              valueColor: const AlwaysStoppedAnimation(AppColors.primary),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomActions() {
    final isLast = _currentStep == inspectionSections.length - 1;
    final isFirst = _currentStep == 0;
    
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      decoration: BoxDecoration(
        color: AppColors.white,
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -4))],
      ),
      child: Row(
        children: [
          if (!isFirst)
            Expanded(
              child: OutlinedButton(
                onPressed: () => _pageController.previousPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut),
                style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                child: const Text('Back'),
              ),
            ),
          if (!isFirst) const SizedBox(width: 12),
          Expanded(
            child: FilledButton(
              onPressed: isLast ? () => _submit(false) : () => _pageController.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut),
              style: FilledButton.styleFrom(
                backgroundColor: isLast ? AppColors.success : AppColors.primary,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: Text(isLast ? 'Submit Inspection' : 'Next Step', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionForm(InspectionSection section) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(section.label, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
        const SizedBox(height: 16),
        ...section.fields.map(_buildFieldControl),
        const SizedBox(height: 80),
      ],
    );
  }

  Widget _buildFieldControl(InspectionField field) {
    final val = _getValue(field.key);
    
    switch (field.type) {
      case InspectionFieldType.text:
      case InspectionFieldType.number:
      case InspectionFieldType.textarea:
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: TextFormField(
            key: Key('${field.key}_$_currentStep'), // Force rebuild on step change for correct local state
            initialValue: val?.toString() ?? field.defaultValue ?? '',
            keyboardType: field.type == InspectionFieldType.number ? TextInputType.number : TextInputType.text,
            maxLines: field.type == InspectionFieldType.textarea ? 3 : 1,
            decoration: InputDecoration(
              labelText: field.required ? '${field.label} *' : field.label,
              hintText: field.placeholder,
              floatingLabelBehavior: FloatingLabelBehavior.always,
            ),
            onChanged: (v) => _formData[field.key] = v,
          ),
        );
      case InspectionFieldType.select:
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: DropdownButtonFormField<String>(
            value: field.options!.contains(val?.toString()) ? val.toString() : null,
            decoration: InputDecoration(
              labelText: field.required ? '${field.label} *' : field.label,
              floatingLabelBehavior: FloatingLabelBehavior.always,
            ),
            items: field.options!.map((e) => DropdownMenuItem(value: e, child: Text(e, style: const TextStyle(fontSize: 13)))).toList(),
            onChanged: (v) => _setValue(field.key, v),
          ),
        );
      case InspectionFieldType.datetime:
        return _buildDateTimeField(field);
      case InspectionFieldType.photo:
        return _buildPhotoField(field);
      case InspectionFieldType.multiselect:
        return _buildMultiSelectField(field);
    }
  }

  Widget _buildDateTimeField(InspectionField field) {
    final val = _getValue(field.key);
    final current = DateTime.tryParse(val?.toString() ?? '') ?? DateTime.now();
    final dateStr = DateFormat('dd MMM yyyy').format(current);
    final timeStr = DateFormat('hh:mm a').format(current);

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(field.label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () async {
                    final picked = await showDatePicker(context: context, initialDate: current, firstDate: DateTime(2020), lastDate: DateTime(2030));
                    if (picked != null) {
                      final next = DateTime(picked.year, picked.month, picked.day, current.hour, current.minute);
                      _setValue(field.key, next.toIso8601String());
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(border: Border.all(color: AppColors.border), borderRadius: BorderRadius.circular(10)),
                    child: Row(children: [const Icon(Icons.calendar_today, size: 16, color: AppColors.primary), const SizedBox(width: 10), Text(dateStr, style: const TextStyle(fontSize: 13))]),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: InkWell(
                  onTap: () async {
                    final picked = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(current));
                    if (picked != null) {
                      final next = DateTime(current.year, current.month, current.day, picked.hour, picked.minute);
                      _setValue(field.key, next.toIso8601String());
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(border: Border.all(color: AppColors.border), borderRadius: BorderRadius.circular(10)),
                    child: Row(children: [const Icon(Icons.access_time, size: 16, color: AppColors.primary), const SizedBox(width: 10), Text(timeStr, style: const TextStyle(fontSize: 13))]),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPhotoField(InspectionField field) {
    final photoData = _getValue(field.key);
    final url = _extractPhotoUrl(photoData);

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(field.label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
          const SizedBox(height: 8),
          if (url.isNotEmpty)
            Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: AspectRatio(
                    aspectRatio: 16 / 9,
                    child: Image.network(url, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Icon(Icons.broken_image)),
                  ),
                ),
                Positioned(
                  top: 8,
                  right: 8,
                  child: CircleAvatar(
                    backgroundColor: Colors.white.withOpacity(0.9),
                    radius: 18,
                    child: IconButton(onPressed: () => setState(() => _formData.remove(field.key)), icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.danger)),
                  ),
                ),
              ],
            )
          else
            InkWell(
              onTap: () => _pickFile(field.key),
              child: Container(
                height: 100,
                width: double.infinity,
                decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border, style: BorderStyle.solid)),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.add_a_photo_outlined, size: 28, color: AppColors.primary),
                    const SizedBox(height: 4),
                    Text('Tap to upload ${field.label}', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildMultiSelectField(InspectionField field) {
    final val = _getValue(field.key);
    final List<dynamic> current = val is List ? List<dynamic>.from(val) : [];

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(field.label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
          const SizedBox(height: 8),
          ...field.options!.map((opt) {
            final active = current.contains(opt);
            return CheckboxListTile(
              value: active,
              title: Text(opt, style: const TextStyle(fontSize: 13)),
              controlAffinity: ListTileControlAffinity.leading,
              contentPadding: EdgeInsets.zero,
              activeColor: AppColors.primary,
              dense: true,
              onChanged: (val) {
                setState(() {
                  if (val == true) {
                    current.add(opt);
                  } else {
                    current.remove(opt);
                  }
                  _formData[field.key] = current;
                });
              },
            );
          }),
        ],
      ),
    );
  }
}
