import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/common/file_picker_bottom_sheet.dart';
import '../../widgets/common/loading_overlay.dart';
import '../../widgets/common/shell_scaffold_scope.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _api = ApiClient();
  final _nameCtrl = TextEditingController();
  final _currentPwCtrl = TextEditingController();
  final _newPwCtrl = TextEditingController();
  final _confirmPwCtrl = TextEditingController();

  bool _editingName = false;
  bool _savingName = false;
  bool _uploadingAvatar = false;
  bool _changingPassword = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    _nameCtrl.text = user?.name ?? '';
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _currentPwCtrl.dispose();
    _newPwCtrl.dispose();
    _confirmPwCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickAndUploadAvatar() async {
    final result = await showFilePickerSheet(
      context,
      imageOnly: true,
      imageQuality: null,
      maxWidth: null,
      maxHeight: null,
    );
    if (result == null) return;

    setState(() => _uploadingAvatar = true);
    try {
      final formData = FormData.fromMap({
        'photo': await MultipartFile.fromFile(
          result.file.path,
          filename: result.name,
          contentType: DioMediaType.parse(result.mimeType ?? 'image/jpeg'),
        ),
      });
      await _api.uploadPut('/api/users/me', formData);
      if (mounted) {
        await context.read<AuthProvider>().initialize();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Avatar updated successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Upload failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _uploadingAvatar = false);
    }
  }

  Future<void> _removeAvatar() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove profile photo?'),
        content: const Text(
          'Your photo will be removed from your account on the server.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (ok != true) return;

    setState(() => _uploadingAvatar = true);
    try {
      await _api.put('/api/users/me', data: {'remove_photo': true});
      if (mounted) {
        await context.read<AuthProvider>().initialize();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile photo removed')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Remove failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _uploadingAvatar = false);
    }
  }

  Future<void> _saveName() async {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) return;

    setState(() => _savingName = true);
    try {
      await _api.put('/api/users/me', data: {'name': name});
      if (mounted) {
        await context.read<AuthProvider>().initialize();
        setState(() => _editingName = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Name updated')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _savingName = false);
    }
  }

  Future<void> _changePassword() async {
    if (_newPwCtrl.text.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password must be at least 8 characters')),
      );
      return;
    }
    if (_newPwCtrl.text != _confirmPwCtrl.text) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Passwords don\'t match')));
      return;
    }

    setState(() => _changingPassword = true);
    try {
      await context.read<AuthProvider>().changePassword(
        _currentPwCtrl.text,
        _newPwCtrl.text,
      );
      _currentPwCtrl.clear();
      _newPwCtrl.clear();
      _confirmPwCtrl.clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Password changed successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _changingPassword = false);
    }
  }

  String _roleLabel(String role) {
    return role
        .replaceAll('_', ' ')
        .split(' ')
        .map((w) => w.isEmpty ? '' : '${w[0].toUpperCase()}${w.substring(1)}')
        .join(' ');
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final shellLeading = ShellScaffoldScope.navigationLeading(context);

    return Scaffold(
      appBar: AppBar(
        leading: shellLeading,
        automaticallyImplyLeading: shellLeading == null,
        title: const Text('Profile'),
        actions: ShellScaffoldScope.notificationActions(),
      ),
      body: LoadingOverlay(
        isLoading: _uploadingAvatar,
        message: 'Updating profile photo...',
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildAvatarSection(user?.avatarUrl, user?.name ?? '?'),
            if (user != null &&
                (user.avatarUrl?.trim().isNotEmpty ?? false)) ...[
              const SizedBox(height: 12),
              TextButton.icon(
                onPressed: _uploadingAvatar ? null : _removeAvatar,
                icon: const Icon(Icons.delete_outline, color: AppColors.danger),
                label: const Text(
                  'Remove profile photo',
                  style: TextStyle(color: AppColors.danger),
                ),
              ),
            ],
            const SizedBox(height: 24),
            _buildInfoSection(user),
            const SizedBox(height: 24),
            _buildNameEditSection(),
            const SizedBox(height: 24),
            _buildPasswordSection(),
          ],
        ),
      ),
    );
  }

  Widget _buildAvatarSection(String? avatarUrl, String name) {
    return Center(
      child: Stack(
        children: [
          CircleAvatar(
            radius: 56,
            backgroundColor: AppColors.primary.withOpacity(0.1),
            backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
            child: avatarUrl == null
                ? Text(
                    name.isNotEmpty ? name[0].toUpperCase() : '?',
                    style: const TextStyle(
                      fontSize: 40,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  )
                : null,
          ),
          Positioned(
            bottom: 0,
            right: 0,
            child: Material(
              color: AppColors.primary,
              shape: const CircleBorder(),
              elevation: 2,
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: _uploadingAvatar ? null : _pickAndUploadAvatar,
                child: Padding(
                  padding: const EdgeInsets.all(8),
                  child: _uploadingAvatar
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.white,
                          ),
                        )
                      : const Icon(
                          Icons.camera_alt,
                          size: 18,
                          color: AppColors.white,
                        ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoSection(dynamic user) {
    if (user == null) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Text(
            user.name,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            user.email,
            style: const TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              _roleLabel(user.role),
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
              ),
            ),
          ),
          if (user.companyName != null) ...[
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.business,
                  size: 15,
                  color: AppColors.textSecondary,
                ),
                const SizedBox(width: 4),
                Text(
                  user.companyName!,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildNameEditSection() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.edit, size: 18, color: AppColors.primary),
              const SizedBox(width: 8),
              const Text(
                'Edit Name',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 16,
                  color: AppColors.textPrimary,
                ),
              ),
              const Spacer(),
              if (!_editingName)
                TextButton(
                  onPressed: () => setState(() => _editingName = true),
                  child: const Text('Edit'),
                ),
            ],
          ),
          if (_editingName) ...[
            const SizedBox(height: 12),
            TextField(
              controller: _nameCtrl,
              decoration: const InputDecoration(
                labelText: 'Full Name',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () {
                    final user = context.read<AuthProvider>().user;
                    _nameCtrl.text = user?.name ?? '';
                    setState(() => _editingName = false);
                  },
                  child: const Text('Cancel'),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: _savingName ? null : _saveName,
                  child: _savingName
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.white,
                          ),
                        )
                      : const Text('Save'),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPasswordSection() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.lock_outline, size: 18, color: AppColors.primary),
              SizedBox(width: 8),
              Text(
                'Change Password',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 16,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _currentPwCtrl,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Current Password',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _newPwCtrl,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'New Password',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _confirmPwCtrl,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Confirm New Password',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _changingPassword ? null : _changePassword,
              child: _changingPassword
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.white,
                      ),
                    )
                  : const Text('Update Password'),
            ),
          ),
        ],
      ),
    );
  }
}
