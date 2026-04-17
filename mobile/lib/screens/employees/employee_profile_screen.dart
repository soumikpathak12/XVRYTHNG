import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:dio/dio.dart';
import '../../core/theme/app_colors.dart';
import '../../providers/employees_provider.dart';
import '../../services/employees_service.dart';
import '../../widgets/common/status_badge.dart';
import '../../widgets/common/empty_state.dart';
import '../../widgets/common/file_picker_bottom_sheet.dart';
import '../../widgets/common/shell_scaffold_scope.dart';

class EmployeeProfileScreen extends StatefulWidget {
  final int employeeId;

  const EmployeeProfileScreen({super.key, required this.employeeId});

  @override
  State<EmployeeProfileScreen> createState() => _EmployeeProfileScreenState();
}

class _EmployeeProfileScreenState extends State<EmployeeProfileScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<EmployeesProvider>().loadEmployeeDetail(widget.employeeId);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Employee Profile'),
        actions: [
          PopupMenuButton<String>(
            onSelected: (v) {
              if (v == 'edit') {
                _openEditEmployee(context);
              }
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'edit', child: Text('Edit')),
            ],
          ),
          ...ShellScaffoldScope.notificationActions(),
        ],
      ),
      body: Consumer<EmployeesProvider>(
        builder: (context, provider, _) {
          if (provider.loading && provider.employeeDetail == null) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            );
          }
          if (provider.error != null && provider.employeeDetail == null) {
            return EmptyState(
              icon: Icons.error_outline,
              title: 'Failed to load profile',
              subtitle: provider.error,
              actionLabel: 'Retry',
              onAction: () => provider.loadEmployeeDetail(widget.employeeId),
            );
          }
          final data = provider.employeeDetail ?? {};
          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () => provider.loadEmployeeDetail(widget.employeeId),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _buildHeader(data),
                  const SizedBox(height: 16),
                  _PersonalInfoCard(data: data),
                  const SizedBox(height: 12),
                  _ContactInfoCard(data: data),
                  const SizedBox(height: 12),
                  _EmploymentCard(data: data),
                  const SizedBox(height: 12),
                  _DocumentsCard(employeeId: widget.employeeId, data: data),
                  const SizedBox(height: 80),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _openEditEmployee(BuildContext context) async {
    final location = GoRouterState.of(context).matchedLocation;
    final isAdmin = location.startsWith('/admin/');
    final editPath = isAdmin
        ? '/admin/employees/${widget.employeeId}/edit'
        : '/dashboard/employees/${widget.employeeId}/edit';

    final updated = await context.push<bool>(editPath);
    if (updated == true && context.mounted) {
      await context.read<EmployeesProvider>().loadEmployeeDetail(
        widget.employeeId,
      );
    }
  }

  Widget _buildHeader(Map<String, dynamic> data) {
    final firstName = data['first_name'] ?? '';
    final lastName = data['last_name'] ?? '';
    final fullName = '$firstName $lastName'.trim();
    final initials =
        '${firstName.isNotEmpty ? firstName[0] : ''}${lastName.isNotEmpty ? lastName[0] : ''}'
            .toUpperCase();
    final status = (data['status'] ?? 'active').toString();
    final code = data['employee_code'];
    final role = data['role_name'] ?? data['role'] ?? '';
    final department = data['department_name'] ?? data['department'] ?? '';
    final avatarUrl = data['avatar_url'];

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.border, width: 0.5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            CircleAvatar(
              radius: 40,
              backgroundColor: AppColors.primary.withOpacity(0.1),
              backgroundImage: avatarUrl != null
                  ? NetworkImage(avatarUrl)
                  : null,
              onBackgroundImageError: avatarUrl != null ? (_, __) {} : null,
              child: avatarUrl == null
                  ? Text(
                      initials,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    )
                  : null,
            ),
            const SizedBox(height: 14),
            Text(
              fullName.isNotEmpty ? fullName : 'Employee',
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            if (code != null) ...[
              const SizedBox(height: 4),
              Text(
                code,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (role.isNotEmpty) ...[
                  const Icon(
                    Icons.work_outline,
                    size: 14,
                    color: AppColors.textSecondary,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    role,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
                if (role.isNotEmpty && department.isNotEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 8),
                    child: Text(
                      '·',
                      style: TextStyle(color: AppColors.textSecondary),
                    ),
                  ),
                if (department.isNotEmpty) ...[
                  const Icon(
                    Icons.business_outlined,
                    size: 14,
                    color: AppColors.textSecondary,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    department,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 10),
            StatusBadge.fromStatus(status),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Personal Info Card
// ---------------------------------------------------------------------------
class _PersonalInfoCard extends StatelessWidget {
  final Map<String, dynamic> data;

  const _PersonalInfoCard({required this.data});

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: 'Personal Information',
      icon: Icons.person_outline,
      children: [
        _DetailRow('First Name', data['first_name'] ?? '-'),
        _DetailRow('Last Name', data['last_name'] ?? '-'),
        _DetailRow('Date of Birth', _formatDate(data['date_of_birth'])),
        _DetailRow('Gender', _capitalize(data['gender'])),
      ],
    );
  }

  String _formatDate(dynamic val) {
    if (val == null) return '-';
    final dt = DateTime.tryParse(val.toString());
    if (dt == null) return val.toString();
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  String _capitalize(dynamic val) {
    if (val == null) return '-';
    final s = val.toString();
    if (s.isEmpty) return '-';
    return '${s[0].toUpperCase()}${s.substring(1)}';
  }
}

// ---------------------------------------------------------------------------
// Contact Info Card
// ---------------------------------------------------------------------------
class _ContactInfoCard extends StatelessWidget {
  final Map<String, dynamic> data;

  const _ContactInfoCard({required this.data});

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: 'Contact Information',
      icon: Icons.contact_mail_outlined,
      children: [
        _DetailRow('Email', data['email'] ?? '-'),
        _DetailRow('Phone', data['phone'] ?? '-'),
        _DetailRow('Street', data['street'] ?? data['address'] ?? '-'),
        _DetailRow('City', data['city'] ?? '-'),
        _DetailRow('State', data['state'] ?? '-'),
        _DetailRow('Postcode', data['postcode'] ?? '-'),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Employment Card
// ---------------------------------------------------------------------------
class _EmploymentCard extends StatelessWidget {
  final Map<String, dynamic> data;

  const _EmploymentCard({required this.data});

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: 'Employment Details',
      icon: Icons.work_outline,
      children: [
        _DetailRow('Employee Code', data['employee_code'] ?? '-'),
        _DetailRow('Job Role', data['role_name'] ?? data['role'] ?? '-'),
        _DetailRow(
          'Department',
          data['department_name'] ?? data['department'] ?? '-',
        ),
        _DetailRow('Employment Type', data['employment_type'] ?? '-'),
        _DetailRow('Start Date', _formatDate(data['start_date'])),
        _DetailRow('Rate', data['rate'] != null ? '\$${data['rate']}' : '-'),
      ],
    );
  }

  String _formatDate(dynamic val) {
    if (val == null) return '-';
    final dt = DateTime.tryParse(val.toString());
    if (dt == null) return val.toString();
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}

// ---------------------------------------------------------------------------
// Documents Card
// ---------------------------------------------------------------------------
class _DocumentsCard extends StatelessWidget {
  final int employeeId;
  final Map<String, dynamic> data;

  const _DocumentsCard({required this.employeeId, required this.data});

  @override
  Widget build(BuildContext context) {
    final docs = data['documents'];
    final docList = (docs is List) ? docs : [];

    return _SectionCard(
      title: 'Documents',
      icon: Icons.folder_outlined,
      trailing: FilledButton.icon(
        onPressed: () => _upload(context),
        icon: const Icon(Icons.upload_file, size: 16),
        label: const Text('Upload', style: TextStyle(fontSize: 13)),
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primary,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          minimumSize: Size.zero,
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
      ),
      children: [
        if (docList.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 20),
            child: Center(
              child: Column(
                children: [
                  Icon(
                    Icons.description_outlined,
                    size: 36,
                    color: AppColors.disabled,
                  ),
                  SizedBox(height: 8),
                  Text(
                    'No documents uploaded',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ...docList.map((doc) {
          final name = doc['file_name'] ?? doc['name'] ?? 'Document';
          return ListTile(
            contentPadding: EdgeInsets.zero,
            leading: _docIcon(name.toString()),
            title: Text(name.toString(), style: const TextStyle(fontSize: 14)),
            subtitle: Text(
              doc['uploaded_at'] ?? doc['created_at'] ?? '',
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
              ),
            ),
            trailing: const Icon(
              Icons.download_outlined,
              color: AppColors.primary,
              size: 20,
            ),
            dense: true,
          );
        }),
      ],
    );
  }

  Widget _docIcon(String name) {
    final ext = name.split('.').last.toLowerCase();
    IconData icon;
    Color color;
    switch (ext) {
      case 'pdf':
        icon = Icons.picture_as_pdf;
        color = AppColors.danger;
        break;
      case 'jpg':
      case 'jpeg':
      case 'png':
        icon = Icons.image_outlined;
        color = AppColors.info;
        break;
      default:
        icon = Icons.insert_drive_file_outlined;
        color = AppColors.textSecondary;
    }
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, color: color, size: 20),
    );
  }

  Future<void> _upload(BuildContext context) async {
    final result = await showFilePickerSheet(context);
    if (result == null || !context.mounted) return;

    final formData = FormData.fromMap({
      'document': await MultipartFile.fromFile(
        result.file.path,
        filename: result.name,
      ),
    });

    try {
      await EmployeesService().uploadEmployeeDocument(employeeId, formData);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Document uploaded'),
            backgroundColor: AppColors.success,
          ),
        );
        context.read<EmployeesProvider>().loadEmployeeDetail(employeeId);
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Upload failed: $e'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Shared widgets
// ---------------------------------------------------------------------------
class _SectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Widget? trailing;
  final List<Widget> children;

  const _SectionCard({
    required this.title,
    required this.icon,
    this.trailing,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.border, width: 0.5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
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
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                if (trailing != null) trailing!,
              ],
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _DetailRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
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
}
