import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../models/installation_job.dart';
import '../../providers/installation_provider.dart';
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
  bool _actionLoading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<InstallationProvider>().loadJobDetail(widget.jobId);
    });
  }

  Future<void> _updateStatus(String newStatus) async {
    setState(() => _actionLoading = true);
    try {
      await context
          .read<InstallationProvider>()
          .updateJobStatus(widget.jobId, newStatus);
      await context
          .read<InstallationProvider>()
          .loadJobDetail(widget.jobId);
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
      await _service.updateChecklist(widget.jobId, itemId, checked);
      if (mounted) {
        context.read<InstallationProvider>().loadJobDetail(widget.jobId);
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
      await _service.uploadPhoto(widget.jobId, formData);
      if (mounted) {
        context.read<InstallationProvider>().loadJobDetail(widget.jobId);
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
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Complete Installation'),
        content: const Text(
          'Are you sure you want to sign off this installation? '
          'This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _actionLoading = true);
    try {
      await _service.submitSignoff(widget.jobId, {
        'signed_at': DateTime.now().toIso8601String(),
      });
      if (mounted) {
        await context
            .read<InstallationProvider>()
            .loadJobDetail(widget.jobId);
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

  @override
  Widget build(BuildContext context) {
    return Consumer<InstallationProvider>(
      builder: (context, provider, _) {
        final detail = provider.jobDetail;
        final loading = provider.loading && detail == null;

        return Scaffold(
          appBar: AppBar(
            title: Text(
              detail?['customer_name'] ?? 'Job Detail',
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 18,
              ),
            ),
            centerTitle: false,
            backgroundColor: AppColors.white,
            foregroundColor: AppColors.textPrimary,
            surfaceTintColor: AppColors.white,
            elevation: 0.5,
            shadowColor: AppColors.divider,
            actions: ShellScaffoldScope.notificationActions(),
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
                                  .loadJobDetail(widget.jobId),
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        color: AppColors.primary,
                        onRefresh: () =>
                            provider.loadJobDetail(widget.jobId),
                        child: ListView(
                          padding: const EdgeInsets.all(16),
                          children: [
                            _buildHeader(detail),
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
    final rawExpenses = detail['expenses'] as List? ?? [];
    final expenses = rawExpenses
        .map((e) => e is Map<String, dynamic> ? e : <String, dynamic>{})
        .toList();

    final currencyFmt = NumberFormat.currency(symbol: '\$', decimalDigits: 2);

    return _SectionCard(
      title: 'Expenses & Receipts',
      icon: Icons.receipt_long_outlined,
      child: expenses.isEmpty
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
              children: expenses.map((expense) {
                final desc =
                    expense['description'] ?? expense['name'] ?? 'Expense';
                final amount = (expense['amount'] ?? 0).toDouble();
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(
                    children: [
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
                        child: Text(
                          desc.toString(),
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      Text(
                        currencyFmt.format(amount),
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
                Container(
                  width: double.infinity,
                  height: 160,
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: const Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.draw_outlined,
                          size: 36, color: AppColors.disabled),
                      SizedBox(height: 8),
                      Text(
                        'Signature area',
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 14,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Complete the job to enable signoff',
                        style: TextStyle(
                          color: AppColors.disabled,
                          fontSize: 12,
                        ),
                      ),
                    ],
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
