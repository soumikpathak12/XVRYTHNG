import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../providers/messages_provider.dart';

/// Bottom sheet for creating a new group chat conversation.
class CreateGroupSheet extends StatefulWidget {
  final int? companyId;
  const CreateGroupSheet({super.key, this.companyId});

  @override
  State<CreateGroupSheet> createState() => _CreateGroupSheetState();
}

class _CreateGroupSheetState extends State<CreateGroupSheet> {
  final _nameController = TextEditingController();
  final _searchController = TextEditingController();
  final _selectedUserIds = <int>{};
  bool _creating = false;

  @override
  void dispose() {
    _nameController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    if (_nameController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Group name is required')),
      );
      return;
    }
    if (_selectedUserIds.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select at least 2 members')),
      );
      return;
    }

    setState(() => _creating = true);

    try {
      final provider = context.read<MessagesProvider>();
      await provider.createConversation(
        type: 'group',
        name: _nameController.text.trim(),
        userIds: _selectedUserIds.toList(),
        companyId: widget.companyId,
      );
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e')),
        );
        setState(() => _creating = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<MessagesProvider>(
      builder: (context, provider, _) {
        final search = _searchController.text.toLowerCase();
        final users = provider.users.where((u) {
          if (search.isEmpty) return true;
          return u.name.toLowerCase().contains(search);
        }).toList();

        return DraggableScrollableSheet(
          initialChildSize: 0.85,
          minChildSize: 0.5,
          maxChildSize: 0.95,
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
                        const Text(
                          'Create Group',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const Spacer(),
                        TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Cancel'),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: TextField(
                      controller: _nameController,
                      decoration: InputDecoration(
                        hintText: 'Group name',
                        prefixIcon:
                            const Icon(Icons.group, color: AppColors.primary),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        isDense: true,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: TextField(
                      controller: _searchController,
                      onChanged: (_) => setState(() {}),
                      decoration: InputDecoration(
                        hintText: 'Search members...',
                        prefixIcon: const Icon(Icons.search),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        isDense: true,
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
                    child: Row(
                      children: [
                        Text(
                          '${_selectedUserIds.length} member${_selectedUserIds.length == 1 ? '' : 's'} selected',
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1),
                  Expanded(
                    child: ListView.builder(
                      controller: scrollController,
                      padding: EdgeInsets.zero,
                      itemCount: users.length,
                      itemBuilder: (context, index) {
                        final user = users[index];
                        final selected =
                            _selectedUserIds.contains(user.userId);
                        return ListTile(
                          leading: CircleAvatar(
                            backgroundColor: selected
                                ? AppColors.primary
                                : AppColors.surface,
                            child: selected
                                ? const Icon(Icons.check,
                                    color: Colors.white, size: 18)
                                : Text(
                                    user.name.isNotEmpty
                                        ? user.name[0].toUpperCase()
                                        : '?',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w700),
                                  ),
                          ),
                          title: Text(user.name),
                          subtitle: user.email != null
                              ? Text(user.email!,
                                  style: const TextStyle(fontSize: 12))
                              : null,
                          trailing: selected
                              ? const Icon(Icons.check_circle,
                                  color: AppColors.primary)
                              : const Icon(Icons.circle_outlined,
                                  color: AppColors.border),
                          onTap: () {
                            setState(() {
                              if (selected) {
                                _selectedUserIds.remove(user.userId);
                              } else {
                                _selectedUserIds.add(user.userId);
                              }
                            });
                          },
                        );
                      },
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                    child: SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _creating ? null : _create,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: _creating
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: Colors.white))
                            : const Text(
                                'Create Group',
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 15,
                                ),
                              ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
