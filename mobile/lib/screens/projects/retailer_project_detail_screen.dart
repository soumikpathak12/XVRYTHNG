import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../core/theme/app_colors.dart';
import '../../services/projects_service.dart';
import '../../widgets/common/status_badge.dart';
import '../../widgets/common/empty_state.dart';
import '../../widgets/common/file_picker_bottom_sheet.dart';

/// Retailer project detail — Overview, Documents, Notes, Activity.
class RetailerProjectDetailScreen extends StatefulWidget {
  final int projectId;
  const RetailerProjectDetailScreen({super.key, required this.projectId});

  @override
  State<RetailerProjectDetailScreen> createState() =>
      _RetailerProjectDetailScreenState();
}

class _RetailerProjectDetailScreenState
    extends State<RetailerProjectDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;
  final _service = ProjectsService();

  Map<String, dynamic> _data = {};
  List<Map<String, dynamic>> _notes = [];
  List<Map<String, dynamic>> _docs = [];
  bool _loading = true;
  String? _error;

  final _noteCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 4, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabs.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final result = await _service.getRetailerProject(widget.projectId);
      final data = result['data'] is Map
          ? Map<String, dynamic>.from(result['data'])
          : result;
      final notes =
          await _service.getRetailerProjectNotes(widget.projectId);
      final docs =
          await _service.getRetailerProjectDocuments(widget.projectId);
      setState(() {
        _data = data;
        _notes = notes;
        _docs = docs;
        _error = null;
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _changeStage(String stage) async {
    try {
      await _service.updateRetailerProjectStage(widget.projectId, stage);
      _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Stage updated to $stage'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e')),
        );
      }
    }
  }

  Future<void> _addNote() async {
    if (_noteCtrl.text.trim().isEmpty) return;
    try {
      await _service.addRetailerProjectNote(
          widget.projectId, _noteCtrl.text.trim());
      _noteCtrl.clear();
      final notes =
          await _service.getRetailerProjectNotes(widget.projectId);
      setState(() => _notes = notes);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e')),
        );
      }
    }
  }

  Future<void> _uploadDoc() async {
    final result = await showFilePickerSheet(context);
    if (result == null || !mounted) return;

    final formData = FormData.fromMap({
      'document': await MultipartFile.fromFile(
        result.file.path,
        filename: result.name,
      ),
    });

    try {
      await _service.uploadRetailerProjectDocument(
          widget.projectId, formData);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Document uploaded'),
            backgroundColor: AppColors.success,
          ),
        );
        final docs = await _service
            .getRetailerProjectDocuments(widget.projectId);
        setState(() => _docs = docs);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Upload failed: $e')),
        );
      }
    }
  }

  void _showStageSheet() {
    const stages = [
      'new',
      'in_progress',
      'awaiting_parts',
      'scheduled',
      'completed',
      'cancelled'
    ];
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Change Stage',
                  style: TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 16)),
            ),
            ...stages.map((s) => ListTile(
                  leading: Icon(
                    s == (_data['stage'] ?? '')
                        ? Icons.radio_button_checked
                        : Icons.radio_button_unchecked,
                    color: AppColors.primary,
                  ),
                  title: Text(s.replaceAll('_', ' ').toUpperCase()),
                  onTap: () {
                    Navigator.pop(ctx);
                    _changeStage(s);
                  },
                )),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Retailer Project'),
        actions: [
          if (_data.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.swap_vert),
              tooltip: 'Change Stage',
              onPressed: _showStageSheet,
            ),
        ],
        bottom: TabBar(
          controller: _tabs,
          labelColor: AppColors.white,
          unselectedLabelColor: Colors.white70,
          indicatorColor: AppColors.white,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Documents'),
            Tab(text: 'Notes'),
            Tab(text: 'Activity'),
          ],
        ),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary))
          : _error != null && _data.isEmpty
              ? EmptyState(
                  icon: Icons.error_outline,
                  title: 'Failed to load',
                  subtitle: _error,
                  actionLabel: 'Retry',
                  onAction: _load,
                )
              : TabBarView(
                  controller: _tabs,
                  children: [
                    _buildOverview(),
                    _buildDocuments(),
                    _buildNotes(),
                    _buildActivity(),
                  ],
                ),
    );
  }

  Widget _buildOverview() {
    final stage = (_data['stage'] ?? 'new').toString();
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Expanded(
              child: Text(
                _data['customer_name'] ?? _data['customerName'] ?? 'Project',
                style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary),
              ),
            ),
            StatusBadge.fromStatus(stage),
          ]),
          const SizedBox(height: 16),
          _infoCard('Customer', [
            _row('Name', _data['customer_name'] ?? '-'),
            _row('Address', _data['address'] ?? '-'),
            _row('Suburb', _data['suburb'] ?? '-'),
            _row('Phone', _data['phone'] ?? '-'),
            _row('Email', _data['email'] ?? '-'),
          ]),
          const SizedBox(height: 12),
          _infoCard('System', [
            _row('System', _data['system_summary'] ?? '-'),
            _row('Value', _data['value'] != null
                ? '\$${_data['value']}'
                : '-'),
          ]),
        ],
      ),
    );
  }

  Widget _buildDocuments() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Text('Documents (${_docs.length})',
                  style: const TextStyle(
                      fontWeight: FontWeight.w600, fontSize: 16)),
              const Spacer(),
              FilledButton.icon(
                onPressed: _uploadDoc,
                icon: const Icon(Icons.upload_file, size: 18),
                label: const Text('Upload'),
                style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary),
              ),
            ],
          ),
        ),
        Expanded(
          child: _docs.isEmpty
              ? const EmptyState(
                  icon: Icons.description_outlined,
                  title: 'No documents',
                )
              : ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: _docs.length,
                  separatorBuilder: (_, __) =>
                      const Divider(height: 1),
                  itemBuilder: (_, i) {
                    final doc = _docs[i];
                    return ListTile(
                      leading: const Icon(Icons.insert_drive_file,
                          color: AppColors.primary),
                      title: Text(
                          doc['file_name'] ?? doc['name'] ?? 'Document',
                          style: const TextStyle(fontSize: 14)),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildNotes() {
    return Column(
      children: [
        Expanded(
          child: _notes.isEmpty
              ? const EmptyState(
                  icon: Icons.sticky_note_2_outlined,
                  title: 'No notes yet',
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _notes.length,
                  separatorBuilder: (_, __) =>
                      const SizedBox(height: 10),
                  itemBuilder: (_, i) {
                    final note = _notes[i];
                    return Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            note['note'] ?? note['content'] ?? '',
                            style: const TextStyle(fontSize: 14),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            note['created_at'] ?? '',
                            style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),
        // Add note input
        Container(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          decoration: const BoxDecoration(
            border:
                Border(top: BorderSide(color: AppColors.divider)),
          ),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _noteCtrl,
                  decoration: InputDecoration(
                    hintText: 'Add a note...',
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12)),
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 12),
                  ),
                  textCapitalization: TextCapitalization.sentences,
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.send,
                    color: AppColors.primary),
                onPressed: _addNote,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildActivity() {
    final timeline = _data['timeline'] ?? _data['activities'];
    final events = (timeline is List) ? timeline : [];
    if (events.isEmpty) {
      return const EmptyState(
        icon: Icons.timeline,
        title: 'No activity yet',
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: events.length,
      itemBuilder: (_, i) {
        final e = events[i] is Map ? events[i] : {};
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 8,
                height: 8,
                margin: const EdgeInsets.only(top: 6),
                decoration: const BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(e['title'] ?? e['action'] ?? '',
                        style: const TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 13)),
                    if ((e['description'] ?? '').isNotEmpty)
                      Text(e['description'],
                          style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary)),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _infoCard(String title, List<Widget> children) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: const TextStyle(
                    fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 10),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          SizedBox(
            width: 100,
            child: Text(label,
                style: const TextStyle(
                    fontSize: 13, color: AppColors.textSecondary)),
          ),
          Expanded(
            child: Text(value,
                style: const TextStyle(
                    fontSize: 13, fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
  }
}
