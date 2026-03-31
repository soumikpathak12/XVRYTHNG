import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../providers/messages_provider.dart';
import '../../models/message.dart';
import '../../services/messages_service.dart';

/// Bottom sheet showing group info: name, participants, manage members.
class GroupInfoSheet extends StatefulWidget {
  final Conversation conversation;
  final int? companyId;

  const GroupInfoSheet({
    super.key,
    required this.conversation,
    this.companyId,
  });

  @override
  State<GroupInfoSheet> createState() => _GroupInfoSheetState();
}

class _GroupInfoSheetState extends State<GroupInfoSheet> {
  final _service = MessagesService();
  bool _busy = false;

  Future<void> _removeMember(Participant member) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Remove Member'),
        content: Text('Remove ${member.name} from the group?'),
        actions: [
          TextButton(
            child: const Text('Cancel'),
            onPressed: () => Navigator.pop(c, false),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: AppColors.danger),
            child: const Text('Remove'),
            onPressed: () => Navigator.pop(c, true),
          ),
        ],
      ),
    );

    if (confirmed != true) return;
    setState(() => _busy = true);
    try {
      await _service.removeGroupParticipant(
        widget.conversation.id,
        member.userId,
        companyId: widget.companyId,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${member.name} removed')),
        );
        context.read<MessagesProvider>().loadConversations();
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _addMembers() async {
    final provider = context.read<MessagesProvider>();
    final existingIds =
        widget.conversation.participants.map((p) => p.userId).toSet();
    final available =
        provider.users.where((u) => !existingIds.contains(u.userId)).toList();

    if (available.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('All users are already in the group')),
      );
      return;
    }

    final selected = await showDialog<List<int>>(
      context: context,
      builder: (c) => _AddMembersDialog(available: available),
    );

    if (selected == null || selected.isEmpty) return;

    setState(() => _busy = true);
    try {
      await _service.addGroupParticipants(
        widget.conversation.id,
        selected,
        companyId: widget.companyId,
      );
      if (mounted) {
        provider.loadConversations();
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final conv = widget.conversation;
    final participants = conv.participants;
    final displayName = conv.name ?? 'Group Chat';

    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.3,
      maxChildSize: 0.85,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(top: 12),
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: AppColors.primary.withOpacity(0.1),
                      radius: 22,
                      child: const Icon(Icons.group,
                          color: AppColors.primary),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            displayName,
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          Text(
                            '${participants.length} member${participants.length == 1 ? '' : 's'}',
                            style: const TextStyle(
                              fontSize: 13,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.person_add,
                          color: AppColors.primary),
                      onPressed: _busy ? null : _addMembers,
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: ListView.builder(
                  controller: scrollController,
                  padding: EdgeInsets.zero,
                  itemCount: participants.length,
                  itemBuilder: (context, index) {
                    final p = participants[index];
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundColor: AppColors.surface,
                        child: Text(
                          p.name.isNotEmpty ? p.name[0].toUpperCase() : '?',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                      title: Text(p.name,
                          style: const TextStyle(
                              fontWeight: FontWeight.w600, fontSize: 14)),
                      subtitle: p.email != null
                          ? Text(p.email!,
                              style: const TextStyle(fontSize: 12))
                          : null,
                      trailing: IconButton(
                        icon: const Icon(Icons.remove_circle_outline,
                            color: AppColors.danger, size: 20),
                        onPressed: _busy ? null : () => _removeMember(p),
                      ),
                    );
                  },
                ),
              ),
              if (_busy)
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Center(
                    child: CircularProgressIndicator(
                        color: AppColors.primary),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

class _AddMembersDialog extends StatefulWidget {
  final List<Participant> available;
  const _AddMembersDialog({required this.available});

  @override
  State<_AddMembersDialog> createState() => _AddMembersDialogState();
}

class _AddMembersDialogState extends State<_AddMembersDialog> {
  final _selected = <int>{};

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Add Members'),
      content: SizedBox(
        width: double.maxFinite,
        height: 300,
        child: ListView.builder(
          itemCount: widget.available.length,
          itemBuilder: (context, index) {
            final user = widget.available[index];
            final isSelected = _selected.contains(user.userId);
            return CheckboxListTile(
              value: isSelected,
              onChanged: (v) {
                setState(() {
                  if (v == true) {
                    _selected.add(user.userId);
                  } else {
                    _selected.remove(user.userId);
                  }
                });
              },
              title: Text(user.name),
              activeColor: AppColors.primary,
            );
          },
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () => Navigator.pop(context, _selected.toList()),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
          ),
          child: Text('Add (${_selected.length})'),
        ),
      ],
    );
  }
}
