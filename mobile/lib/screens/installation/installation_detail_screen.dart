import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/config/api_config.dart';
import '../../models/expense.dart';
import '../../models/installation_job.dart';
import '../../providers/auth_provider.dart';
import '../../providers/installation_provider.dart';
import '../../services/expense_service.dart';
import '../../services/installation_service.dart';
import '../../widgets/common/file_picker_bottom_sheet.dart';
import '../../widgets/common/loading_overlay.dart';
import '../../widgets/common/shell_scaffold_scope.dart';
import '../../widgets/common/status_badge.dart';

class InstallationDetailScreen extends StatefulWidget {
  final int jobId;
  const InstallationDetailScreen({super.key, required this.jobId});

  @override
  State<InstallationDetailScreen> createState() =>
      _InstallationDetailScreenState();
}

class _InstallationDetailScreenState extends State<InstallationDetailScreen> {
  final InstallationService _service = InstallationService();
  final ExpenseService _expenseService = ExpenseService();
  bool _actionLoading = false;
  bool _loadingExpenses = false;
  bool _isSigning = false;
  int? _companyId;
  List<Expense> _jobExpenses = [];
  final TextEditingController _signoffCustomerCtrl = TextEditingController();
  final TextEditingController _signoffNotesCtrl = TextEditingController();
  final GlobalKey _signatureBoundaryKey = GlobalKey();
  List<Offset?> _signaturePoints = [];
  String? _generatedSignature;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _companyId = context.read<AuthProvider>().user?.companyId;
      context
          .read<InstallationProvider>()
          .loadJobDetail(widget.jobId, companyId: _companyId);
      _refreshJobExpenses();
    });
  }

  @override
  void dispose() {
    _signoffCustomerCtrl.dispose();
    _signoffNotesCtrl.dispose();
    super.dispose();
  }

  Future<void> _updateStatus(String newStatus) async {
    setState(() => _actionLoading = true);
    try {
      await context
          .read<InstallationProvider>()
          .updateJobStatus(widget.jobId, newStatus, companyId: _companyId);
      await context
          .read<InstallationProvider>()
          .loadJobDetail(widget.jobId, companyId: _companyId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                'Status updated to ${InstallationJob.statusLabels[newStatus] ?? newStatus}'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update status: $e'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<void> _toggleChecklist(int itemId, bool checked) async {
    try {
      await _service.updateChecklist(widget.jobId, itemId, checked,
          companyId: _companyId);
      if (mounted) {
        context
            .read<InstallationProvider>()
            .loadJobDetail(widget.jobId, companyId: _companyId);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update checklist: $e'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }

  Future<void> _uploadPhoto() async {
    final result =
        await showFilePickerSheet(context, imageOnly: true);
    if (result == null) return;

    setState(() => _actionLoading = true);
    try {
      final formData = FormData.fromMap({
        'photo': await MultipartFile.fromFile(
          result.file.path,
          filename: result.name,
        ),
      });
      await _service.uploadPhoto(widget.jobId, formData, companyId: _companyId);
      if (mounted) {
        context
            .read<InstallationProvider>()
            .loadJobDetail(widget.jobId, companyId: _companyId);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Photo uploaded'),
            backgroundColor: AppColors.success,
          ),
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
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<void> _submitSignoff() async {
    final name = _signoffCustomerCtrl.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Customer name is required')),
      );
      return;
    }

    final hasSignature = _signaturePoints.any((p) => p != null) || _generatedSignature != null;
    if (!hasSignature) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Signature is required')),
      );
      return;
    }

    setState(() => _actionLoading = true);
    try {
      final signatureUrl = await _uploadSignoffSignature();
      if (signatureUrl == null || signatureUrl.isEmpty) {
        throw Exception('Failed to upload signature');
      }
      await _service.submitSignoff(widget.jobId, {
        'customer_name': name,
        'signature_url': signatureUrl,
        'notes': _signoffNotesCtrl.text.trim(),
      }, companyId: _companyId);
      if (mounted) {
        await context
            .read<InstallationProvider>()
            .loadJobDetail(widget.jobId, companyId: _companyId);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Installation signed off successfully'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Signoff failed: $e'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<String?> _uploadSignoffSignature() async {
    final boundary = _signatureBoundaryKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
    if (boundary == null) return null;
    final image = await boundary.toImage(pixelRatio: 3);
    final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
    if (byteData == null) return null;
    final bytes = byteData.buffer.asUint8List();

    final formData = FormData.fromMap({
      'section': 'signoff',
      'photo': MultipartFile.fromBytes(
        bytes,
        filename: 'signoff-${widget.jobId}-${DateTime.now().millisecondsSinceEpoch}.png',
      ),
    });
    final uploaded = await _service.uploadPhoto(widget.jobId, formData, companyId: _companyId);
    return (uploaded['storage_url'] ?? uploaded['storageUrl'])?.toString();
  }

  Future<void> _showAddExpenseSheet() async {
    final amountCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final formKey = GlobalKey<FormState>();
    final allowedCategories = const ['travel', 'materials', 'equipment', 'other'];
    var category = allowedCategories.first;
    var expenseDate = DateTime.now();
    File? receiptFile;
    String? receiptMimeType;
    String? receiptName;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) => StatefulBuilder(
        builder: (sheetContext, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            top: 16,
            bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 16,
          ),
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Add Job Expense',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: category,
                  decoration: const InputDecoration(
                    labelText: 'Category',
                    border: OutlineInputBorder(),
                  ),
                  items: allowedCategories
                      .map((c) => DropdownMenuItem(
                            value: c,
                            child: Text(c[0].toUpperCase() + c.substring(1)),
                          ))
                      .toList(),
                  onChanged: (v) {
                    if (v != null) setSheetState(() => category = v);
                  },
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: amountCtrl,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                    labelText: 'Amount',
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Amount is required';
                    final parsed = double.tryParse(v.trim());
                    if (parsed == null || parsed <= 0) return 'Enter valid amount';
                    return null;
                  },
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: descCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'Description',
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Description is required' : null,
                ),
                const SizedBox(height: 10),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.calendar_today_outlined),
                  title: const Text('Expense Date'),
                  subtitle: Text(DateFormat('dd MMM yyyy').format(expenseDate)),
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: sheetContext,
                      initialDate: expenseDate,
                      firstDate: DateTime.now().subtract(const Duration(days: 90)),
                      lastDate: DateTime.now(),
                    );
                    if (picked != null) setSheetState(() => expenseDate = picked);
                  },
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(
                    receiptFile == null ? Icons.upload_file_outlined : Icons.check_circle_outline,
                    color: receiptFile == null ? AppColors.textSecondary : AppColors.success,
                  ),
                  title: Text(receiptName ?? 'Upload Receipt'),
                  subtitle: const Text('Required: image or PDF'),
                  onTap: () async {
                    final result = await showFilePickerSheet(sheetContext);
                    if (result != null) {
                      setSheetState(() {
                        receiptFile = result.file;
                        receiptMimeType = result.mimeType;
                        receiptName = result.name;
                      });
                    }
                  },
                ),
                if (receiptFile != null) ...[
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: SizedBox(
                      height: 120,
                      width: double.infinity,
                      child: (receiptMimeType ?? '').startsWith('image/')
                          ? Image.file(
                              receiptFile!,
                              fit: BoxFit.cover,
                            )
                          : Container(
                              color: AppColors.surface,
                              child: const Center(
                                child: Icon(
                                  Icons.picture_as_pdf_outlined,
                                  size: 36,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ),
                    ),
                  ),
                ],
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () async {
                      if (!formKey.currentState!.validate()) return;
                      if (receiptFile == null) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Receipt is required'),
                            backgroundColor: AppColors.danger,
                          ),
                        );
                        return;
                      }
                      Navigator.of(sheetContext).pop();
                      await _submitJobExpense(
                        category: category,
                        amount: amountCtrl.text.trim(),
                        description: descCtrl.text.trim(),
                        expenseDate: expenseDate,
                        receiptFile: receiptFile!,
                        receiptName: receiptName ?? 'receipt',
                      );
                    },
                    child: const Text('Submit Expense'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _submitJobExpense({
    required String category,
    required String amount,
    required String description,
    required DateTime expenseDate,
    required File receiptFile,
    required String receiptName,
  }) async {
    setState(() => _actionLoading = true);
    try {
      final formData = FormData.fromMap({
        'category': category,
        'amount': double.parse(amount),
        'expenseDate': DateFormat('yyyy-MM-dd').format(expenseDate),
        'description': description,
        'installationJobId': widget.jobId.toString(),
        'receipt': await MultipartFile.fromFile(
          receiptFile.path,
          filename: receiptName,
        ),
      });
      await _expenseService.submitExpense(formData);
      if (mounted) {
        await context
            .read<InstallationProvider>()
            .loadJobDetail(widget.jobId, companyId: _companyId);
        await _refreshJobExpenses();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Expense added successfully'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to add expense: $e'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<void> _refreshJobExpenses() async {
    setState(() => _loadingExpenses = true);
    try {
      final expenses = await _expenseService.getJobExpenses(
        widget.jobId,
        companyId: _companyId,
      );
      if (!mounted) return;
      setState(() => _jobExpenses = expenses);
    } catch (_) {
      if (!mounted) return;
      setState(() => _jobExpenses = []);
    } finally {
      if (mounted) setState(() => _loadingExpenses = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<InstallationProvider>(
      builder: (context, provider, _) {
        final detail = provider.jobDetail;
        final loading = provider.loading && detail == null;
        final shellLeading = ShellScaffoldScope.navigationLeading(context);
        final canPop = GoRouter.of(context).canPop() || Navigator.of(context).canPop();

        return Scaffold(
          appBar: AppBar(
            leading: shellLeading ??
                (canPop
                    ? IconButton(
                        icon: const Icon(Icons.arrow_back_ios_new_rounded),
                        tooltip: 'Back',
                        onPressed: () => context.pop(),
                      )
                    : null),
            automaticallyImplyLeading: false,
            title: Text(detail?['customer_name'] ?? 'Job Detail'),
            centerTitle: false,
            actions: ShellScaffoldScope.notificationActions(context: context),
          ),
          body: LoadingOverlay(
            isLoading: _actionLoading,
            message: 'Please wait...',
            child: loading
                ? const Center(
                    child:
                        CircularProgressIndicator(color: AppColors.primary))
                : detail == null
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.error_outline,
                                size: 48, color: AppColors.danger),
                            const SizedBox(height: 12),
                            Text(provider.error ?? 'Failed to load job'),
                            const SizedBox(height: 16),
                            FilledButton(
                              onPressed: () => provider
                                  .loadJobDetail(widget.jobId,
                                      companyId: _companyId),
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        color: AppColors.primary,
                        onRefresh: () =>
                            Future.wait([
                              provider.loadJobDetail(widget.jobId,
                                  companyId: _companyId),
                              _refreshJobExpenses(),
                            ]),
                        child: ListView(
                          padding: const EdgeInsets.all(16),
                          physics: _isSigning
                              ? const NeverScrollableScrollPhysics()
                              : const AlwaysScrollableScrollPhysics(),
                          children: [
                            _buildHeader(detail),
                            const SizedBox(height: 16),
                            _ElapsedTimerCard(detail: detail),
                            const SizedBox(height: 16),
                            _buildStatusActions(detail),
                            const SizedBox(height: 20),
                            _buildChecklist(detail),
                            const SizedBox(height: 20),
                            _buildPhotos(detail),
                            const SizedBox(height: 20),
                            _buildExpenses(detail),
                            const SizedBox(height: 20),
                            _buildSignoff(detail),
                            const SizedBox(height: 40),
                          ],
                        ),
                      ),
          ),
        );
      },
    );
  }

  Widget _buildHeader(Map<String, dynamic> detail) {
    final status = (detail['status'] as String?) ?? 'scheduled';
    final address = [detail['address'], detail['suburb']]
        .where((s) => s != null && s.toString().isNotEmpty)
        .join(', ');
    final dateStr = detail['scheduled_date'];
    final time = detail['scheduled_time'] ?? '';
    final formattedDate = dateStr != null
        ? DateFormat('EEEE, dd MMM yyyy')
            .format(DateTime.parse(dateStr.toString()))
        : 'Not scheduled';
    final systemSize = detail['system_size_kw'];
    final systemType = detail['system_type'];

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border.withOpacity(0.6)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  detail['customer_name'] ?? '',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              StatusBadge.fromStatus(status),
            ],
          ),
          if (address.isNotEmpty) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(Icons.location_on_outlined,
                    size: 16, color: AppColors.textSecondary),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    address,
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
          ],
          const Divider(height: 24, color: AppColors.divider),
          Row(
            children: [
              _DetailChip(
                icon: Icons.calendar_today_outlined,
                label: formattedDate,
              ),
              if (time.isNotEmpty) ...[
                const SizedBox(width: 16),
                _DetailChip(
                  icon: Icons.access_time_outlined,
                  label: time,
                ),
              ],
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              if (systemSize != null)
                _DetailChip(
                  icon: Icons.solar_power_outlined,
                  label: '${systemSize} kW',
                ),
              if (systemType != null) ...[
                const SizedBox(width: 16),
                _DetailChip(
                  icon: Icons.category_outlined,
                  label: systemType.toString(),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusActions(Map<String, dynamic> detail) {
    final status = (detail['status'] as String?) ?? 'scheduled';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border.withOpacity(0.6)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Actions',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              if (status == 'scheduled')
                _ActionButton(
                  label: 'Start Installation',
                  icon: Icons.play_arrow_rounded,
                  color: AppColors.info,
                  onTap: () => _updateStatus('in_progress'),
                ),
              if (status == 'in_progress') ...[
                _ActionButton(
                  label: 'Pause',
                  icon: Icons.pause_rounded,
                  color: AppColors.warning,
                  onTap: () => _updateStatus('paused'),
                ),
                _ActionButton(
                  label: 'Complete',
                  icon: Icons.check_circle_outline_rounded,
                  color: AppColors.success,
                  onTap: () => _updateStatus('completed'),
                ),
              ],
              if (status == 'paused')
                _ActionButton(
                  label: 'Resume',
                  icon: Icons.play_arrow_rounded,
                  color: AppColors.info,
                  onTap: () => _updateStatus('in_progress'),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildChecklist(Map<String, dynamic> detail) {
    final rawChecklist = detail['checklist'] as List? ?? [];
    final items =
        rawChecklist.map((e) => ChecklistItem.fromJson(e)).toList();

    return _SectionCard(
      title: 'Checklist',
      icon: Icons.checklist_rounded,
      trailing: items.isNotEmpty
          ? Text(
              '${items.where((c) => c.checked).length}/${items.length}',
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
              ),
            )
          : null,
      child: items.isEmpty
          ? const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Text(
                'No checklist items',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 14,
                ),
              ),
            )
          : Column(
              children: items.map((item) {
                return InkWell(
                  onTap: () => _toggleChecklist(item.id, !item.checked),
                  borderRadius: BorderRadius.circular(8),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Row(
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          width: 24,
                          height: 24,
                          decoration: BoxDecoration(
                            color: item.checked
                                ? AppColors.primary
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                              color: item.checked
                                  ? AppColors.primary
                                  : AppColors.border,
                              width: 2,
                            ),
                          ),
                          child: item.checked
                              ? const Icon(Icons.check,
                                  size: 16, color: AppColors.white)
                              : null,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            item.label,
                            style: TextStyle(
                              fontSize: 14,
                              color: item.checked
                                  ? AppColors.textSecondary
                                  : AppColors.textPrimary,
                              decoration: item.checked
                                  ? TextDecoration.lineThrough
                                  : null,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
    );
  }

  Widget _buildPhotos(Map<String, dynamic> detail) {
    final rawPhotos = detail['photos'] as List? ?? [];
    final photos = rawPhotos
        .map((p) => p is Map<String, dynamic> ? p : <String, dynamic>{})
        .toList();

    return _SectionCard(
      title: 'Photos',
      icon: Icons.photo_library_outlined,
      trailing: IconButton(
        icon: const Icon(Icons.add_a_photo_outlined,
            color: AppColors.primary, size: 22),
        onPressed: _uploadPhoto,
        tooltip: 'Upload photo',
        visualDensity: VisualDensity.compact,
      ),
      child: photos.isEmpty
          ? Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.camera_alt_outlined,
                        size: 40, color: AppColors.disabled),
                    const SizedBox(height: 8),
                    const Text(
                      'No photos yet',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: _uploadPhoto,
                      icon: const Icon(Icons.add_a_photo_outlined, size: 18),
                      label: const Text('Add Photo'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        side: const BorderSide(color: AppColors.primary),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            )
          : GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                mainAxisSpacing: 8,
                crossAxisSpacing: 8,
              ),
              itemCount: photos.length + 1,
              itemBuilder: (context, index) {
                if (index == photos.length) {
                  return InkWell(
                    onTap: _uploadPhoto,
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: AppColors.border,
                          style: BorderStyle.solid,
                        ),
                      ),
                      child: const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.add_rounded,
                              color: AppColors.primary, size: 28),
                          SizedBox(height: 4),
                          Text(
                            'Add',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.primary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }

                final photo = photos[index];
                final url = photo['storage_url'] ?? photo['storageUrl'] ?? '';
                return ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: url.toString().isNotEmpty
                      ? Image.network(
                          url.toString(),
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            color: AppColors.surface,
                            child: const Icon(Icons.broken_image_outlined,
                                color: AppColors.disabled),
                          ),
                        )
                      : Container(
                          color: AppColors.surface,
                          child: const Icon(Icons.image_outlined,
                              color: AppColors.disabled),
                        ),
                );
              },
            ),
    );
  }

  Widget _buildExpenses(Map<String, dynamic> detail) {
    final currencyFmt = NumberFormat.currency(symbol: '\$', decimalDigits: 2);

    return _SectionCard(
      title: 'Expenses & Receipts',
      icon: Icons.receipt_long_outlined,
      trailing: IconButton(
        icon: const Icon(Icons.add_circle_outline, color: AppColors.primary),
        onPressed: _showAddExpenseSheet,
        tooltip: 'Add expense',
      ),
      child: _loadingExpenses
          ? const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
            )
          : _jobExpenses.isEmpty
          ? const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Text(
                'No expenses recorded',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 14,
                ),
              ),
            )
          : Column(
              children: _jobExpenses.map((expense) {
                final desc = expense.description?.trim().isNotEmpty == true
                    ? expense.description!
                    : 'Expense';
                final isPending = expense.status == 'pending';
                final isApproved = expense.status == 'approved';
                final isImage = (expense.receiptPath ?? '')
                        .toLowerCase()
                        .contains(RegExp(r'\.(png|jpe?g|gif|webp)$')) ||
                    (expense.receiptPath ?? '').contains('/uploads/');
                final receiptUrl = expense.receiptPath == null
                    ? null
                    : expense.receiptPath!.startsWith('http')
                        ? expense.receiptPath!
                        : '${ApiConfig.baseUrl}${expense.receiptPath}';
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (receiptUrl != null)
                        ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            width: 46,
                            height: 46,
                            color: AppColors.surface,
                            child: isImage
                                ? Image.network(
                                    receiptUrl,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => const Icon(
                                      Icons.broken_image_outlined,
                                      color: AppColors.disabled,
                                    ),
                                  )
                                : const Icon(
                                    Icons.picture_as_pdf_outlined,
                                    color: AppColors.textSecondary,
                                  ),
                          ),
                        ),
                      if (receiptUrl == null)
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: AppColors.warning.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.receipt_outlined,
                              size: 18, color: Color(0xFFB8860B)),
                        ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              desc,
                              style: const TextStyle(
                                fontSize: 14,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              isApproved
                                  ? (expense.expenseDate != null
                                      ? DateFormat('dd MMM yyyy')
                                          .format(expense.expenseDate!)
                                      : 'Approved expense')
                                  : isPending
                                      ? 'Pending approval'
                                      : expense.status[0].toUpperCase() +
                                          expense.status.substring(1),
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      StatusBadge.fromStatus(expense.status),
                      const SizedBox(width: 8),
                      Text(
                        currencyFmt.format(expense.amount),
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
    );
  }

  Widget _buildSignoff(Map<String, dynamic> detail) {
    final status = (detail['status'] as String?) ?? 'scheduled';
    final signoff = detail['signoff'] as Map<String, dynamic>?;
    final isSigned = signoff != null;

    return _SectionCard(
      title: 'Signoff',
      icon: Icons.verified_outlined,
      child: isSigned
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.success.withOpacity(0.06),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: AppColors.success.withOpacity(0.2)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle_rounded,
                          color: AppColors.success, size: 24),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Installation Signed Off',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: AppColors.success,
                              ),
                            ),
                            if (signoff['signed_at'] != null)
                              Text(
                                DateFormat('dd MMM yyyy, HH:mm').format(
                                    DateTime.parse(
                                        signoff['signed_at'].toString())),
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            )
          : Column(
              children: [
                TextField(
                  controller: _signoffCustomerCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Customer Name *',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  height: 190,
                  clipBehavior: Clip.hardEdge,
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    children: [
                      Expanded(
                        child: RepaintBoundary(
                          key: _signatureBoundaryKey,
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
                              setState(() => _signaturePoints.add(event.localPosition));
                            },
                            onPointerUp: (event) {
                              setState(() {
                                _isSigning = false;
                                _signaturePoints.add(null);
                              });
                            },
                            onPointerCancel: (event) {
                              setState(() {
                                _isSigning = false;
                                _signaturePoints.add(null);
                              });
                            },
                            child: GestureDetector(
                              onVerticalDragDown: (_) {},
                              onVerticalDragUpdate: (_) {},
                              onHorizontalDragDown: (_) {},
                              onHorizontalDragUpdate: (_) {},
                              child: CustomPaint(
                                painter: _SignaturePainter(_signaturePoints, generatedText: _generatedSignature),
                                child: Container(
                                  color: Colors.transparent,
                                  width: double.infinity,
                                  height: double.infinity,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const Divider(height: 1),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        child: Row(
                          children: [
                            TextButton(
                              onPressed: () => setState(() {
                                _signaturePoints = [];
                                _generatedSignature = null;
                              }),
                              child: const Text('Clear'),
                            ),
                            const SizedBox(width: 8),
                            TextButton(
                              onPressed: () {
                                final name = _signoffCustomerCtrl.text.trim();
                                if (name.isEmpty) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Please enter customer name first')),
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
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _signoffNotesCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'Notes (optional)',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: FilledButton.icon(
                    onPressed:
                        status == 'completed' ? _submitSignoff : null,
                    icon: const Icon(Icons.verified_outlined, size: 20),
                    label: const Text(
                      'Sign Off Installation',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      disabledBackgroundColor: AppColors.disabledBackground,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}

class _ElapsedTimerCard extends StatefulWidget {
  final Map<String, dynamic> detail;
  const _ElapsedTimerCard({required this.detail});

  @override
  State<_ElapsedTimerCard> createState() => _ElapsedTimerCardState();
}

class _ElapsedTimerCardState extends State<_ElapsedTimerCard> {
  Timer? _ticker;
  int _elapsedSeconds = 0;

  @override
  void initState() {
    super.initState();
    _resetFromDetail();
    _syncTicker();
  }

  @override
  void didUpdateWidget(covariant _ElapsedTimerCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.detail != widget.detail) {
      _resetFromDetail();
      _syncTicker();
    }
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  void _syncTicker() {
    _ticker?.cancel();
    if (_status == 'in_progress') {
      _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
        if (!mounted) return;
        setState(() => _elapsedSeconds += 1);
      });
    }
  }

  String get _status => (widget.detail['status'] as String?) ?? 'scheduled';

  void _resetFromDetail() {
    _elapsedSeconds = _computeElapsedSeconds(widget.detail);
  }

  int _computeElapsedSeconds(Map<String, dynamic> detail) {
    final status = (detail['status'] as String?) ?? 'scheduled';
    final totalElapsed =
        int.tryParse('${detail['total_elapsed_seconds'] ?? 0}') ?? 0;
    final recordsRaw = detail['timeRecords'] ?? detail['time_records'];

    if (recordsRaw is List && recordsRaw.isNotEmpty) {
      var total = 0;
      DateTime? openAt;
      for (final row in recordsRaw) {
        if (row is! Map) continue;
        final event = '${row['event'] ?? ''}';
        final ts = DateTime.tryParse('${row['recorded_at'] ?? ''}');
        if (ts == null) continue;
        if (event == 'start' || event == 'resume') {
          openAt = ts;
        } else if (event == 'pause' || event == 'end') {
          if (openAt != null) {
            total += ts.difference(openAt).inSeconds;
            openAt = null;
          }
        }
      }
      if (status == 'in_progress' && openAt != null) {
        total += DateTime.now().difference(openAt).inSeconds;
      }
      return total < 0 ? 0 : total;
    }

    if (status == 'in_progress') {
      final startedAt = DateTime.tryParse('${detail['started_at'] ?? ''}');
      if (startedAt != null) {
        final running = DateTime.now().difference(startedAt).inSeconds;
        return (totalElapsed + running).clamp(0, 1 << 31);
      }
    }
    return totalElapsed;
  }

  String _format(int seconds) {
    final h = seconds ~/ 3600;
    final m = (seconds % 3600) ~/ 60;
    final s = seconds % 60;
    if (h > 0) {
      return '${h}h ${m.toString().padLeft(2, '0')}m ${s.toString().padLeft(2, '0')}s';
    }
    return '${m.toString().padLeft(2, '0')}m ${s.toString().padLeft(2, '0')}s';
  }

  @override
  Widget build(BuildContext context) {
    if (_status == 'scheduled') return const SizedBox.shrink();

    final color = _status == 'completed'
        ? AppColors.success
        : _status == 'in_progress'
            ? AppColors.warning
            : AppColors.info;
    final label = _status == 'completed'
        ? 'Total Time'
        : _status == 'in_progress'
            ? 'Time Running'
            : 'Paused At';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withOpacity(0.22)),
      ),
      child: Row(
        children: [
          Icon(Icons.timer_outlined, color: color, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textSecondary,
                    letterSpacing: 0.3,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _format(_elapsedSeconds),
                  style: TextStyle(
                    fontSize: 22,
                    height: 1.1,
                    fontWeight: FontWeight.w800,
                    color: color,
                  ),
                ),
              ],
            ),
          ),
          if (_status == 'in_progress')
            Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                color: AppColors.danger,
                borderRadius: BorderRadius.circular(5),
              ),
            ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Widget? trailing;
  final Widget child;

  const _SectionCard({
    required this.title,
    required this.icon,
    this.trailing,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border.withOpacity(0.6)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 20, color: AppColors.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              if (trailing != null) trailing!,
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _ActionButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color.withOpacity(0.1),
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 20, color: color),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DetailChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _DetailChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 15, color: AppColors.textSecondary),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            color: AppColors.textSecondary,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

class _SignaturePainter extends CustomPainter {
  final List<Offset?> points;
  final String? generatedText;

  _SignaturePainter(this.points, {this.generatedText});

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
      final textStyle = const TextStyle(color: Colors.black26, fontSize: 13, fontWeight: FontWeight.normal);
      final textSpan = TextSpan(text: 'Drag your finger to sign here', style: textStyle);
      final textPainter = TextPainter(text: textSpan, textDirection: ui.TextDirection.ltr);
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
      if (points[i] != null && points[i + 1] != null) {
        canvas.drawLine(points[i]!, points[i + 1]!, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _SignaturePainter oldDelegate) => true;
}
