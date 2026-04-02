import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../models/workflow_settings.dart';
import '../../providers/settings_provider.dart';

/// Workflow Configuration screen — edit sales + PM pipeline stages.
class WorkflowConfigScreen extends StatefulWidget {
  const WorkflowConfigScreen({super.key});

  @override
  State<WorkflowConfigScreen> createState() => _WorkflowConfigScreenState();
}

class _WorkflowConfigScreenState extends State<WorkflowConfigScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SettingsProvider>().loadWorkflow();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Workflow Configuration')),
      body: Consumer<SettingsProvider>(
        builder: (context, provider, _) {
          if (provider.loading && provider.workflow == null) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            );
          }

          final workflow = provider.workflow;
          if (workflow == null) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error_outline,
                      size: 48, color: AppColors.danger),
                  const SizedBox(height: 12),
                  Text(provider.error ?? 'Failed to load',
                      style:
                          const TextStyle(color: AppColors.textSecondary)),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: () => provider.loadWorkflow(),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              const Text(
                'Customise sales and project pipelines. Drag to reorder. Toggles save immediately.',
                style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 20),

              _PipelineEditor(
                title: 'Sales Pipeline',
                description:
                    'Stages for the Leads Kanban board, table, and new lead form.',
                pipeline: 'sales',
                stages: workflow.sales.stages,
                provider: provider,
              ),

              const Divider(height: 40),

              _PipelineEditor(
                title: 'Project Management Pipeline',
                description: 'Stages for in-house projects.',
                pipeline: 'project_management',
                stages: workflow.projectManagement.stages,
                provider: provider,
              ),

              if (provider.error != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.danger.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    provider.error!,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.danger,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 40),
            ],
          );
        },
      ),
    );
  }
}

class _PipelineEditor extends StatefulWidget {
  final String title;
  final String description;
  final String pipeline;
  final List<PipelineStage> stages;
  final SettingsProvider provider;

  const _PipelineEditor({
    required this.title,
    required this.description,
    required this.pipeline,
    required this.stages,
    required this.provider,
  });

  @override
  State<_PipelineEditor> createState() => _PipelineEditorState();
}

class _PipelineEditorState extends State<_PipelineEditor> {
  final _newNameController = TextEditingController();
  late List<PipelineStage> _localStages;

  @override
  void initState() {
    super.initState();
    _localStages = List.from(widget.stages);
  }

  @override
  void didUpdateWidget(covariant _PipelineEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.stages != widget.stages) {
      _localStages = List.from(widget.stages);
    }
  }

  @override
  void dispose() {
    _newNameController.dispose();
    super.dispose();
  }

  void _save(List<PipelineStage> stages) {
    setState(() => _localStages = stages);
    widget.provider.updatePipelineStages(widget.pipeline, stages);
  }

  void _toggle(int index) {
    final updated = List<PipelineStage>.from(_localStages);
    updated[index] = updated[index].copyWith(
        enabled: !updated[index].enabled);
    _save(updated);
  }

  void _remove(int index) {
    if (_localStages[index].builtin) return;
    final updated = List<PipelineStage>.from(_localStages);
    updated.removeAt(index);
    _save(updated);
  }

  void _addCustom() {
    final name = _newNameController.text.trim();
    if (name.isEmpty) return;
    _newNameController.clear();
    final key =
        'custom_${DateTime.now().millisecondsSinceEpoch.toRadixString(36)}';
    final updated = [
      ..._localStages,
      PipelineStage(key: key, label: name, enabled: true, builtin: false),
    ];
    _save(updated);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          widget.description,
          style:
              const TextStyle(fontSize: 12, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 14),

        // Reorderable stage list
        ReorderableListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _localStages.length,
          onReorder: (oldIndex, newIndex) {
            if (newIndex > oldIndex) newIndex--;
            final updated = List<PipelineStage>.from(_localStages);
            final item = updated.removeAt(oldIndex);
            updated.insert(newIndex, item);
            _save(updated);
          },
          itemBuilder: (context, index) {
            final stage = _localStages[index];
            return Container(
              key: ValueKey(stage.key),
              margin: const EdgeInsets.only(bottom: 8),
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: stage.enabled ? Colors.white : AppColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  Icon(Icons.drag_handle,
                      size: 20, color: AppColors.textSecondary),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      stage.label,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: stage.enabled
                            ? AppColors.textPrimary
                            : AppColors.textSecondary,
                      ),
                    ),
                  ),
                  Switch(
                    value: stage.enabled,
                    onChanged: (_) => _toggle(index),
                    activeColor: AppColors.primary,
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  if (!stage.builtin)
                    IconButton(
                      icon: const Icon(Icons.delete_outline,
                          size: 20, color: AppColors.danger),
                      onPressed: () => _remove(index),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      visualDensity: VisualDensity.compact,
                    ),
                  if (stage.builtin) const SizedBox(width: 30),
                ],
              ),
            );
          },
        ),

        // Add custom stage
        Container(
          margin: const EdgeInsets.only(top: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
                color: AppColors.border, style: BorderStyle.solid),
            color: AppColors.surface,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.add, size: 16, color: AppColors.primary),
                  SizedBox(width: 6),
                  Text(
                    'Add custom stage',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _newNameController,
                      decoration: InputDecoration(
                        hintText: 'Stage name',
                        hintStyle: const TextStyle(fontSize: 14),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide:
                              const BorderSide(color: AppColors.border),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 10),
                        isDense: true,
                      ),
                      onSubmitted: (_) => _addCustom(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: _addCustom,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Text('Add'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const Text(
                'Disabled stages are hidden from the Kanban. Items in an inactive stage appear in the first active column.',
                style:
                    TextStyle(fontSize: 11, color: AppColors.textSecondary),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
