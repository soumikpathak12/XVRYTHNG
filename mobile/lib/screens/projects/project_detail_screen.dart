import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dio/dio.dart';
import '../../core/theme/app_colors.dart';
import '../../providers/projects_provider.dart';
import '../../services/projects_service.dart';
import '../../widgets/common/status_badge.dart';
import '../../widgets/common/empty_state.dart';
import '../../widgets/common/file_picker_bottom_sheet.dart';
import '../../widgets/common/shell_scaffold_scope.dart';

class ProjectDetailScreen extends StatefulWidget {
  final int projectId;

  const ProjectDetailScreen({super.key, required this.projectId});

  @override
  State<ProjectDetailScreen> createState() => _ProjectDetailScreenState();
}

class _ProjectDetailScreenState extends State<ProjectDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProjectsProvider>().loadProjectDetail(widget.projectId);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Project Details'),
        actions: ShellScaffoldScope.notificationActions(),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSecondary,
          indicatorColor: AppColors.primary,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Documents'),
            Tab(text: 'Timeline'),
            Tab(text: 'Communication'),
          ],
        ),
      ),
      body: Consumer<ProjectsProvider>(
        builder: (context, provider, _) {
          if (provider.loading && provider.projectDetail == null) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            );
          }
          if (provider.error != null && provider.projectDetail == null) {
            return EmptyState(
              icon: Icons.error_outline,
              title: 'Failed to load project',
              subtitle: provider.error,
              actionLabel: 'Retry',
              onAction: () =>
                  provider.loadProjectDetail(widget.projectId),
            );
          }
          final data = _resolveData(provider);
          return TabBarView(
            controller: _tabController,
            children: [
              _OverviewTab(data: data),
              _DocumentsTab(projectId: widget.projectId, data: data),
              _TimelineTab(data: data),
              _CommunicationTab(data: data),
            ],
          );
        },
      ),
    );
  }

  Map<String, dynamic> _resolveData(ProjectsProvider provider) {
    final detail = provider.projectDetail;
    if (detail == null) return {};
    return (detail['data'] is Map)
        ? Map<String, dynamic>.from(detail['data'])
        : detail;
  }
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------
class _OverviewTab extends StatelessWidget {
  final Map<String, dynamic> data;

  const _OverviewTab({required this.data});

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) {
      return const EmptyState(
        icon: Icons.info_outline,
        title: 'No project data',
      );
    }

    final stage = (data['stage'] ?? 'new').toString();
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeader(context, stage),
          const SizedBox(height: 20),
          _SectionCard(
            title: 'Customer Information',
            icon: Icons.person_outline,
            children: [
              _DetailRow('Customer', data['customer_name'] ?? data['customerName'] ?? '-'),
              _DetailRow('Address', data['address'] ?? '-'),
              _DetailRow('Suburb', data['suburb'] ?? '-'),
              _DetailRow('Source', data['source'] ?? '-'),
            ],
          ),
          const SizedBox(height: 12),
          _SectionCard(
            title: 'System Details',
            icon: Icons.solar_power_outlined,
            children: [
              _DetailRow('System', data['system_summary'] ?? data['systemSummary'] ?? '-'),
              _DetailRow('Value', _formatCurrency(data['value'])),
              _DetailRow('Margin', data['margin_pct'] != null ? '${data['margin_pct']}%' : '-'),
            ],
          ),
          const SizedBox(height: 12),
          _SectionCard(
            title: 'Schedule',
            icon: Icons.calendar_today_outlined,
            children: [
              _DetailRow('Scheduled At', _formatDate(data['scheduled_at'])),
              _DetailRow('Schedule Status', data['schedule_status'] ?? '-'),
            ],
          ),
          const SizedBox(height: 12),
          _buildAssignees(context),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context, String stage) {
    return Row(
      children: [
        Expanded(
          child: Text(
            data['customer_name'] ?? data['customerName'] ?? 'Project',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
          ),
        ),
        StatusBadge.fromStatus(stage),
      ],
    );
  }

  Widget _buildAssignees(BuildContext context) {
    final assignees = data['assignees'];
    if (assignees == null || (assignees is List && assignees.isEmpty)) {
      return const SizedBox.shrink();
    }
    final list = (assignees is List) ? assignees : [];
    return _SectionCard(
      title: 'Assignees',
      icon: Icons.group_outlined,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 6,
          children: list
              .map((a) => Chip(
                    avatar: CircleAvatar(
                      backgroundColor: AppColors.primary.withOpacity(0.12),
                      child: Text(
                        a.toString().isNotEmpty ? a.toString()[0].toUpperCase() : '?',
                        style: const TextStyle(fontSize: 12, color: AppColors.primary),
                      ),
                    ),
                    label: Text(a.toString(), style: const TextStyle(fontSize: 13)),
                    backgroundColor: AppColors.surface,
                    side: const BorderSide(color: AppColors.border),
                  ))
              .toList(),
        ),
      ],
    );
  }

  String _formatCurrency(dynamic val) {
    if (val == null) return '-';
    final num v = val is num ? val : num.tryParse(val.toString()) ?? 0;
    return '\$${v.toStringAsFixed(0)}';
  }

  String _formatDate(dynamic val) {
    if (val == null) return '-';
    final dt = DateTime.tryParse(val.toString());
    if (dt == null) return val.toString();
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}

// ---------------------------------------------------------------------------
// Documents Tab
// ---------------------------------------------------------------------------
class _DocumentsTab extends StatelessWidget {
  final int projectId;
  final Map<String, dynamic> data;

  const _DocumentsTab({required this.projectId, required this.data});

  @override
  Widget build(BuildContext context) {
    final docs = data['documents'];
    final docList = (docs is List) ? docs : [];

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              const Icon(Icons.folder_outlined, color: AppColors.primary),
              const SizedBox(width: 8),
              Text(
                'Documents (${docList.length})',
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 16,
                  color: AppColors.textPrimary,
                ),
              ),
              const Spacer(),
              FilledButton.icon(
                onPressed: () => _uploadDocument(context),
                icon: const Icon(Icons.upload_file, size: 18),
                label: const Text('Upload'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: docList.isEmpty
              ? const EmptyState(
                  icon: Icons.description_outlined,
                  title: 'No documents yet',
                  subtitle: 'Upload project documents here.',
                )
              : ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: docList.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final doc = docList[index];
                    return ListTile(
                      leading: _docIcon(doc['file_name'] ?? ''),
                      title: Text(
                        doc['file_name'] ?? doc['name'] ?? 'Document',
                        style: const TextStyle(fontSize: 14),
                      ),
                      subtitle: Text(
                        doc['uploaded_at'] ?? doc['created_at'] ?? '',
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                      trailing: const Icon(Icons.download_outlined, color: AppColors.primary),
                    );
                  },
                ),
        ),
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
      case 'doc':
      case 'docx':
        icon = Icons.article_outlined;
        color = AppColors.primary;
        break;
      default:
        icon = Icons.insert_drive_file_outlined;
        color = AppColors.textSecondary;
    }
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Icon(icon, color: color, size: 22),
    );
  }

  Future<void> _uploadDocument(BuildContext context) async {
    final result = await showFilePickerSheet(context);
    if (result == null || !context.mounted) return;

    final formData = FormData.fromMap({
      'document': await MultipartFile.fromFile(
        result.file.path,
        filename: result.name,
      ),
    });

    try {
      await ProjectsService().uploadProjectDocument(projectId, formData);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Document uploaded'),
            backgroundColor: AppColors.success,
          ),
        );
        context.read<ProjectsProvider>().loadProjectDetail(projectId);
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Upload failed: $e'), backgroundColor: AppColors.danger),
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Timeline Tab
// ---------------------------------------------------------------------------
class _TimelineTab extends StatelessWidget {
  final Map<String, dynamic> data;

  const _TimelineTab({required this.data});

  @override
  Widget build(BuildContext context) {
    final timeline = data['timeline'] ?? data['activities'];
    final events = (timeline is List) ? timeline : [];

    if (events.isEmpty) {
      return const EmptyState(
        icon: Icons.timeline,
        title: 'No timeline events',
        subtitle: 'Activity will appear here as the project progresses.',
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: events.length,
      itemBuilder: (context, index) {
        final event = events[index] is Map ? events[index] : {};
        final isLast = index == events.length - 1;
        return _TimelineItem(
          title: event['title'] ?? event['action'] ?? 'Activity',
          description: event['description'] ?? event['note'] ?? '',
          date: event['created_at'] ?? event['date'] ?? '',
          isLast: isLast,
        );
      },
    );
  }
}

class _TimelineItem extends StatelessWidget {
  final String title;
  final String description;
  final String date;
  final bool isLast;

  const _TimelineItem({
    required this.title,
    required this.description,
    required this.date,
    required this.isLast,
  });

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 24,
            child: Column(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.white, width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withOpacity(0.3),
                        blurRadius: 4,
                      ),
                    ],
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(width: 2, color: AppColors.divider),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  if (description.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      description,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                  if (date.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      date,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.disabled,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Communication Tab
// ---------------------------------------------------------------------------
class _CommunicationTab extends StatelessWidget {
  final Map<String, dynamic> data;

  const _CommunicationTab({required this.data});

  @override
  Widget build(BuildContext context) {
    final comms = data['communications'] ?? data['messages'] ?? data['notes'];
    final messages = (comms is List) ? comms : [];

    if (messages.isEmpty) {
      return const EmptyState(
        icon: Icons.chat_bubble_outline,
        title: 'No messages yet',
        subtitle: 'Communication history will appear here.',
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: messages.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final msg = messages[index] is Map ? messages[index] : {};
        return Card(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: AppColors.border, width: 0.5),
          ),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 16,
                      backgroundColor: AppColors.primary.withOpacity(0.1),
                      child: Text(
                        (msg['sender'] ?? msg['from'] ?? '?')
                            .toString()
                            .isNotEmpty
                            ? (msg['sender'] ?? msg['from'] ?? '?')
                                .toString()[0]
                                .toUpperCase()
                            : '?',
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        msg['sender'] ?? msg['from'] ?? 'Unknown',
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    Text(
                      msg['created_at'] ?? msg['date'] ?? '',
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  msg['message'] ?? msg['body'] ?? msg['content'] ?? '',
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Shared widgets
// ---------------------------------------------------------------------------
class _SectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final List<Widget> children;

  const _SectionCard({
    required this.title,
    required this.icon,
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
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                    color: AppColors.textPrimary,
                  ),
                ),
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
            width: 110,
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
