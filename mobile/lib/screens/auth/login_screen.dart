import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../core/storage/secure_storage.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _pin = TextEditingController();

  bool _rememberMe = true;
  bool _obscure = true;
  bool _submitting = false;
  /// After sign out, last user on this device: show PIN-only until "another account".
  bool _quickPinMode = false;
  DeviceLastAccount? _device;

  @override
  void initState() {
    super.initState();
    _loadDeviceAndHints();
  }

  Future<void> _loadDeviceAndHints() async {
    final remembered = await SecureStore.readRemember();
    final lastEmail = await SecureStore.readLastEmail();
    final device = await SecureStore.readDeviceLastAccount();
    if (!mounted) return;
    setState(() {
      _device = device;
      _quickPinMode = device != null;
      _rememberMe = remembered || _rememberMe;
      if (lastEmail != null && lastEmail.trim().isNotEmpty) {
        _email.text = lastEmail.trim();
      }
    });
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _pin.dispose();
    super.dispose();
  }

  /// Show email/password; keep last account so user can return to quick PIN.
  void _useEmailAndPassword() {
    final d = _device;
    setState(() {
      _quickPinMode = false;
      _pin.clear();
      if (d != null) {
        _email.text = d.email;
      }
    });
    context.read<AuthProvider>().clearError();
  }

  /// Sign in as a different person — clear saved account on this device.
  Future<void> _useAnotherAccount() async {
    await SecureStore.clearDeviceLastAccount();
    if (!mounted) return;
    setState(() {
      _device = null;
      _quickPinMode = false;
      _pin.clear();
    });
    context.read<AuthProvider>().clearError();
  }

  Future<void> _submitPassword() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    final auth = context.read<AuthProvider>();
    await SecureStore.saveLastEmail(_email.text.trim());
    await auth.login(
      _email.text.trim(),
      _password.text,
      rememberMe: _rememberMe,
    );
    if (!mounted) return;
    setState(() => _submitting = false);
    if (auth.isAuthenticated) {
      context.go(auth.getDefaultRoute());
    }
  }

  Future<void> _submitQuickPin() async {
    if (!_formKey.currentState!.validate()) return;
    final d = _device;
    if (d == null) return;
    setState(() => _submitting = true);
    final auth = context.read<AuthProvider>();
    final companyId = d.companyId ?? await SecureStore.readSelectedCompanyId();
    await auth.loginWithPin(
      d.email,
      _pin.text.trim(),
      companyId: companyId,
      rememberMe: _rememberMe,
    );
    if (!mounted) return;
    setState(() => _submitting = false);
    if (auth.isAuthenticated) {
      context.go(auth.getDefaultRoute());
      return;
    }
    final err = auth.error?.toLowerCase() ?? '';
    if (err.contains('not set up') || err.contains('password first')) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Use your email and password, then set up a PIN in the app.'),
            behavior: SnackBarBehavior.floating,
          ),
        );
        _useEmailAndPassword();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final auth = context.watch<AuthProvider>();
    final device = _device;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 28, vertical: 20),
              child: Form(
                key: _formKey,
                child: ListView(
                  shrinkWrap: true,
                  children: [
                    const SizedBox(height: 24),
                    Center(
                      child: Container(
                        width: 88,
                        height: 88,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.08),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                          color: theme.colorScheme.surface,
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: Image.asset(
                          'assets/icon/app_icon.jpeg',
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Icon(
                            Icons.broken_image_outlined,
                            color: theme.colorScheme.outline,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'XVRYTHNG',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.2,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Solar CRM & Project Management',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: Colors.grey[700],
                      ),
                    ),
                    const SizedBox(height: 24),
                    if (auth.error != null)
                      Container(
                        padding: const EdgeInsets.all(14),
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.error_outline,
                                color: Colors.red.shade700),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                auth.error!,
                                style: TextStyle(
                                  color: Colors.red.shade700,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    if (_quickPinMode && device != null) ...[
                      Text(
                        'Welcome back',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        device.name.isNotEmpty ? device.name : 'User',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.titleMedium,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        device.email,
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Colors.grey[600],
                        ),
                      ),
                      const SizedBox(height: 20),
                      TextFormField(
                        controller: _pin,
                        decoration: const InputDecoration(
                          labelText: '6-digit PIN',
                          prefixIcon: Icon(Icons.dialpad_outlined),
                          border: OutlineInputBorder(),
                          counterText: '',
                        ),
                        keyboardType: TextInputType.number,
                        maxLength: 6,
                        obscureText: true,
                        autofillHints: const [AutofillHints.newPassword],
                        validator: (v) {
                          final t = v?.trim() ?? '';
                          if (!RegExp(r'^\d{6}$').hasMatch(t)) {
                            return 'Enter your 6-digit PIN';
                          }
                          return null;
                        },
                        onChanged: (v) {
                          final d = v.replaceAll(RegExp(r'[^0-9]'), '');
                          if (d != v) {
                            _pin.value = TextEditingValue(
                              text: d,
                              selection: TextSelection.collapsed(
                                offset: d.length.clamp(0, 6),
                              ),
                            );
                          }
                        },
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Checkbox(
                            value: _rememberMe,
                            onChanged: _submitting
                                ? null
                                : (v) => setState(
                                    () => _rememberMe = v ?? true,
                                  ),
                          ),
                          const Expanded(
                            child: Text('Keep me signed in'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      TextButton(
                        onPressed: _submitting ? null : _useEmailAndPassword,
                        child: const Text('Use email and password'),
                      ),
                      TextButton(
                        onPressed: _submitting ? null : _useAnotherAccount,
                        child: const Text('Log in with another account'),
                      ),
                    ] else ...[
                      TextFormField(
                        controller: _email,
                        decoration: const InputDecoration(
                          labelText: 'Email',
                          prefixIcon: Icon(Icons.email_outlined),
                          border: OutlineInputBorder(),
                        ),
                        keyboardType: TextInputType.emailAddress,
                        validator: (v) {
                          v = v?.trim() ?? '';
                          if (v.isEmpty) return 'Please enter your email';
                          if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
                              .hasMatch(v)) {
                            return 'Please enter a valid email';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _password,
                        decoration: InputDecoration(
                          labelText: 'Password',
                          border: const OutlineInputBorder(),
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(
                            onPressed: () =>
                                setState(() => _obscure = !_obscure),
                            icon: Icon(
                              _obscure
                                  ? Icons.visibility_off_outlined
                                  : Icons.visibility_outlined,
                            ),
                          ),
                        ),
                        obscureText: _obscure,
                        validator: (v) => (v == null || v.isEmpty)
                            ? 'Please enter your password'
                            : null,
                      ),
                      if (device != null) ...[
                        const SizedBox(height: 8),
                        TextButton(
                          onPressed: _submitting
                              ? null
                              : () {
                                  setState(() {
                                    _quickPinMode = true;
                                    _pin.clear();
                                    auth.clearError();
                                  });
                                },
                          child: const Text('Back to PIN sign-in'),
                        ),
                      ],
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Checkbox(
                            value: _rememberMe,
                            onChanged: _submitting
                                ? null
                                : (v) => setState(
                                    () => _rememberMe = v ?? false,
                                  ),
                          ),
                          const Text('Remember me'),
                          const Spacer(),
                          TextButton(
                            onPressed: _submitting
                                ? null
                                : () => context.push('/forgot-password'),
                            child: const Text('Forgot password?'),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 54,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(30),
                          ),
                          backgroundColor: theme.colorScheme.primary,
                        ),
                        onPressed: _submitting
                            ? null
                            : (_quickPinMode && device != null)
                                ? _submitQuickPin
                                : _submitPassword,
                        child: _submitting
                            ? const SizedBox(
                                height: 22,
                                width: 22,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : Text(
                                (_quickPinMode && device != null)
                                    ? 'Continue'
                                    : 'Sign in',
                                style: const TextStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(height: 30),
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
