import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../providers/pin_security_provider.dart';
import '../../services/pin_security_service.dart';

enum _PinLockPhase {
  unlock,
  resetAnswer,
  resetEmailIntro,
  resetEmailCode,
  resetNewPin,
  resetConfirm,
}

class PinLockScreen extends StatefulWidget {
  const PinLockScreen({super.key});

  @override
  State<PinLockScreen> createState() => _PinLockScreenState();
}

class _PinLockScreenState extends State<PinLockScreen> {
  _PinLockPhase _phase = _PinLockPhase.unlock;

  final _unlockCtrl = TextEditingController();
  final _unlockFocus = FocusNode();

  final _newPinCtrl = TextEditingController();
  final _newPinFocus = FocusNode();

  final _confirmPinCtrl = TextEditingController();
  final _confirmPinFocus = FocusNode();

  final _answerCtrl = TextEditingController();
  final _answerFocus = FocusNode();

  final _recoveryCodeCtrl = TextEditingController();
  final _recoveryCodeFocus = FocusNode();

  bool _busy = false;
  String? _error;
  String? _cachedSecurityAnswer;
  String? _cachedRecoveryCode;
  String? _stagedNewPin;
  bool _useEmailRecovery = false;

  static const double _slotLineHeight = 3;
  static const double _dotSize = 12;

  static OutlineInputBorder _pillFieldBorder({Color? border}) {
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(28),
      borderSide: border == null
          ? BorderSide.none
          : BorderSide(color: border, width: 1.5),
    );
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (_phase == _PinLockPhase.unlock) _unlockFocus.requestFocus();
    });
  }

  @override
  void dispose() {
    _unlockCtrl.dispose();
    _unlockFocus.dispose();
    _newPinCtrl.dispose();
    _newPinFocus.dispose();
    _confirmPinCtrl.dispose();
    _confirmPinFocus.dispose();
    _answerCtrl.dispose();
    _answerFocus.dispose();
    _recoveryCodeCtrl.dispose();
    _recoveryCodeFocus.dispose();
    super.dispose();
  }

  void _requestFocusForPhase() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (_phase == _PinLockPhase.unlock) {
        _unlockFocus.requestFocus();
      } else if (_phase == _PinLockPhase.resetAnswer) {
        _answerFocus.requestFocus();
      } else if (_phase == _PinLockPhase.resetEmailCode) {
        _recoveryCodeFocus.requestFocus();
      } else if (_phase == _PinLockPhase.resetNewPin) {
        _newPinFocus.requestFocus();
      } else if (_phase == _PinLockPhase.resetConfirm) {
        _confirmPinFocus.requestFocus();
      }
    });
  }

  void _normalizeDigits(
    TextEditingController c,
    String raw, {
    int maxLen = 6,
  }) {
    final digits = raw.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits != raw) {
      c.value = TextEditingValue(
        text: digits,
        selection: TextSelection.collapsed(offset: digits.length.clamp(0, maxLen)),
      );
      return;
    }
    if (digits.length > maxLen) {
      c.text = digits.substring(0, maxLen);
      c.selection = TextSelection.collapsed(offset: maxLen);
    }
  }

  void _onUnlockChanged(String raw) {
    if (_phase != _PinLockPhase.unlock) return;
    _normalizeDigits(_unlockCtrl, raw);
    setState(() {});
    if (_unlockCtrl.text.length == 6 && !_busy) _unlock();
  }

  void _onNewPinChanged(String raw) {
    if (_phase != _PinLockPhase.resetNewPin) return;
    _normalizeDigits(_newPinCtrl, raw);
    setState(() {});
    if (_newPinCtrl.text.length == 6 && !_busy) _afterNewPinEntered();
  }

  void _onConfirmPinChanged(String raw) {
    if (_phase != _PinLockPhase.resetConfirm) return;
    _normalizeDigits(_confirmPinCtrl, raw);
    setState(() {});
    if (_confirmPinCtrl.text.length == 6 && !_busy) _afterConfirmPinEntered();
  }

  void _onRecoveryCodeChanged(String raw) {
    if (_phase != _PinLockPhase.resetEmailCode) return;
    _normalizeDigits(_recoveryCodeCtrl, raw);
    setState(() {});
    if (_recoveryCodeCtrl.text.length == 6 && !_busy) {
      _verifyRecoveryCodeAndContinue();
    }
  }

  Future<void> _verifyRecoveryCodeAndContinue() async {
    if (_busy) return;
    final code = _recoveryCodeCtrl.text.trim();
    if (code.length != 6) return;

    setState(() {
      _busy = true;
      _error = null;
    });
    final EmailRecoveryVerifyResult result = await context
        .read<PinSecurityProvider>()
        .verifyEmailRecoveryCode(code);
    if (!mounted) return;
    setState(() => _busy = false);

    if (!result.valid) {
      _recoveryCodeCtrl.clear();
      final r = result.reason ?? '';
      if (r == 'locked') {
        setState(() => _error = 'Too many wrong attempts. Request a new code.');
      } else if (r == 'expired') {
        setState(() => _error = 'Code expired. Go back and request a new one.');
      } else {
        setState(() => _error = 'Incorrect code.');
      }
      _recoveryCodeFocus.requestFocus();
      return;
    }

    _cachedRecoveryCode = code;
    _recoveryCodeCtrl.clear();
    setState(() {
      _phase = _PinLockPhase.resetNewPin;
      _error = null;
    });
    _requestFocusForPhase();
  }

  Future<void> _sendRecoveryEmail() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await context.read<PinSecurityProvider>().requestEmailRecovery();
      if (!mounted) return;
      setState(() {
        _busy = false;
        _phase = _PinLockPhase.resetEmailCode;
      });
      _requestFocusForPhase();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = e.toString().replaceAll('ApiException', '').trim();
        if (_error!.isEmpty) _error = 'Could not send email.';
      });
    }
  }

  void _openForgotAnswerPath() {
    setState(() {
      _useEmailRecovery = true;
      _error = null;
      _cachedRecoveryCode = null;
      _recoveryCodeCtrl.clear();
      _newPinCtrl.clear();
      _confirmPinCtrl.clear();
      _stagedNewPin = null;
      _phase = _PinLockPhase.resetEmailIntro;
    });
    FocusManager.instance.primaryFocus?.unfocus();
  }

  Future<void> _unlock() async {
    if (_busy) return;
    final pin = _unlockCtrl.text.trim();
    if (pin.length != 6) return;

    setState(() {
      _busy = true;
      _error = null;
    });
    final ok = await context.read<PinSecurityProvider>().verifyPin(pin);
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) {
      context.go('/');
      return;
    }
    _unlockCtrl.clear();
    setState(() => _error = 'Incorrect PIN.');
    _unlockFocus.requestFocus();
  }

  void _afterNewPinEntered() {
    _stagedNewPin = _newPinCtrl.text.trim();
    _newPinCtrl.clear();
    setState(() {
      _phase = _PinLockPhase.resetConfirm;
      _error = null;
    });
    _requestFocusForPhase();
  }

  Future<void> _afterConfirmPinEntered() async {
    final confirm = _confirmPinCtrl.text.trim();
    final staged = _stagedNewPin;
    if (staged == null) return;

    if (confirm != staged) {
      _confirmPinCtrl.clear();
      setState(() => _error = 'PIN does not match. Try again.');
      _confirmPinFocus.requestFocus();
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });

    bool ok;
    if (_useEmailRecovery) {
      final code = _cachedRecoveryCode;
      if (code == null || code.length != 6) {
        if (!mounted) return;
        setState(() {
          _busy = false;
          _error = 'Security code missing. Start again from email.';
        });
        return;
      }
      ok = await context.read<PinSecurityProvider>().resetWithEmailRecovery(
            recoveryCode: code,
            newPin: staged,
          );
    } else {
      final answer = _cachedSecurityAnswer;
      if (answer == null) {
        if (!mounted) return;
        setState(() => _busy = false);
        return;
      }
      ok = await context.read<PinSecurityProvider>().resetPinWithSecurityAnswer(
            answer: answer,
            newPin: staged,
          );
    }

    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) {
      context.go('/');
      return;
    }
    _confirmPinCtrl.clear();
    setState(() => _error = 'Could not reset PIN. Try again.');
  }

  Future<void> _submitSecurityAnswer() async {
    final text = _answerCtrl.text.trim();
    if (text.length < 2) {
      setState(() => _error = 'Please enter your answer.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    final ok =
        await context.read<PinSecurityProvider>().verifySecurityAnswer(text);
    if (!mounted) return;
    setState(() => _busy = false);
    if (!ok) {
      setState(() => _error = 'Incorrect answer.');
      return;
    }
    _useEmailRecovery = false;
    _cachedSecurityAnswer = text;
    _answerCtrl.clear();
    setState(() {
      _phase = _PinLockPhase.resetNewPin;
      _error = null;
    });
    _requestFocusForPhase();
  }

  void _goBackWithinReset() {
    setState(() {
      _error = null;
      if (_phase == _PinLockPhase.resetConfirm) {
        _confirmPinCtrl.clear();
        _stagedNewPin = null;
        _newPinCtrl.clear();
        _phase = _PinLockPhase.resetNewPin;
      } else if (_phase == _PinLockPhase.resetNewPin) {
        _newPinCtrl.clear();
        _stagedNewPin = null;
        if (_useEmailRecovery) {
          _phase = _PinLockPhase.resetEmailCode;
        } else {
          _cachedSecurityAnswer = null;
          _answerCtrl.clear();
          _phase = _PinLockPhase.resetAnswer;
        }
      } else if (_phase == _PinLockPhase.resetEmailCode) {
        _recoveryCodeCtrl.clear();
        _cachedRecoveryCode = null;
        _phase = _PinLockPhase.resetEmailIntro;
      } else if (_phase == _PinLockPhase.resetEmailIntro) {
        _useEmailRecovery = false;
        _phase = _PinLockPhase.resetAnswer;
      } else if (_phase == _PinLockPhase.resetAnswer) {
        _answerCtrl.clear();
        _cachedSecurityAnswer = null;
        _useEmailRecovery = false;
        _cachedRecoveryCode = null;
        _recoveryCodeCtrl.clear();
        _phase = _PinLockPhase.unlock;
      }
    });
    _requestFocusForPhase();
  }

  void _openForgotPin() {
    _unlockCtrl.clear();
    setState(() {
      _phase = _PinLockPhase.resetAnswer;
      _error = null;
      _cachedSecurityAnswer = null;
      _cachedRecoveryCode = null;
      _useEmailRecovery = false;
      _stagedNewPin = null;
      _newPinCtrl.clear();
      _confirmPinCtrl.clear();
      _recoveryCodeCtrl.clear();
    });
    FocusManager.instance.primaryFocus?.unfocus();
    _requestFocusForPhase();
  }

  Widget _buildSixSlots({
    required TextEditingController controller,
    required FocusNode focusNode,
    required ValueChanged<String> onChanged,
  }) {
    final len = controller.text.length;
    final activeIndex = len.clamp(0, 5);

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => focusNode.requestFocus(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: List.generate(6, (i) {
              final filled = i < len;
              final active = i == activeIndex && len < 6;
              final lineColor = filled
                  ? AppColors.primary
                  : (active
                      ? const Color(0xFF1976D2)
                      : AppColors.divider);
              return Expanded(
                child: Padding(
                  padding: EdgeInsets.only(right: i < 5 ? 12 : 0),
                  child: Column(
                    children: [
                      SizedBox(
                        height: 28,
                        child: Center(
                          child: filled
                              ? Container(
                                  width: _dotSize,
                                  height: _dotSize,
                                  decoration: const BoxDecoration(
                                    color: AppColors.primary,
                                    shape: BoxShape.circle,
                                  ),
                                )
                              : const SizedBox.shrink(),
                        ),
                      ),
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        height: _slotLineHeight,
                        decoration: BoxDecoration(
                          color: lineColor,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 8),
          Text(
            '$len/6',
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey.shade600,
            ),
          ),
          Offstage(
            offstage: true,
            child: TextField(
              controller: controller,
              focusNode: focusNode,
              keyboardType: TextInputType.number,
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(6),
              ],
              enableSuggestions: false,
              autocorrect: false,
              onChanged: onChanged,
            ),
          ),
        ],
      ),
    );
  }

  PreferredSizeWidget _appBarForPhase() {
    String title;
    switch (_phase) {
      case _PinLockPhase.unlock:
        title = 'Enter security PIN';
        break;
      case _PinLockPhase.resetAnswer:
        title = 'Reset PIN';
        break;
      case _PinLockPhase.resetEmailIntro:
        title = 'Email recovery';
        break;
      case _PinLockPhase.resetEmailCode:
        title = 'Enter code';
        break;
      case _PinLockPhase.resetNewPin:
        title = 'New PIN';
        break;
      case _PinLockPhase.resetConfirm:
        title = 'Confirm new PIN';
        break;
    }
    final showBack = _phase != _PinLockPhase.unlock;
    return AppBar(
      backgroundColor: AppColors.primary,
      foregroundColor: AppColors.white,
      elevation: 0,
      centerTitle: true,
      leading: showBack
          ? IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: _busy ? null : _goBackWithinReset,
            )
          : null,
      title: Text(
        title,
        style: const TextStyle(fontWeight: FontWeight.w600),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pinProvider = context.watch<PinSecurityProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: _appBarForPhase(),
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 460),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
              child: ListView(
                children: [
                  if (_phase == _PinLockPhase.unlock) ...[
                    Text(
                      'Enter your 6-digit PIN to continue.',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade700,
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'Unlock code',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                    ),
                    const SizedBox(height: 24),
                    _buildSixSlots(
                      controller: _unlockCtrl,
                      focusNode: _unlockFocus,
                      onChanged: _onUnlockChanged,
                    ),
                    if (_busy) ...[
                      const SizedBox(height: 20),
                      const Center(
                        child: SizedBox(
                          width: 28,
                          height: 28,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      ),
                    ],
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _error!,
                        style: const TextStyle(
                          color: AppColors.danger,
                          fontSize: 14,
                        ),
                      ),
                    ],
                    const SizedBox(height: 20),
                    TextButton(
                      onPressed: _busy ? null : _openForgotPin,
                      style: TextButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        padding: EdgeInsets.zero,
                      ),
                      child: const Text('Forgot PIN?'),
                    ),
                  ],
                  if (_phase == _PinLockPhase.resetAnswer) ...[
                    Text(
                      pinProvider.securityQuestion ??
                          'Security question unavailable',
                      style: TextStyle(
                        fontSize: 15,
                        color: Colors.grey.shade800,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 20),
                    TextField(
                      controller: _answerCtrl,
                      focusNode: _answerFocus,
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: const Color(0xFFF2F4F4),
                        hintText: 'Security answer',
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 22,
                          vertical: 18,
                        ),
                        border: _pillFieldBorder(),
                        enabledBorder: _pillFieldBorder(),
                        focusedBorder: _pillFieldBorder(
                          border: AppColors.primary,
                        ),
                      ),
                      textCapitalization: TextCapitalization.sentences,
                      onSubmitted: (_) => _busy ? null : _submitSecurityAnswer(),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _error!,
                        style: const TextStyle(
                          color: AppColors.danger,
                          fontSize: 14,
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                    SizedBox(
                      height: 52,
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: _busy ? null : _submitSecurityAnswer,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.primary,
                          side: const BorderSide(color: AppColors.primary, width: 1.5),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(28),
                          ),
                        ),
                        child: _busy
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Text(
                                'Continue',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 16,
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Center(
                      child: TextButton(
                        onPressed: _busy ? null : _openForgotAnswerPath,
                        style: TextButton.styleFrom(
                          foregroundColor: AppColors.primary,
                        ),
                        child: const Text('Forgot answer?'),
                      ),
                    ),
                  ],
                  if (_phase == _PinLockPhase.resetEmailIntro) ...[
                    Text(
                      'We will email a 6-digit security code to the address on your account. It expires in 15 minutes.',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade800,
                        height: 1.4,
                      ),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _error!,
                        style: const TextStyle(
                          color: AppColors.danger,
                          fontSize: 14,
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                    SizedBox(
                      height: 52,
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: _busy ? null : _sendRecoveryEmail,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.primary,
                          side: const BorderSide(color: AppColors.primary, width: 1.5),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(28),
                          ),
                        ),
                        child: _busy
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Text(
                                'Send security code',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 16,
                                ),
                              ),
                      ),
                    ),
                  ],
                  if (_phase == _PinLockPhase.resetEmailCode) ...[
                    Text(
                      'Enter the 6-digit code from your email. It may take a minute to arrive.',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade700,
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'Security code',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                    ),
                    const SizedBox(height: 20),
                    _buildSixSlots(
                      controller: _recoveryCodeCtrl,
                      focusNode: _recoveryCodeFocus,
                      onChanged: _onRecoveryCodeChanged,
                    ),
                    if (_busy) ...[
                      const SizedBox(height: 20),
                      const Center(
                        child: SizedBox(
                          width: 28,
                          height: 28,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      ),
                    ],
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _error!,
                        style: const TextStyle(
                          color: AppColors.danger,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ],
                  if (_phase == _PinLockPhase.resetNewPin) ...[
                    Text(
                      'Choose a new 6-digit PIN.',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade700,
                      ),
                    ),
                    const SizedBox(height: 24),
                    _buildSixSlots(
                      controller: _newPinCtrl,
                      focusNode: _newPinFocus,
                      onChanged: _onNewPinChanged,
                    ),
                    if (_busy) ...[
                      const SizedBox(height: 20),
                      const Center(
                        child: SizedBox(
                          width: 28,
                          height: 28,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      ),
                    ],
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _error!,
                        style: const TextStyle(
                          color: AppColors.danger,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ],
                  if (_phase == _PinLockPhase.resetConfirm) ...[
                    Text(
                      'Enter the same PIN again to confirm.',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade700,
                      ),
                    ),
                    const SizedBox(height: 24),
                    _buildSixSlots(
                      controller: _confirmPinCtrl,
                      focusNode: _confirmPinFocus,
                      onChanged: _onConfirmPinChanged,
                    ),
                    if (_busy) ...[
                      const SizedBox(height: 20),
                      const Center(
                        child: SizedBox(
                          width: 28,
                          height: 28,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      ),
                    ],
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _error!,
                        style: const TextStyle(
                          color: AppColors.danger,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
