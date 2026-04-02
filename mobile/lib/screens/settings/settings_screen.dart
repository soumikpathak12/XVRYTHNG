import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/theme/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/common/shell_scaffold_scope.dart';
import 'module_management_screen.dart';
import 'workflow_config_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _pushNotifications = true;
  bool _emailNotifications = true;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final shellLeading = ShellScaffoldScope.navigationLeading(context);

    return Scaffold(
      appBar: AppBar(
        leading: shellLeading,
        automaticallyImplyLeading: shellLeading == null,
        title: const Text('Settings'),
        actions: ShellScaffoldScope.notificationActions(),
      ),
      body: ListView(
        children: [
          const SizedBox(height: 8),

          _SectionHeader(title: 'Profile'),
          ListTile(
            leading:
                const Icon(Icons.person_outline, color: AppColors.primary),
            title: const Text('My Profile'),
            subtitle: Text(user?.email ?? ''),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/profile'),
          ),
          const Divider(height: 1, indent: 16, endIndent: 16),

          _SectionHeader(title: 'Security'),
          ListTile(
            leading:
                const Icon(Icons.lock_outline, color: AppColors.primary),
            title: const Text('Change Password'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _showChangePasswordDialog(context, auth),
          ),
          const Divider(height: 1, indent: 16, endIndent: 16),

          _SectionHeader(title: 'Notifications'),
          SwitchListTile(
            secondary: const Icon(Icons.notifications_outlined,
                color: AppColors.primary),
            title: const Text('Push Notifications'),
            subtitle: const Text('Receive push notifications'),
            value: _pushNotifications,
            activeThumbColor: AppColors.primary,
            onChanged: (v) => setState(() => _pushNotifications = v),
          ),
          SwitchListTile(
            secondary:
                const Icon(Icons.email_outlined, color: AppColors.primary),
            title: const Text('Email Notifications'),
            subtitle: const Text('Receive email updates'),
            value: _emailNotifications,
            activeThumbColor: AppColors.primary,
            onChanged: (v) => setState(() => _emailNotifications = v),
          ),
          const Divider(height: 1, indent: 16, endIndent: 16),

          _SectionHeader(title: 'Company Settings'),
          ListTile(
            leading: const Icon(Icons.extension_outlined,
                color: AppColors.primary),
            title: const Text('Module Management'),
            subtitle: const Text('Toggle features on/off'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => const ModuleManagementScreen(),
              ),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.account_tree_outlined,
                color: AppColors.primary),
            title: const Text('Workflow Configuration'),
            subtitle: const Text('Edit pipeline stages'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => const WorkflowConfigScreen(),
              ),
            ),
          ),
          const Divider(height: 1, indent: 16, endIndent: 16),

          _SectionHeader(title: 'About'),
          ListTile(
            leading: const Icon(Icons.info_outline, color: AppColors.primary),
            title: const Text('App Version'),
            subtitle: const Text('1.0.0'),
          ),
          ListTile(
            leading: const Icon(Icons.description_outlined,
                color: AppColors.primary),
            title: const Text('Terms of Service'),
            trailing: const Icon(Icons.open_in_new, size: 18),
            onTap: () => _launchUrl('https://xvrythng.com/terms'),
          ),
          ListTile(
            leading: const Icon(Icons.privacy_tip_outlined,
                color: AppColors.primary),
            title: const Text('Privacy Policy'),
            trailing: const Icon(Icons.open_in_new, size: 18),
            onTap: () => _launchUrl('https://xvrythng.com/privacy'),
          ),
          const Divider(height: 1, indent: 16, endIndent: 16),

          _SectionHeader(title: 'Danger Zone'),
          ListTile(
            leading: const Icon(Icons.delete_forever,
                color: AppColors.danger),
            title: const Text('Delete Account',
                style: TextStyle(color: AppColors.danger)),
            subtitle: const Text('Permanently delete your account'),
            trailing: const Icon(Icons.chevron_right,
                color: AppColors.danger),
            onTap: () => _confirmDeleteAccount(context, auth),
          ),
          const Divider(height: 1, indent: 16, endIndent: 16),

          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: OutlinedButton.icon(
              onPressed: () => _confirmLogout(context, auth),
              icon: const Icon(Icons.logout, color: AppColors.danger),
              label: const Text('Sign Out'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.danger,
                side: const BorderSide(color: AppColors.danger),
                minimumSize: const Size(double.infinity, 50),
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _showChangePasswordDialog(BuildContext context, AuthProvider auth) {
    final formKey = GlobalKey<FormState>();
    final currentCtrl = TextEditingController();
    final newCtrl = TextEditingController();
    final confirmCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Change Password'),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: currentCtrl,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Current Password',
                  border: OutlineInputBorder(),
                ),
                validator: (v) =>
                    (v == null || v.isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: newCtrl,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'New Password',
                  border: OutlineInputBorder(),
                ),
                validator: (v) {
                  if (v == null || v.isEmpty) return 'Required';
                  if (v.length < 8) return 'Min 8 characters';
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: confirmCtrl,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Confirm New Password',
                  border: OutlineInputBorder(),
                ),
                validator: (v) {
                  if (v != newCtrl.text) return 'Passwords don\'t match';
                  return null;
                },
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              if (!formKey.currentState!.validate()) return;
              try {
                await auth.changePassword(
                    currentCtrl.text, newCtrl.text);
                if (ctx.mounted) Navigator.pop(ctx);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                        content: Text('Password changed successfully')),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error: $e')),
                  );
                }
              }
            },
            child: const Text('Change'),
          ),
        ],
      ),
    );
  }

  void _confirmLogout(BuildContext context, AuthProvider auth) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
                backgroundColor: AppColors.danger),
            onPressed: () async {
              Navigator.pop(ctx);
              await auth.logout();
              if (context.mounted) context.go('/login');
            },
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteAccount(BuildContext context, AuthProvider auth) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.warning_rounded, color: AppColors.danger),
            SizedBox(width: 8),
            Text('Delete Account'),
          ],
        ),
        content: const Text(
          'This action is PERMANENT. Your credentials will be invalidated and you will need to contact an admin to re-register.\n\nAre you absolutely sure?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
                backgroundColor: AppColors.danger),
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await auth.logout();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Account deletion requested')),
                  );
                  context.go('/login');
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Failed: $e')),
                  );
                }
              }
            },
            child: const Text('Delete My Account'),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 6),
      child: Text(
        title.toUpperCase(),
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: AppColors.textSecondary,
          letterSpacing: 1.0,
        ),
      ),
    );
  }
}
