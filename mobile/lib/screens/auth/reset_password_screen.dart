 import 'package:flutter/material.dart';
import '../../services/auth_service.dart';

class ResetPasswordScreen extends StatefulWidget {
  /// You can pass a token via Navigator arguments.
  const ResetPasswordScreen({super.key, this.initialToken});
  final String? initialToken;

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _token = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  final _auth = AuthService();

  bool _loading = false;
  bool _obscure1 = true;
  bool _obscure2 = true;
  String? _error;
  String? _success;
  bool? _tokenValid; // null = unknown, true/false after check

  @override
  void initState() {
    super.initState();
    if (widget.initialToken != null && widget.initialToken!.isNotEmpty) {
      _token.text = widget.initialToken!;
      _validateToken();
    }
  }

  @override
  void dispose() {
    _token.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _validateToken() async {
    setState(() {
      _tokenValid = null;
      _error = null;
      _success = null;
    });
    final t = _token.text.trim();
    if (t.isEmpty) return;
    final valid = await _auth.validateResetToken(t);
    setState(() => _tokenValid = valid);
    if (!valid) {
      setState(() => _error = 'Invalid or expired reset token.');
    }
  }

  // Match server-side constraints (server enforces length >= 8 and more)
  // We mirror a basic check here; backend remains source of truth.
  String? _validatePasswordLocal(String? v) {
    final s = (v ?? '').trim();
    if (s.length < 8) return 'Password must be at least 8 characters long';
    return null;
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _loading = true;
      _error = null;
      _success = null;
    });

    try {
      await _auth.resetPassword(
        token: _token.text.trim(),
        newPassword: _password.text,
      );

      setState(() {
        _success = 'Password has been reset. You can sign in now.';
      });

      // Redirect back to login after a short delay
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) return;
      Navigator.of(context).pushNamedAndRemoveUntil('/login', (_) => false);
    } on AuthException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Unable to reset password. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is String && args.isNotEmpty && _token.text.isEmpty) {
      _token.text = args;
      // If pushed with token after build, validate async
      WidgetsBinding.instance.addPostFrameCallback((_) => _validateToken());
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Reset password')),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Form(
                key: _formKey,
                child: ListView(
                  shrinkWrap: true,
                  children: [
                    const SizedBox(height: 12),

                    if (_error != null) _Banner.error(_error!),
                    if (_success != null) _Banner.success(_success!),

                    TextFormField(
                      controller: _token,
                      decoration: InputDecoration(
                        labelText: 'Reset token',
                        prefixIcon: const Icon(Icons.vpn_key_outlined),
                        suffixIcon: IconButton(
                          onPressed: _validateToken,
                          icon: const Icon(Icons.check_circle_outline),
                          tooltip: 'Validate token',
                        ),
                      ),
                      validator: (v) {
                        if ((v ?? '').trim().isEmpty) {
                          return 'Reset token is required';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    if (_tokenValid == false)
                      Text(
                        'Invalid or expired reset token.',
                        style: TextStyle(
                          color: theme.colorScheme.error,
                          fontWeight: FontWeight.w600,
                        ),
                      ),

                    const SizedBox(height: 12),

                    TextFormField(
                      controller: _password,
                      decoration: InputDecoration(
                        labelText: 'New password',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          onPressed: () => setState(() => _obscure1 = !_obscure1),
                          icon: Icon(_obscure1
                              ? Icons.visibility_off_outlined
                              : Icons.visibility_outlined),
                        ),
                      ),
                      obscureText: _obscure1,
                      validator: _validatePasswordLocal,
                    ),
                    const SizedBox(height: 12),

                    TextFormField(
                      controller: _confirm,
                      decoration: InputDecoration(
                        labelText: 'Confirm password',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          onPressed: () => setState(() => _obscure2 = !_obscure2),
                          icon: Icon(_obscure2
                              ? Icons.visibility_off_outlined
                              : Icons.visibility_outlined),
                        ),
                      ),
                      obscureText: _obscure2,
                      validator: (v) {
                        final msg = _validatePasswordLocal(v);
                        if (msg != null) return msg;
                        if (v != _password.text) return 'Passwords do not match';
                        return null;
                      },
                    ),
                    const SizedBox(height: 18),

                    FilledButton(
                      onPressed: _loading ? null : _submit,
                      child: _loading
                          ? const SizedBox(
                              height: 20, width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Reset password'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Banner extends StatelessWidget {
  final String message;
  final Color bg;
  final Color fg;
  const _Banner._(this.message, this.bg, this.fg);

  factory _Banner.error(String msg) => _Banner._(
        msg,
        const Color(0xFFFFE6E6),
        const Color(0xFF8B0000),
      );

  factory _Banner.success(String msg) => _Banner._(
        msg,
        const Color(0xFFE6FFEF),
        const Color(0xFF0A7A2C),
      );

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(message, style: TextStyle(color: fg)),
    );
  }
}