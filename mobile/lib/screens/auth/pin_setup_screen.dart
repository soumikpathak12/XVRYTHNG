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
  final _customQuestionCtrl = TextEditingController();
  bool _submitting = false;
  String _selectedQuestion = _questions.first;
  static const String _otherQuestionOption = 'Others (create my own question)';

  static const List<String> _questions = [
    'What is your mother\'s maiden name?',
    'What was the name of your first pet?',
    'What is your favorite teacher\'s name?',
    'What city were you born in?',
    'What is your favorite food?',
    'What was your first school name?',
    'What is your childhood nickname?',
    'What is the name of your best friend in childhood?',
    _otherQuestionOption,
  ];

  bool get _isOtherQuestion => _selectedQuestion == _otherQuestionOption;

  String get _resolvedSecurityQuestion {
    if (_isOtherQuestion) return _customQuestionCtrl.text.trim();
    return _selectedQuestion;
  }

  Future<void> _pickSecurityQuestion() async {
    final picked = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (ctx) {
        return SafeArea(
          child: SizedBox(
            height: 420,
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 16),
              itemCount: _questions.length,
              separatorBuilder: (_, __) => const SizedBox(height: 6),
              itemBuilder: (_, i) {
                final q = _questions[i];
                final selected = q == _selectedQuestion;
                return ListTile(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  tileColor: selected ? const Color(0xFFE6F4F1) : null,
                  title: Text(q),
                  trailing: selected
                      ? const Icon(Icons.check, color: Color(0xFF146B6B))
                      : null,
                  onTap: () => Navigator.of(ctx).pop(q),
                );
              },
            ),
          ),
        );
      },
    );

    if (!mounted || picked == null) return;
    setState(() {
      _selectedQuestion = picked;
      if (!_isOtherQuestion) _customQuestionCtrl.clear();
    });
  }

  @override
  void dispose() {
    _pinCtrl.dispose();
    _confirmPinCtrl.dispose();
    _answerCtrl.dispose();
    _customQuestionCtrl.dispose();
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
      securityQuestion: _resolvedSecurityQuestion,
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
                    InkWell(
                      onTap: _pickSecurityQuestion,
                      borderRadius: BorderRadius.circular(4),
                      child: InputDecorator(
                        decoration: const InputDecoration(
                          labelText: 'Security question',
                          border: OutlineInputBorder(),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                _selectedQuestion,
                                style: const TextStyle(fontSize: 16),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Icon(Icons.arrow_drop_down),
                          ],
                        ),
                      ),
                    ),
                    if (_isOtherQuestion) ...[
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _customQuestionCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Your security question',
                          hintText: 'Example: What was the first concert I attended?',
                          border: OutlineInputBorder(),
                        ),
                        textCapitalization: TextCapitalization.sentences,
                        validator: (v) {
                          final q = (v ?? '').trim();
                          if (q.length < 8) {
                            return 'Please enter a clear custom question';
                          }
                          return null;
                        },
                      ),
                    ],
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
