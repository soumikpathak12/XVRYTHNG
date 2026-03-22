import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/theme/app_colors.dart';
import '../../models/dashboard.dart';
import '../../models/lead.dart';
import '../../providers/leads_provider.dart';
import '../../widgets/common/file_picker_bottom_sheet.dart';
import '../../widgets/common/status_badge.dart';

class LeadDetailScreen extends StatefulWidget {
  final int leadId;
  const LeadDetailScreen({super.key, required this.leadId});

  @override
  State<LeadDetailScreen> createState() => _LeadDetailScreenState();
}

class _LeadDetailScreenState extends State<LeadDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  final _noteCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 4, vsync: this);
    context.read<LeadsProvider>().loadLeadDetail(widget.leadId);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  Lead? get _lead {
    final detail = context.read<LeadsProvider>().leadDetail;
    if (detail == null) return null;
    final raw = detail['lead'];
    if (raw is Lead) return raw;
    if (raw is Map<String, dynamic>) return Lead.fromJson(raw);
    return null;
  }

  List<ActivityItem> get _activities {
    final detail = context.read<LeadsProvider>().leadDetail;
    if (detail == null) return [];
    final list = detail['activities'];
    if (list is List) {
      return list.map((e) {
        if (e is ActivityItem) return e;
        if (e is Map<String, dynamic>) return ActivityItem.fromJson(e);
        return ActivityItem(id: 0, type: '', description: e.toString());
      }).toList();
    }
    return [];
  }

  List<Map<String, dynamic>> get _documents {
    final detail = context.read<LeadsProvider>().leadDetail;
    if (detail == null) return [];
    final list = detail['documents'];
    if (list is List) {
      return list.map((e) => e is Map<String, dynamic> ? e : <String, dynamic>{}).toList();
    }
    return [];
  }

  Future<void> _changeStage(Lead lead) async {
    final newStage = await showModalBottomSheet<String>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _StagePickerSheet(currentStage: lead.stage),
    );
    if (newStage == null || !mounted) return;
    try {
      await context.read<LeadsProvider>().updateLeadStage(lead.id, newStage);
      await context.read<LeadsProvider>().loadLeadDetail(widget.leadId);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update stage: $e')),
        );
      }
    }
  }

  Future<void> _call(String phone) async {
    final uri = Uri(scheme: 'tel', path: phone);
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  Future<void> _email(String email) async {
    final uri = Uri(scheme: 'mailto', path: email);
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  Future<void> _uploadDocument() async {
    final result = await showFilePickerSheet(context);
    if (result == null || !mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Uploading ${result.name}...')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<LeadsProvider>(
      builder: (context, provider, _) {
        if (provider.loading && provider.leadDetail == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Lead Detail')),
            body: const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            ),
          );
        }

        final detail = provider.leadDetail;
        if (detail == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Lead Detail')),
            body: const Center(child: Text('Lead not found')),
          );
        }

        final lead = _lead;
        if (lead == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Lead Detail')),
            body: const Center(child: Text('Lead data invalid')),
          );
        }

        return Scaffold(
          backgroundColor: AppColors.surface,
          body: NestedScrollView(
            headerSliverBuilder: (context, _) => [
              SliverAppBar(
                pinned: true,
                expandedHeight: 200,
                flexibleSpace: FlexibleSpaceBar(
                  background: _LeadHeader(
                    lead: lead,
                    onCall: lead.phone != null ? () => _call(lead.phone!) : null,
                    onEmail:
                        lead.email != null ? () => _email(lead.email!) : null,
                    onChangeStage: () => _changeStage(lead),
                  ),
                ),
                title: Text(
                  lead.customerName,
                  style: const TextStyle(fontSize: 16),
                ),
                bottom: TabBar(
                  controller: _tabCtrl,
                  labelColor: AppColors.primary,
                  unselectedLabelColor: AppColors.textSecondary,
                  indicatorColor: AppColors.primary,
                  indicatorWeight: 3,
                  tabs: const [
                    Tab(text: 'Overview'),
                    Tab(text: 'Details'),
                    Tab(text: 'Activity'),
                    Tab(text: 'Documents'),
                  ],
                ),
              ),
            ],
            body: TabBarView(
              controller: _tabCtrl,
              children: [
                _OverviewTab(lead: lead),
                _DetailsTab(lead: lead),
                _ActivityTab(
                  activities: _activities,
                  noteController: _noteCtrl,
                  onAddNote: () {
                    if (_noteCtrl.text.trim().isEmpty) return;
                    _noteCtrl.clear();
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Note added')),
                    );
                  },
                ),
                _DocumentsTab(
                  documents: _documents,
                  onUpload: _uploadDocument,
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
// Lead header (inside FlexibleSpaceBar)
// ---------------------------------------------------------------------------
class _LeadHeader extends StatelessWidget {
  final Lead lead;
  final VoidCallback? onCall;
  final VoidCallback? onEmail;
  final VoidCallback onChangeStage;

  const _LeadHeader({
    required this.lead,
    this.onCall,
    this.onEmail,
    required this.onChangeStage,
  });

  @override
  Widget build(BuildContext context) {
    final currFmt = NumberFormat.currency(symbol: '\$', decimalDigits: 0);

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primary, Color(0xFF136363)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      padding: EdgeInsets.fromLTRB(
          20, MediaQuery.of(context).padding.top + 56, 20, 60),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          Row(
            children: [
              StatusBadge(
                label: Lead.stageLabels[lead.stage] ?? lead.stage,
                color: Colors.white.withOpacity(0.2),
                textColor: Colors.white,
              ),
              const SizedBox(width: 8),
              if (lead.value != null)
                Text(
                  currFmt.format(lead.value!),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              if (lead.email != null)
                _HeaderAction(
                  icon: Icons.email_outlined,
                  label: 'Email',
                  onTap: onEmail,
                ),
              if (lead.phone != null) ...[
                const SizedBox(width: 12),
                _HeaderAction(
                  icon: Icons.phone_outlined,
                  label: 'Call',
                  onTap: onCall,
                ),
              ],
              const SizedBox(width: 12),
              _HeaderAction(
                icon: Icons.swap_horiz_rounded,
                label: 'Stage',
                onTap: onChangeStage,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HeaderAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  const _HeaderAction({
    required this.icon,
    required this.label,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.15),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: Colors.white),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Stage picker bottom sheet
// ---------------------------------------------------------------------------
class _StagePickerSheet extends StatelessWidget {
  final String currentStage;
  const _StagePickerSheet({required this.currentStage});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Change Stage',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 16),
            ...Lead.stages.map((stage) {
              final isSelected = stage == currentStage;
              return ListTile(
                title: Text(
                  Lead.stageLabels[stage] ?? stage,
                  style: TextStyle(
                    fontWeight:
                        isSelected ? FontWeight.w600 : FontWeight.normal,
                    color: isSelected
                        ? AppColors.primary
                        : AppColors.textPrimary,
                  ),
                ),
                trailing: isSelected
                    ? const Icon(Icons.check_circle,
                        color: AppColors.primary)
                    : null,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
                onTap: () => Navigator.pop(context, stage),
              );
            }),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------
class _OverviewTab extends StatelessWidget {
  final Lead lead;
  const _OverviewTab({required this.lead});

  @override
  Widget build(BuildContext context) {
    final dateFmt = DateFormat('d MMM yyyy');
    final currFmt = NumberFormat.currency(symbol: '\$', decimalDigits: 0);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _DetailCard(
          title: 'Summary',
          children: [
            _DetailRow('Customer', lead.customerName),
            _DetailRow(
                'Stage', Lead.stageLabels[lead.stage] ?? lead.stage),
            if (lead.value != null)
              _DetailRow('Value', currFmt.format(lead.value!)),
            if (lead.systemSize != null)
              _DetailRow('System Size', lead.systemSize!),
            if (lead.source != null)
              _DetailRow('Source', lead.source!),
            if (lead.assignedToName != null)
              _DetailRow('Assigned To', lead.assignedToName!),
            if (lead.createdAt != null)
              _DetailRow('Created', dateFmt.format(lead.createdAt!)),
          ],
        ),
        const SizedBox(height: 14),
        if (lead.notes != null && lead.notes!.isNotEmpty)
          _DetailCard(
            title: 'Notes',
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Text(
                  lead.notes!,
                  style: const TextStyle(
                      fontSize: 14, color: AppColors.textSecondary),
                ),
              ),
            ],
          ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Details tab
// ---------------------------------------------------------------------------
class _DetailsTab extends StatelessWidget {
  final Lead lead;
  const _DetailsTab({required this.lead});

  @override
  Widget build(BuildContext context) {
    final dateFmt = DateFormat('d MMM yyyy, h:mm a');

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _DetailCard(
          title: 'Contact Information',
          children: [
            _DetailRow('Name', lead.customerName),
            if (lead.email != null) _DetailRow('Email', lead.email!),
            if (lead.phone != null) _DetailRow('Phone', lead.phone!),
            if (lead.suburb != null) _DetailRow('Suburb', lead.suburb!),
            if (lead.address != null)
              _DetailRow('Address', lead.address!),
          ],
        ),
        const SizedBox(height: 14),
        _DetailCard(
          title: 'Project Information',
          children: [
            if (lead.systemSize != null)
              _DetailRow('System Size', lead.systemSize!),
            if (lead.source != null) _DetailRow('Source', lead.source!),
            _DetailRow(
                'Stage', Lead.stageLabels[lead.stage] ?? lead.stage),
            if (lead.lastActivity != null)
              _DetailRow('Last Activity', lead.lastActivity!),
          ],
        ),
        const SizedBox(height: 14),
        _DetailCard(
          title: 'Timestamps',
          children: [
            if (lead.createdAt != null)
              _DetailRow('Created', dateFmt.format(lead.createdAt!)),
            if (lead.updatedAt != null)
              _DetailRow('Updated', dateFmt.format(lead.updatedAt!)),
          ],
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Activity tab
// ---------------------------------------------------------------------------
class _ActivityTab extends StatelessWidget {
  final List<ActivityItem> activities;
  final TextEditingController noteController;
  final VoidCallback onAddNote;

  const _ActivityTab({
    required this.activities,
    required this.noteController,
    required this.onAddNote,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: activities.isEmpty
              ? const Center(
                  child: Text(
                    'No activity yet',
                    style: TextStyle(color: AppColors.textSecondary),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                  itemCount: activities.length,
                  itemBuilder: (_, i) =>
                      _TimelineItem(activity: activities[i], isLast: i == activities.length - 1),
                ),
        ),
        Container(
          padding: const EdgeInsets.fromLTRB(16, 8, 8, 8),
          decoration: BoxDecoration(
            color: AppColors.white,
            border: Border(
              top: BorderSide(color: AppColors.divider.withOpacity(0.6)),
            ),
          ),
          child: SafeArea(
            top: false,
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: noteController,
                    decoration: InputDecoration(
                      hintText: 'Add a note...',
                      hintStyle:
                          const TextStyle(color: AppColors.textSecondary),
                      filled: true,
                      fillColor: AppColors.surface,
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                    ),
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => onAddNote(),
                  ),
                ),
                const SizedBox(width: 4),
                IconButton(
                  onPressed: onAddNote,
                  icon: const Icon(Icons.send_rounded),
                  color: AppColors.primary,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _TimelineItem extends StatelessWidget {
  final ActivityItem activity;
  final bool isLast;

  const _TimelineItem({required this.activity, this.isLast = false});

  IconData get _icon {
    switch (activity.type) {
      case 'lead_created':
        return Icons.person_add_rounded;
      case 'stage_changed':
        return Icons.swap_horiz_rounded;
      case 'note_added':
        return Icons.sticky_note_2_rounded;
      case 'call':
        return Icons.phone_rounded;
      case 'email':
        return Icons.email_rounded;
      case 'document':
        return Icons.attach_file_rounded;
      default:
        return Icons.circle;
    }
  }

  Color get _color {
    switch (activity.type) {
      case 'lead_created':
        return AppColors.success;
      case 'stage_changed':
        return AppColors.info;
      case 'note_added':
        return AppColors.warning;
      default:
        return AppColors.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final timeFmt = DateFormat('d MMM, h:mm a');

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 40,
            child: Column(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: _color.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(_icon, size: 16, color: _color),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      color: AppColors.divider,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    activity.description,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      if (activity.userName != null) ...[
                        Text(
                          activity.userName!,
                          style: const TextStyle(
                              fontSize: 11, color: AppColors.textSecondary),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          width: 3,
                          height: 3,
                          decoration: const BoxDecoration(
                            color: AppColors.textSecondary,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                      ],
                      if (activity.createdAt != null)
                        Text(
                          timeFmt.format(activity.createdAt!),
                          style: const TextStyle(
                              fontSize: 11, color: AppColors.textSecondary),
                        ),
                    ],
                  ),
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
// Documents tab
// ---------------------------------------------------------------------------
class _DocumentsTab extends StatelessWidget {
  final List<Map<String, dynamic>> documents;
  final VoidCallback onUpload;

  const _DocumentsTab({required this.documents, required this.onUpload});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Row(
            children: [
              const Text(
                'Documents',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
              const Spacer(),
              FilledButton.tonalIcon(
                onPressed: onUpload,
                icon: const Icon(Icons.upload_file, size: 18),
                label: const Text('Upload'),
              ),
            ],
          ),
        ),
        Expanded(
          child: documents.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.folder_open_rounded,
                          size: 48, color: AppColors.disabled),
                      SizedBox(height: 8),
                      Text(
                        'No documents yet',
                        style: TextStyle(color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                )
              : ListView.separated(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  itemCount: documents.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) => _DocumentTile(doc: documents[i]),
                ),
        ),
      ],
    );
  }
}

class _DocumentTile extends StatelessWidget {
  final Map<String, dynamic> doc;
  const _DocumentTile({required this.doc});

  IconData get _icon {
    final name = (doc['file_name'] ?? doc['name'] ?? '').toString().toLowerCase();
    if (name.endsWith('.pdf')) return Icons.picture_as_pdf_rounded;
    if (name.endsWith('.jpg') || name.endsWith('.png') || name.endsWith('.jpeg')) {
      return Icons.image_rounded;
    }
    if (name.endsWith('.doc') || name.endsWith('.docx')) {
      return Icons.description_rounded;
    }
    return Icons.insert_drive_file_rounded;
  }

  @override
  Widget build(BuildContext context) {
    final name = doc['file_name'] ?? doc['name'] ?? 'Unknown file';
    final dateFmt = DateFormat('d MMM yyyy');
    final uploadedAt = doc['created_at'] != null
        ? dateFmt.format(DateTime.parse(doc['created_at'].toString()))
        : '';

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border.withOpacity(0.5)),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(_icon, size: 22, color: AppColors.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name.toString(),
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (uploadedAt.isNotEmpty)
                  Text(
                    uploadedAt,
                    style: const TextStyle(
                        fontSize: 11, color: AppColors.textSecondary),
                  ),
              ],
            ),
          ),
          const Icon(Icons.download_rounded,
              size: 20, color: AppColors.textSecondary),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Detail card & row helpers
// ---------------------------------------------------------------------------
class _DetailCard extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _DetailCard({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
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
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const Divider(height: 20),
          ...children,
        ],
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
      padding: const EdgeInsets.symmetric(vertical: 5),
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
