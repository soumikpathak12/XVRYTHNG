import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/pin_security_provider.dart';

class PinSetupScreen extends StatefulWidget {
  const PinSetupScreen({super.key});

  @override
  State<PinSetupScreen> createState() => _PinSetupScreenState();
}

class _PinSetupScreenState extends State<PinSetupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _pinCtrl = TextEditingController();
  final _confirmPinCtrl = TextEditingController();
  final _answerCtrl = TextEditingController();
  bool _submitting = false;
  String _selectedQuestion = _questions.first;

  static const List<String> _questions = [
    'What is your mother\'s maiden name?',
    'What was the name of your first pet?',
    'What is your favorite teacher\'s name?',
    'What city were you born in?',
    'What is your favorite food?',
  ];

  @override
  void dispose() {
    _pinCtrl.dispose();
    _confirmPinCtrl.dispose();
    _answerCtrl.dispose();
    super.dispose();
  }

  String? _pinValidator(String? value) {
    final v = value?.trim() ?? '';
    if (!RegExp(r'^\d{6}$').hasMatch(v)) {
      return 'PIN must be exactly 6 digits';
    }
    return null;
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    final pinProvider = context.read<PinSecurityProvider>();
    await pinProvider.setupPin(
      pin: _pinCtrl.text.trim(),
      securityQuestion: _selectedQuestion,
      securityAnswer: _answerCtrl.text.trim(),
    );
    if (!mounted) return;
    setState(() => _submitting = false);
    context.go('/');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Set up security PIN')),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 460),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Form(
                key: _formKey,
                child: ListView(
                  children: [
                    const Text(
                      'Create a 6-digit PIN and choose a security question for account recovery.',
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _pinCtrl,
                      decoration: const InputDecoration(
                        labelText: '6-digit PIN',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                      obscureText: true,
                      maxLength: 6,
                      validator: _pinValidator,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _confirmPinCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Confirm PIN',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                      obscureText: true,
                      maxLength: 6,
                      validator: (v) {
                        final pinErr = _pinValidator(v);
                        if (pinErr != null) return pinErr;
                        if (v!.trim() != _pinCtrl.text.trim()) {
                          return 'PIN confirmation does not match';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: _selectedQuestion,
                      decoration: const InputDecoration(
                        labelText: 'Security question',
                        border: OutlineInputBorder(),
                      ),
                      items: _questions
                          .map((q) => DropdownMenuItem(value: q, child: Text(q)))
                          .toList(),
                      onChanged: (v) {
                        if (v == null) return;
                        setState(() => _selectedQuestion = v);
                      },
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _answerCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Security answer',
                        border: OutlineInputBorder(),
                      ),
                      validator: (v) {
                        if ((v?.trim().length ?? 0) < 2) {
                          return 'Please enter your answer';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 18),
                    SizedBox(
                      height: 50,
                      child: ElevatedButton(
                        onPressed: _submitting ? null : _save,
                        child: _submitting
                            ? const CircularProgressIndicator()
                            : const Text('Save security setup'),
                      ),
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
