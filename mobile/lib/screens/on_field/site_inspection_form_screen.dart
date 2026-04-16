import 'package:dio/dio.dart';
import 'dart:ui' as ui;
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import '../../core/config/api_config.dart';
import '../../core/network/api_exceptions.dart';
import '../../core/theme/app_colors.dart';
import '../../models/lead.dart';
import '../../providers/auth_provider.dart';
import '../../services/leads_service.dart';
import '../../services/site_inspection_service.dart';
import '../../widgets/common/file_picker_bottom_sheet.dart';
import '../../widgets/common/loading_overlay.dart';
import 'inspection_sections.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:pdf/pdf.dart';
import 'package:printing/printing.dart';

class SiteInspectionFormScreen extends StatefulWidget {
  final int leadId;
  const SiteInspectionFormScreen({super.key, required this.leadId});

  @override
  State<SiteInspectionFormScreen> createState() =>
      _SiteInspectionFormScreenState();
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

  late final PageController _pageController;
  int _currentStep = 0;
  final GlobalKey _signatureKey = GlobalKey();
  final List<Offset?> _signaturePoints = [];
  final TextEditingController _customerNameCtrl = TextEditingController();
  final TextEditingController _customerNotesCtrl = TextEditingController();
  bool _customerConfirmed = false;
  bool _isSigning = false;
  String? _generatedSignature;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _loadData();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _customerNameCtrl.dispose();
    _customerNotesCtrl.dispose();
    super.dispose();
  }

  Future<void> _exportPdf() async {
    try {
      if (_lead == null) {
        await _loadData();
      }

      final doc = pw.Document();
      final lead = _lead;
      final inspectedAt = _parseDateTimeValue(_getValue('inspected_at')) ??
          DateTime.now();

      String clean(dynamic v) =>
          (v == null || v.toString().trim().isEmpty) ? '-' : v.toString().trim();

      doc.addPage(
        pw.MultiPage(
          pageFormat: PdfPageFormat.a4,
          build: (context) {
            return [
              pw.Header(
                level: 0,
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      'Site Inspection Report',
                      style: pw.TextStyle(
                        fontSize: 20,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                    pw.SizedBox(height: 4),
                    pw.Text(
                      'Lead #${widget.leadId}',
                      style: const pw.TextStyle(fontSize: 10),
                    ),
                  ],
                ),
              ),
              pw.SizedBox(height: 12),
              pw.Text(
                'Customer',
                style: pw.TextStyle(
                  fontSize: 13,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.SizedBox(height: 6),
              pw.Table(
                border: pw.TableBorder.all(width: 0.3),
                defaultVerticalAlignment: pw.TableCellVerticalAlignment.middle,
                children: [
                  pw.TableRow(
                    children: [
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(6),
                        child: pw.Text('Name'),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(6),
                        child: pw.Text(
                          clean(lead?.customerName ?? _getValue('customer_name')),
                        ),
                      ),
                    ],
                  ),
                  pw.TableRow(
                    children: [
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(6),
                        child: pw.Text('Suburb'),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(6),
                        child: pw.Text(clean(lead?.suburb)),
                      ),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 16),
              pw.Text(
                'Inspection Summary',
                style: pw.TextStyle(
                  fontSize: 13,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.SizedBox(height: 6),
              pw.Table(
                border: pw.TableBorder.all(width: 0.3),
                defaultVerticalAlignment: pw.TableCellVerticalAlignment.middle,
                children: [
                  pw.TableRow(
                    children: [
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(6),
                        child: pw.Text('Inspected At'),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(6),
                        child: pw.Text(
                          DateFormat('dd MMM yyyy, hh:mm a').format(inspectedAt),
                        ),
                      ),
                    ],
                  ),
                  pw.TableRow(
                    children: [
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(6),
                        child: pw.Text('Inspector'),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(6),
                        child: pw.Text(clean(_getValue('inspector_name'))),
                      ),
                    ],
                  ),
                  pw.TableRow(
                    children: [
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(6),
                        child: pw.Text('Roof Type'),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(6),
                        child: pw.Text(clean(_getValue('roof_type'))),
                      ),
                    ],
                  ),
                  pw.TableRow(
                    children: [
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(6),
                        child: pw.Text('Meter Phase'),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(6),
                        child: pw.Text(clean(_getValue('meter_phase'))),
                      ),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 16),
              pw.Text(
                'Customer Sign-off',
                style: pw.TextStyle(
                  fontSize: 13,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.SizedBox(height: 6),
              pw.Table(
                border: pw.TableBorder.all(width: 0.3),
                defaultVerticalAlignment: pw.TableCellVerticalAlignment.middle,
                children: [
                  pw.TableRow(
                    children: [
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(6),
                        child: pw.Text('Customer Name'),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(6),
                        child: pw.Text(clean(_getValue('customer_name'))),
                      ),
                    ],
                  ),
                  pw.TableRow(
                    children: [
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(6),
                        child: pw.Text('Confirmed'),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(6),
                        child: pw.Text(_customerConfirmed ? 'Yes' : 'No'),
                      ),
                    ],
                  ),
                  pw.TableRow(
                    children: [
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(6),
                        child: pw.Text('Notes'),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(6),
                        child: pw.Text(
                          clean(_customerNotesCtrl.text.isNotEmpty
                              ? _customerNotesCtrl.text
                              : _getValue('customer_notes')),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 24),
              pw.Text(
                'Summary only',
                style: const pw.TextStyle(
                  fontSize: 9,
                  color: PdfColor.fromInt(0x777777),
                ),
              ),
            ];
          },
        ),
      );

      final Uint8List bytes = await doc.save();
      await Printing.sharePdf(
        bytes: bytes,
        filename: 'site-inspection-${widget.leadId}.pdf',
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to export PDF: $e'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
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
        _formData = _normalizedFormPayload(siResp);
        _mergeLeadDefaults(_formData);
        _syncSignoffFieldsFromForm();
      } else {
        _formData = {
          'inspected_at': '',
          'inspector_name': '',
          'customer_name': _lead?.customerName ?? '',
          'jobDetails.inspectionCompany': 'xTechs Renewables Pty Ltd',
        };
        _mergeLeadDefaults(_formData);
        if (_isEmptyVal(_formData['inspected_at'])) {
          _formData['inspected_at'] = _toSqlDateTime(DateTime.now());
        }
        if (_isEmptyVal(_formData['inspector_name'])) {
          _formData['inspector_name'] =
              context.read<AuthProvider>().user?.name ?? '';
        }
        _syncSignoffFieldsFromForm();
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
        if (current is Map &&
            (current.containsKey(part) ||
                current.containsKey(_toCamelCase(part)))) {
          current = current[part] ?? current[_toCamelCase(part)];
        } else {
          return null;
        }
      }
      return current;
    }
    return null;
  }

  String _toCamelCase(String s) => s
      .split('_')
      .asMap()
      .entries
      .map(
        (e) => e.key == 0
            ? e.value
            : e.value[0].toUpperCase() + e.value.substring(1),
      )
      .join();

  void _setValue(String key, dynamic val) {
    setState(() {
      _formData[key] = val;
      if (key == 'recommendations.count') {
        final count = int.tryParse('${val ?? '0'}') ?? 0;
        _trimRecommendationOptions(count.clamp(0, 10));
      }
    });
  }

  void _trimRecommendationOptions(int count) {
    final keys = _formData.keys
        .where((k) => k.startsWith('recommendations.option_'))
        .toList();
    for (final key in keys) {
      final suffix = key.substring('recommendations.option_'.length);
      final index = int.tryParse(suffix);
      if (index != null && index > count) {
        _formData.remove(key);
      }
    }
  }

  int _recommendationCount() {
    final raw = _getValue('recommendations.count');
    final parsed = int.tryParse('${raw ?? '0'}') ?? 0;
    return parsed.clamp(0, 10);
  }

  List<InspectionField> _fieldsForSection(InspectionSection section) {
    final base = section.id == 'final'
        ? section.fields
              .where(
                (f) =>
                    f.key != 'customer_name' &&
                    f.key != 'signature_url' &&
                    f.key != 'customer_notes',
              )
              .toList()
        : section.fields;

    if (section.id != 'final') return base;

    final result = <InspectionField>[];
    final count = _recommendationCount();
    for (final field in base) {
      result.add(field);
      if (field.key == 'recommendations.count' && count > 0) {
        for (var i = 1; i <= count; i++) {
          result.add(
            InspectionField(
              key: 'recommendations.option_$i',
              label: 'Recommendation Option $i',
              type: InspectionFieldType.text,
              placeholder: 'Enter recommendation option $i',
            ),
          );
        }
      }
    }
    return result;
  }

  void _syncSignoffFieldsFromForm() {
    _customerNameCtrl.text = _getValue('customer_name')?.toString() ?? '';
    _customerNotesCtrl.text = _getValue('customer_notes')?.toString() ?? '';
    final confirmedRaw = _getValue('customer_confirmed');
    final confirmedText = confirmedRaw?.toString().toLowerCase().trim();
    _customerConfirmed =
        confirmedText == 'true' ||
        confirmedText == '1' ||
        confirmedText == 'yes';
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
    return v;
  }

  String? _normalizeRoofType(dynamic raw) {
    final v = raw?.toString().trim().toLowerCase() ?? '';
    if (v.isEmpty) return null;
    if (v.contains('klip')) return 'Tin Kliplock';
    if (v.contains('colorbond') || v.contains('colourbond'))
      return 'Tin Colorbond';
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
    if (v == '1' ||
        v == 'single' ||
        v == 'one' ||
        v == 'one storey' ||
        v == 'one-story')
      return 'Single';
    if (v == '2' ||
        v == 'double' ||
        v == 'two' ||
        v == 'two storey' ||
        v == 'two-story')
      return 'Double';
    if (v == '3' ||
        v == 'triple' ||
        v == 'three' ||
        v == 'multi' ||
        v == 'triple storey')
      return 'Triple';
    return null;
  }

  bool _isEmptyVal(dynamic v) => v == null || v.toString().trim().isEmpty;

  DateTime? _parseDateTimeValue(dynamic raw) {
    if (raw == null) return null;
    if (raw is DateTime) return raw.toLocal();
    final text = raw.toString().trim();
    if (text.isEmpty) return null;
    final parsed = DateTime.tryParse(text);
    if (parsed != null) return parsed.toLocal();
    return null;
  }

  String _toSqlDateTime(DateTime dt) {
    final local = dt.toLocal();
    final yyyy = local.year.toString().padLeft(4, '0');
    final mm = local.month.toString().padLeft(2, '0');
    final dd = local.day.toString().padLeft(2, '0');
    final hh = local.hour.toString().padLeft(2, '0');
    final mi = local.minute.toString().padLeft(2, '0');
    final ss = local.second.toString().padLeft(2, '0');
    return '$yyyy-$mm-$dd $hh:$mi:$ss';
  }

  void _mergeLeadDefaults(Map<String, dynamic> form) {
    final raw = _lead?.raw ?? <String, dynamic>{};
    final inspector = _normalizeInspectorName(
      raw['inspector_name'] ?? raw['assigned_to_name'],
    );
    final inspectedAt =
        raw['site_inspection_date'] ??
        raw['site_inspection_scheduled_at'] ??
        raw['scheduled_date'] ??
        raw['scheduled_at'];
    final roof = _normalizeRoofType(raw['roof_type']);
    final meter = _normalizeMeterPhase(raw['meter_phase']);
    final storey = _normalizeHouseStorey(raw['house_storey']);
    final customerName = raw['customer_name']?.toString().trim();
    final nmi = raw['nmi_number']?.toString().trim();
    final meterNumber = raw['meter_number']?.toString().trim();

    if (_isEmptyVal(form['inspected_at']) &&
        !_isEmptyVal(inspectedAt) &&
        _parseDateTimeValue(inspectedAt) != null) {
      form['inspected_at'] = _toSqlDateTime(_parseDateTimeValue(inspectedAt)!);
    }
    if (_isEmptyVal(form['inspector_name']) && inspector != null)
      form['inspector_name'] = inspector;
    if (_isEmptyVal(form['roof_type']) && roof != null)
      form['roof_type'] = roof;
    if (_isEmptyVal(form['roofProfile.roofMaterial']) && roof != null) {
      form['roofProfile.roofMaterial'] = roof;
    }
    if (_isEmptyVal(form['customer_name']) && !_isEmptyVal(customerName)) {
      form['customer_name'] = customerName;
    }
    if (_isEmptyVal(form['meter_phase']) && meter != null)
      form['meter_phase'] = meter;
    if (_isEmptyVal(form['house_storey']) && storey != null)
      form['house_storey'] = storey;
    if (_isEmptyVal(form['switchboard.nmi']) && !_isEmptyVal(nmi)) {
      form['switchboard.nmi'] = nmi;
    }
    if (_isEmptyVal(form['switchboard.meterNumber']) &&
        !_isEmptyVal(meterNumber)) {
      form['switchboard.meterNumber'] = meterNumber;
    }
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
      if (val != null &&
          (form[key] == null || form[key].toString().trim().isEmpty)) {
        form[key] = val;
      }
    }

    if (_isEmptyVal(form['inspected_at'])) {
      final candidate =
          siResp['site_inspection_date'] ??
          siResp['site_inspection_scheduled_at'] ??
          siResp['scheduled_date'] ??
          siResp['scheduled_at'];
      if (!_isEmptyVal(candidate) && _parseDateTimeValue(candidate) != null) {
        form['inspected_at'] = _toSqlDateTime(_parseDateTimeValue(candidate)!);
      }
    }

    if (_isEmptyVal(form['inspector_name'])) {
      final candidate = _normalizeInspectorName(
        siResp['inspector_name'] ?? siResp['assigned_to_name'],
      );
      if (candidate != null) form['inspector_name'] = candidate;
    }

    return form;
  }

  String _extractPhotoUrl(dynamic photoData) {
    if (photoData == null) return '';
    if (photoData is String) return _resolveUrl(photoData);
    if (photoData is Map) {
      final raw =
          photoData['storage_url'] ??
          photoData['storageUrl'] ??
          photoData['url'] ??
          photoData['file_url'] ??
          photoData['fileUrl'] ??
          photoData['path'];
      return _resolveUrl(raw);
    }
    return '';
  }

  String? _extractLocalPhotoPath(dynamic photoData) {
    if (photoData is Map) {
      final local = photoData['local_path'] ?? photoData['localPath'];
      if (local != null) {
        final path = local.toString().trim();
        if (path.isNotEmpty && File(path).existsSync()) return path;
      }
    }
    return null;
  }

  List<String> _buildPhotoUrlCandidates(String url) {
    if (url.isEmpty) return const [];
    final candidates = <String>[];
    void add(String value) {
      final trimmed = value.trim();
      if (trimmed.isNotEmpty && !candidates.contains(trimmed)) {
        candidates.add(trimmed);
      }
    }

    add(url);
    final encoded = _encodeUrl(url);
    if (encoded != null) add(encoded);

    if (url.contains('/api/uploads/')) {
      final noApi = url.replaceFirst('/api/uploads/', '/uploads/');
      add(noApi);
      final noApiEncoded = _encodeUrl(noApi);
      if (noApiEncoded != null) add(noApiEncoded);
    }

    return candidates;
  }

  String? _encodeUrl(String input) {
    try {
      final uri = Uri.parse(input);
      final encoded = uri.replace(
        pathSegments: uri.pathSegments
            .map(Uri.decodeComponent)
            .map(Uri.encodeComponent)
            .toList(),
      );
      return encoded.toString();
    } catch (_) {
      return null;
    }
  }

  Future<void> _pickFile(String fieldKey) async {
    final result = await showFilePickerSheet(
      context,
      imageOnly: true,
      imageQuality: 65,
      maxWidth: 1280,
      maxHeight: 1280,
    );
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
      final storageUrl =
          uploaded['storage_url'] ??
          uploaded['storageUrl'] ??
          uploaded['file_url'] ??
          uploaded['fileUrl'] ??
          uploaded['url'];
      if (fieldKey == 'signature_url') {
        _setValue(fieldKey, _resolveUrl(storageUrl));
      } else {
        _setValue(fieldKey, {
          ...uploaded,
          'storage_url': storageUrl,
          'filename': uploaded['filename'] ?? result.name,
          'local_path': result.file.path,
        });
      }
    } on ApiException catch (e) {
      final message = e.statusCode == 413
          ? 'Image is too large. Please use a smaller image and try again.'
          : 'Upload failed: ${e.message}';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message), backgroundColor: AppColors.danger),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Upload failed: $e'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _submit(bool isDraft) async {
    setState(() => _submitting = true);
    try {
      await _prepareCustomerSignoff(requireComplete: !isDraft);
      final payload = Map<String, dynamic>.from(_formData);
      if (_inspectionId != null) payload['id'] = _inspectionId;

      if (isDraft) {
        await _siService.saveDraft(widget.leadId, payload);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Draft saved'),
              backgroundColor: AppColors.primary,
            ),
          );
        }
      } else {
        for (final section in inspectionSections) {
          for (final field in section.fields) {
            final val = _getValue(field.key);
            if (field.required &&
                (val == null || val.toString().trim().isEmpty)) {
              setState(
                () => _currentStep = inspectionSections.indexOf(section),
              );
              _pageController.jumpToPage(_currentStep);
              throw Exception(
                'Field "${field.label}" in "${section.label}" is required.',
              );
            }
          }
        }

        await _siService.submit(widget.leadId, payload);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Inspection submitted successfully'),
              backgroundColor: AppColors.success,
            ),
          );
          Navigator.pop(context, true);
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceAll('Exception: ', '')),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _prepareCustomerSignoff({required bool requireComplete}) async {
    final customerName = _customerNameCtrl.text.trim();
    final customerNotes = _customerNotesCtrl.text.trim();
    _formData['customer_name'] = customerName;
    _formData['customer_notes'] = customerNotes;
    _formData['customer_confirmed'] = _customerConfirmed;

    final hasDrawnSignature =
        _signaturePoints.any((p) => p != null) || _generatedSignature != null;
    final existingSignature =
        _getValue('signature_url')?.toString().trim() ?? '';

    if (hasDrawnSignature) {
      final signatureFile = await _exportSignatureToFile();
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          signatureFile.path,
          filename: 'signature_${DateTime.now().millisecondsSinceEpoch}.png',
        ),
        'section': 'signature',
      });
      final uploaded = await _siService.uploadFile(widget.leadId, formData);
      final storageUrl =
          uploaded['storage_url'] ??
          uploaded['storageUrl'] ??
          uploaded['file_url'] ??
          uploaded['fileUrl'] ??
          uploaded['url'];
      _formData['signature_url'] = _resolveUrl(storageUrl);
      _signaturePoints.clear();
    }

    final finalSignature = _getValue('signature_url')?.toString().trim() ?? '';
    if (requireComplete) {
      if (customerName.isEmpty) {
        throw Exception('Customer name is required for sign-off.');
      }
      if (finalSignature.isEmpty && existingSignature.isEmpty) {
        throw Exception('Customer signature is required.');
      }
      if (!_customerConfirmed) {
        throw Exception(
          'Please confirm that the site inspection has been completed.',
        );
      }
    }
  }

  Future<File> _exportSignatureToFile() async {
    final boundary =
        _signatureKey.currentContext?.findRenderObject()
            as RenderRepaintBoundary?;
    if (boundary == null) {
      throw Exception('Unable to capture signature.');
    }
    final image = await boundary.toImage(pixelRatio: 3.0);
    final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
    if (byteData == null) {
      throw Exception('Unable to process signature image.');
    }
    final bytes = byteData.buffer.asUint8List();
    final dir = await getTemporaryDirectory();
    final file = File(
      '${dir.path}/signature_${DateTime.now().millisecondsSinceEpoch}.png',
    );
    await file.writeAsBytes(bytes, flush: true);
    return file;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Site Inspection Form')),
      body: LoadingOverlay(
        isLoading: _submitting,
        child: _loading
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              )
            : _error != null
            ? _buildErrorState()
            : _buildMainContent(),
      ),
      bottomNavigationBar: _loading || _error != null
          ? null
          : _buildBottomActions(),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.danger),
            const SizedBox(height: 16),
            Text(_error!, textAlign: TextAlign.center),
            const SizedBox(height: 24),
            FilledButton(onPressed: _loadData, child: const Text('Retry')),
          ],
        ),
      ),
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
            physics: _isSigning
                ? const NeverScrollableScrollPhysics()
                : const PageScrollPhysics(),
            onPageChanged: (idx) => setState(() => _currentStep = idx),
            itemCount: inspectionSections.length,
            itemBuilder: (context, idx) =>
                _buildSectionForm(inspectionSections[idx]),
          ),
        ),
      ],
    );
  }

  Widget _buildStepRail() {
    return Container(
      height: 60,
      decoration: BoxDecoration(
        color: AppColors.white,
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
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
                _pageController.animateToPage(
                  idx,
                  duration: const Duration(milliseconds: 300),
                  curve: Curves.easeInOut,
                );
              },
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: active
                      ? AppColors.primary
                      : (done
                            ? AppColors.primary.withOpacity(0.1)
                            : AppColors.surface),
                  borderRadius: BorderRadius.circular(25),
                  border: Border.all(
                    color: active ? AppColors.primary : AppColors.border,
                  ),
                ),
                child: Row(
                  children: [
                    if (done) ...[
                      const Icon(
                        Icons.check_circle,
                        size: 16,
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: 6),
                    ],
                    Text(
                      '${idx + 1}. ${inspectionSections[idx].label}',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: active
                            ? FontWeight.w800
                            : (done ? FontWeight.w600 : FontWeight.w500),
                        color: active
                            ? Colors.white
                            : (done
                                  ? AppColors.primary
                                  : AppColors.textSecondary),
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
              Text(
                'Step ${_currentStep + 1} of ${inspectionSections.length}',
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                  color: AppColors.textSecondary,
                ),
              ),
              Text(
                '${(progress * 100).round()}% Completed',
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                  color: AppColors.primary,
                ),
              ),
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
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 20),
      decoration: BoxDecoration(
        color: AppColors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 8,
            offset: const Offset(0, -3),
          ),
        ],
      ),
      child: Row(
        children: [
          // Export PDF icon button
          IconButton(
            onPressed: _submitting ? null : _exportPdf,
            icon: const Icon(Icons.picture_as_pdf_outlined),
            tooltip: 'Export PDF',
            style: IconButton.styleFrom(
              backgroundColor: const Color(0xFFF1F5F9),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),
          const SizedBox(width: 6),
          // Save Draft icon button
          IconButton(
            onPressed: _submitting ? null : () => _submit(true),
            icon: const Icon(Icons.save_outlined),
            tooltip: 'Save Draft',
            style: IconButton.styleFrom(
              backgroundColor: const Color(0xFFF1F5F9),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),
          const Spacer(),
          // Back button
          if (!isFirst) ...[
            TextButton(
              onPressed: _submitting
                  ? null
                  : () => _pageController.previousPage(
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeInOut,
                    ),
              child: const Text('Back'),
            ),
            const SizedBox(width: 8),
          ],
          // Main action button
          FilledButton(
            onPressed: _submitting
                ? null
                : (isLast
                      ? () => _submit(false)
                      : () => _pageController.nextPage(
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeInOut,
                        )),
            style: FilledButton.styleFrom(
              backgroundColor: isLast ? AppColors.success : AppColors.primary,
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 24),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              isLast ? 'Submit' : 'Next',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionForm(InspectionSection section) {
    final fields = _fieldsForSection(section);
    return ListView(
      padding: const EdgeInsets.all(16),
      physics: _isSigning
          ? const NeverScrollableScrollPhysics()
          : const AlwaysScrollableScrollPhysics(),
      children: [
        Text(
          section.label,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 16),
        ...fields.map(_buildFieldControl),
        if (section.id == 'final') ...[
          const SizedBox(height: 12),
          _buildCustomerSignoffBlock(),
        ],
        const SizedBox(height: 80),
      ],
    );
  }

  Widget _buildCustomerSignoffBlock() {
    final existingSignature =
        _getValue('signature_url')?.toString().trim() ?? '';
    final showExistingImage =
        existingSignature.isNotEmpty &&
        !_signaturePoints.any((p) => p != null) &&
        _generatedSignature == null;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Customer sign-off',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.border),
            ),
            child: const Text(
              '"I confirm the site inspection has been completed and I approve all findings."',
              style: TextStyle(
                fontSize: 13,
                fontStyle: FontStyle.italic,
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _customerNameCtrl,
            decoration: const InputDecoration(
              labelText: 'Customer Name *',
              floatingLabelBehavior: FloatingLabelBehavior.always,
            ),
            onChanged: (v) => _formData['customer_name'] = v,
          ),
          const SizedBox(height: 12),
          const Text(
            'Signature *',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 6),
          if (showExistingImage)
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: AspectRatio(
                aspectRatio: 16 / 5,
                child: _NetworkPhotoPreview(
                  urls: _buildPhotoUrlCandidates(existingSignature),
                ),
              ),
            )
          else
            RepaintBoundary(
              key: _signatureKey,
              child: Listener(
                behavior: HitTestBehavior.opaque,
                onPointerDown: (event) {
                  setState(() {
                    _generatedSignature = null;
                    _isSigning = true;
                    _signaturePoints.add(event.localPosition);
                  });
                },
                onPointerMove: (event) {
                  setState(() {
                    _signaturePoints.add(event.localPosition);
                  });
                },
                onPointerUp: (event) => setState(() {
                  _isSigning = false;
                  _signaturePoints.add(null);
                }),
                onPointerCancel: (event) => setState(() {
                  _isSigning = false;
                  _signaturePoints.add(null);
                }),
                child: GestureDetector(
                  onVerticalDragDown: (_) {},
                  onVerticalDragUpdate: (_) {},
                  onHorizontalDragDown: (_) {},
                  onHorizontalDragUpdate: (_) {},
                  child: Container(
                    height: 140,
                    width: double.infinity,
                    clipBehavior: Clip.hardEdge,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFAFAFA),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: AppColors.border,
                        style: BorderStyle.solid,
                      ),
                    ),
                    child: CustomPaint(
                      painter: _SignaturePainter(
                        _signaturePoints,
                        generatedText: _generatedSignature,
                      ),
                      child: const SizedBox.expand(),
                    ),
                  ),
                ),
              ),
            ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              OutlinedButton(
                onPressed: () {
                  setState(() {
                    _signaturePoints.clear();
                    _generatedSignature = null;
                    _formData.remove('signature_url');
                  });
                },
                child: const Text('Clear Signature'),
              ),
              FilledButton.tonal(
                onPressed: () {
                  final name = _customerNameCtrl.text.trim();
                  if (name.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Please enter customer name first'),
                      ),
                    );
                    return;
                  }
                  setState(() {
                    _signaturePoints.clear();
                    _generatedSignature = name;
                  });
                },
                child: const Text('Generate from name'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          CheckboxListTile(
            value: _customerConfirmed,
            contentPadding: EdgeInsets.zero,
            dense: true,
            title: const Text(
              'I confirm the site inspection has been completed and I approve all findings.',
              style: TextStyle(fontSize: 13),
            ),
            onChanged: (v) {
              setState(() {
                _customerConfirmed = v ?? false;
                _formData['customer_confirmed'] = _customerConfirmed;
              });
            },
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: _customerNotesCtrl,
            maxLines: 2,
            decoration: const InputDecoration(
              labelText: 'Notes (optional)',
              floatingLabelBehavior: FloatingLabelBehavior.always,
            ),
            onChanged: (v) => _formData['customer_notes'] = v,
          ),
        ],
      ),
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
            key: Key(
              '${field.key}_$_currentStep',
            ), // Force rebuild on step change for correct local state
            initialValue: val?.toString() ?? field.defaultValue ?? '',
            keyboardType: field.type == InspectionFieldType.number
                ? TextInputType.number
                : TextInputType.text,
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
        final options = List<String>.from(field.options ?? const <String>[]);
        final selected = val?.toString();
        if (selected != null &&
            selected.trim().isNotEmpty &&
            !options.contains(selected)) {
          options.insert(0, selected);
        }
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: DropdownButtonFormField<String>(
            value: selected != null && options.contains(selected)
                ? selected
                : null,
            decoration: InputDecoration(
              labelText: field.required ? '${field.label} *' : field.label,
              floatingLabelBehavior: FloatingLabelBehavior.always,
            ),
            items: options
                .map(
                  (e) => DropdownMenuItem(
                    value: e,
                    child: Text(e, style: const TextStyle(fontSize: 13)),
                  ),
                )
                .toList(),
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
    final current = _parseDateTimeValue(val) ?? DateTime.now();
    final dateStr = DateFormat('dd MMM yyyy').format(current);
    final timeStr = DateFormat('hh:mm a').format(current);

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            field.label,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: current,
                      firstDate: DateTime(2020),
                      lastDate: DateTime(2030),
                    );
                    if (picked != null) {
                      final next = DateTime(
                        picked.year,
                        picked.month,
                        picked.day,
                        current.hour,
                        current.minute,
                      );
                      _setValue(field.key, _toSqlDateTime(next));
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppColors.border),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.calendar_today,
                          size: 16,
                          color: AppColors.primary,
                        ),
                        const SizedBox(width: 10),
                        Text(dateStr, style: const TextStyle(fontSize: 13)),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: InkWell(
                  onTap: () async {
                    final picked = await showTimePicker(
                      context: context,
                      initialTime: TimeOfDay.fromDateTime(current),
                    );
                    if (picked != null) {
                      final next = DateTime(
                        current.year,
                        current.month,
                        current.day,
                        picked.hour,
                        picked.minute,
                      );
                      _setValue(field.key, _toSqlDateTime(next));
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppColors.border),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.access_time,
                          size: 16,
                          color: AppColors.primary,
                        ),
                        const SizedBox(width: 10),
                        Text(timeStr, style: const TextStyle(fontSize: 13)),
                      ],
                    ),
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
    final localPath = _extractLocalPhotoPath(photoData);
    final url = _extractPhotoUrl(photoData);
    final urlCandidates = _buildPhotoUrlCandidates(url);

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            field.label,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          if (url.isNotEmpty)
            Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: AspectRatio(
                    aspectRatio: 16 / 9,
                    child: localPath != null
                        ? Image.file(
                            File(localPath),
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) =>
                                _NetworkPhotoPreview(urls: urlCandidates),
                          )
                        : _NetworkPhotoPreview(urls: urlCandidates),
                  ),
                ),
                Positioned(
                  top: 8,
                  right: 8,
                  child: CircleAvatar(
                    backgroundColor: Colors.white.withOpacity(0.9),
                    radius: 18,
                    child: IconButton(
                      onPressed: () =>
                          setState(() => _formData.remove(field.key)),
                      icon: const Icon(
                        Icons.delete_outline,
                        size: 18,
                        color: AppColors.danger,
                      ),
                    ),
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
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppColors.border,
                    style: BorderStyle.solid,
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.add_a_photo_outlined,
                      size: 28,
                      color: AppColors.primary,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Tap to upload ${field.label}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
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
          Text(
            field.label,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
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

class _NetworkPhotoPreview extends StatefulWidget {
  final List<String> urls;
  const _NetworkPhotoPreview({required this.urls});

  @override
  State<_NetworkPhotoPreview> createState() => _NetworkPhotoPreviewState();
}

class _NetworkPhotoPreviewState extends State<_NetworkPhotoPreview> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    if (widget.urls.isEmpty || _index >= widget.urls.length) {
      return const Center(child: Icon(Icons.broken_image));
    }

    return Image.network(
      widget.urls[_index],
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) {
        if (_index < widget.urls.length - 1) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!mounted) return;
            setState(() => _index += 1);
          });
          return const Center(child: CircularProgressIndicator(strokeWidth: 2));
        }
        return const Center(child: Icon(Icons.broken_image));
      },
    );
  }
}

class _SignaturePainter extends CustomPainter {
  final List<Offset?> points;
  final String? generatedText;
  const _SignaturePainter(this.points, {this.generatedText});

  @override
  void paint(Canvas canvas, Size size) {
    if (generatedText != null) {
      final textStyle = const TextStyle(
        color: Colors.black,
        fontSize: 32,
        fontStyle: FontStyle.italic,
        fontWeight: FontWeight.bold,
      );
      final textSpan = TextSpan(text: generatedText, style: textStyle);
      final textPainter = TextPainter(
        text: textSpan,
        textDirection: ui.TextDirection.ltr,
      );
      textPainter.layout(minWidth: 0, maxWidth: size.width);
      final offset = Offset(
        (size.width - textPainter.width) / 2,
        (size.height - textPainter.height) / 2,
      );
      textPainter.paint(canvas, offset);
      return;
    }

    if (points.isEmpty) {
      final textStyle = const TextStyle(
        color: Colors.black26,
        fontSize: 13,
        fontWeight: FontWeight.normal,
      );
      final textSpan = TextSpan(
        text: 'Drag your finger to sign here',
        style: textStyle,
      );
      final textPainter = TextPainter(
        text: textSpan,
        textDirection: ui.TextDirection.ltr,
      );
      textPainter.layout();
      final offset = Offset(
        (size.width - textPainter.width) / 2,
        (size.height - textPainter.height) / 2,
      );
      textPainter.paint(canvas, offset);
      return;
    }

    final paint = Paint()
      ..color = Colors.black
      ..strokeWidth = 3.0
      ..strokeCap = StrokeCap.round;
    for (int i = 0; i < points.length - 1; i++) {
      final p1 = points[i];
      final p2 = points[i + 1];
      if (p1 != null && p2 != null) {
        canvas.drawLine(p1, p2, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _SignaturePainter oldDelegate) => true;
}
