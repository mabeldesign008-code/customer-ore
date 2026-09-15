import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:ore_core/ore_core.dart';

import '../providers/customer_auth_provider.dart';
import '../data/auth/customer_auth_repository.dart';
import '../core/ui/toast_x.dart';

/// Phone-entry splash with gradient background.
/// Tapping arrow / submitting number → OTP sheet → success → home.
class GetStartedScreen extends ConsumerStatefulWidget {
  const GetStartedScreen({super.key});

  @override
  ConsumerState<GetStartedScreen> createState() => _GetStartedScreenState();
}

class _GetStartedScreenState extends ConsumerState<GetStartedScreen> {
  final _phone = TextEditingController();
  bool _valid = false;

  @override
  void initState() {
    super.initState();
    _phone.addListener(() {
      final v = _phone.text.replaceAll(RegExp(r'\D'), '').length >= 9;
      if (v != _valid) setState(() => _valid = v);
    });
  }

  @override
  void dispose() {
    _phone.dispose();
    super.dispose();
  }

  Future<void> _openOtp() async {
    Haptics.medium();
    final phone = _phone.text.trim();
    try {
      await ref.read(customerAuthProvider.notifier).requestOtp(phone);
      if (!mounted) return;
      final verified = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        isDismissible: true,
        builder: (_) => _OtpSheet(
          phone: phone,
          onVerify: (code) => ref.read(customerAuthProvider.notifier).verifyOtp(phone: phone, code: code),
          onResend: () => ref.read(customerAuthProvider.notifier).requestOtp(phone),
        ),
      );
      if (verified == true && mounted) {
        final returnTo = GoRouterState.of(context).uri.queryParameters['returnTo'];
        final user = ref.read(customerAuthProvider).user;
        if (user?.needsProfileSetup ?? false) {
          context.go(
            returnTo != null && returnTo.startsWith('/')
                ? '/profile-setup?returnTo=${Uri.encodeComponent(returnTo)}'
                : '/profile-setup',
          );
        } else {
          context.go(
            returnTo != null && returnTo.startsWith('/')
                ? returnTo
                : '/location-permission',
          );
        }
      }
    } on DioException catch (error) {
      if (!mounted) return;
      final body = error.response?.data;
      final message = body is Map && body['error'] is Map
          ? (body['error'] as Map)['message']?.toString()
          : null;
      context.showToast(message ?? 'Unable to send the verification code. Please try again.', type: ToastType.error);
    } catch (error) {
      if (!mounted) return;
      context.showToast(error.toString(), type: ToastType.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(children: [
        // Gradient background
        Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [AppColors.primaryLight, AppColors.primary, AppColors.primaryDark],
            ),
          ),
        ),
        // Decorative circle blobs
        Positioned(
          top: -80, right: -60,
          child: Container(
            width: 260, height: 260,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white.withOpacity(0.08),
            ),
          ),
        ).animate().scale(duration: 900.ms, curve: Motion.spring, begin: const Offset(0.5, 0.5)),
        Positioned(
          bottom: 100, left: -80,
          child: Container(
            width: 200, height: 200,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.accent.withOpacity(0.15),
            ),
          ),
        ).animate().scale(duration: 1100.ms, curve: Motion.spring, begin: const Offset(0.4, 0.4)),

        SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Back
                AnimatedPress(
                  onTap: () => context.pop(),
                  child: Container(
                    width: 44, height: 44,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.15),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white.withOpacity(0.3)),
                    ),
                    child: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
                  ),
                ),
                const Spacer(flex: 1),
                // Logo mark
                Container(
                  width: 72, height: 72,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.25), blurRadius: 18, offset: const Offset(0, 8))],
                  ),
                  child: const Icon(Icons.flash_on_rounded, color: AppColors.primary, size: 42),
                ).animate().scale(duration: Motion.medium, curve: Motion.spring, begin: const Offset(0.3, 0.3)).then().shimmer(duration: 1.seconds, color: Colors.white.withOpacity(0.4)),
                const SizedBox(height: 28),
                Text('Welcome to Ore',
                  style: AppTypography.h1(Colors.white).copyWith(fontSize: 36, letterSpacing: -1, height: 1.1),
                ).animate().fadeIn(delay: 100.ms, duration: Motion.medium).slideY(begin: 0.2, curve: Motion.spring),
                const SizedBox(height: 12),
                Text(
                  'Enter your phone number to get started. We\'ll send you a code to verify.',
                  style: AppTypography.body(Colors.white70).copyWith(fontSize: 16, height: 1.5),
                ).animate().fadeIn(delay: 200.ms),
                const SizedBox(height: 36),
                _phoneInput().animate().fadeIn(delay: 300.ms).slideY(begin: 0.15, curve: Motion.spring),
                const SizedBox(height: 16),
                Row(children: [
                  Expanded(
                    child: Opacity(
                      opacity: 0.95,
                      child: OutlinedButton.icon(
                        onPressed: () {
                          Haptics.medium();
                          // Guest mode → skip to location prompt then home
                          context.go('/location-permission?guest=1');
                        },
                        icon: const Icon(Icons.person_rounded, size: 18),
                        label: const Text('Continue as guest'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                          side: const BorderSide(color: Colors.white30, width: 1.2),
                          minimumSize: const Size(double.infinity, 54),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                      ),
                    ),
                  ),
                ]).animate().fadeIn(delay: 400.ms),
                const Spacer(flex: 2),
                Text(
                  'By continuing you agree to our Terms of Service and Privacy Policy.',
                  textAlign: TextAlign.center,
                  style: AppTypography.caption(Colors.white60).copyWith(fontSize: 12),
                ).animate().fadeIn(delay: 500.ms),
                const SizedBox(height: 8),
              ],
            ),
          ),
        ),
      ]),
    );
  }

  Widget _phoneInput() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 20, offset: const Offset(0, 10))],
      ),
      child: Row(children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          child: Row(children: [
            const Text('🇬🇭', style: TextStyle(fontSize: 22)),
            const SizedBox(width: 8),
            Text('+233', style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w800)),
          ]),
        ),
        Container(width: 1, height: 28, color: AppColors.border),
        const SizedBox(width: 8),
        Expanded(
          child: TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(10)],
            style: AppTypography.bodyLg().copyWith(letterSpacing: 1),
            decoration: InputDecoration(
              hintText: 'Phone number',
              border: InputBorder.none,
              hintStyle: AppTypography.body(AppColors.textMuted),
            ),
            onSubmitted: (_) => _valid ? _openOtp() : null,
          ),
        ),
        AnimatedPress(
          onTap: _valid ? _openOtp : null,
          child: AnimatedContainer(
            duration: Motion.fast,
            curve: Motion.spring,
            width: 48, height: 48,
            decoration: BoxDecoration(
              color: _valid ? AppColors.primary : AppColors.border,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(Icons.arrow_forward_ios_rounded, color: _valid ? Colors.white : AppColors.textMuted, size: 20),
          ),
        ),
      ]),
    );
  }
}

/// OTP verification bottom sheet with shake animation on wrong code.
class _OtpSheet extends StatefulWidget {
  const _OtpSheet({required this.phone, required this.onVerify, required this.onResend});
  final String phone;
  final Future<CustomerAuthenticatedUser> Function(String code) onVerify;
  final Future<CustomerOtpRequestResult> Function() onResend;

  @override
  State<_OtpSheet> createState() => _OtpSheetState();
}

class _OtpSheetState extends State<_OtpSheet> with SingleTickerProviderStateMixin {
  final _controllers = List.generate(6, (_) => TextEditingController());
  final _focus = List.generate(6, (_) => FocusNode());
  bool _verifying = false;
  bool _resending = false;
  int _resendSec = 0;
  String? _error;
  late final AnimationController _shake;

  @override
  void initState() {
    super.initState();
    _shake = AnimationController(vsync: this, duration: const Duration(milliseconds: 450));
    _startCooldown();
    // The OTP is issued by Auth; do not auto-fill or accept a demo code here.
  }

  void _startCooldown() {
    _resendSec = 30;
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) return false;
      setState(() => _resendSec--);
      return _resendSec > 0;
    });
  }

  @override
  void dispose() {
    _shake.dispose();
    for (final c in _controllers) { c.dispose(); }
    for (final f in _focus) { f.dispose(); }
    super.dispose();
  }

  Future<void> _submit() async {
    final code = _controllers.map((c) => c.text).join();
    if (code.length < 6 || _verifying) return;
    setState(() { _verifying = true; _error = null; });
    Haptics.medium();
    try {
      await widget.onVerify(code);
      if (!mounted) return;
      Haptics.success();
      Navigator.pop(context, true);
    } catch (error) {
      if (!mounted) return;
      Haptics.error();
      _shake.forward(from: 0);
      setState(() {
        _verifying = false;
        _error = error is DioException ? 'Incorrect or expired code. Try again.' : error.toString();
      });
      for (final c in _controllers) { c.clear(); }
      _focus[0].requestFocus();
    }
  }

  Future<void> _resend() async {
    if (_resendSec > 0 || _resending) return;
    setState(() {
      _resending = true;
      _error = null;
    });
    try {
      await widget.onResend();
      if (!mounted) return;
      _startCooldown();
      OreToast.show(context, message: 'A new code was sent', type: ToastType.success);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _resending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: AnimatedBuilder(
        animation: _shake,
        builder: (context, child) {
          final offset = (1 - _shake.value).abs() < 0.3
              ? (Curves.elasticIn.transform(_shake.value) * 12) * ((_shake.status == AnimationStatus.forward) ? 1 : -1)
              : 0.0;
          return Transform.translate(
            offset: Offset(offset - offset, 0),
            child: child,
          );
        },
        child: Container(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const SheetHandle(),
            const SizedBox(height: 16),
            Row(children: [
              AnimatedPress(
                onTap: () => Navigator.pop(context),
                child: const Icon(Icons.arrow_back_ios_new_rounded, size: 22),
              ),
              const Spacer(),
              Text('Verify number', style: AppTypography.h2()),
              const Spacer(),
              const SizedBox(width: 22),
            ]),
            const SizedBox(height: 8),
            Text('We sent a 6-digit code to', style: AppTypography.body(AppColors.textSecondary)),
            const SizedBox(height: 4),
            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Text('+233 ${widget.phone}', style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(width: 8),
              AnimatedPress(
                onTap: () => Navigator.pop(context),
                child: Text('Edit', style: AppTypography.body(AppColors.primary).copyWith(fontWeight: FontWeight.w700)),
              ),
            ]),
            const SizedBox(height: 28),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              for (int i = 0; i < 6; i++)
                SizedBox(
                  width: 46, height: 62,
                  child: TextField(
                    controller: _controllers[i],
                    focusNode: _focus[i],
                    keyboardType: TextInputType.number,
                    textAlign: TextAlign.center,
                    maxLength: 1,
                    style: AppTypography.h1().copyWith(fontSize: 26),
                    decoration: InputDecoration(
                      counterText: '',
                      filled: true,
                      fillColor: _error != null ? AppColors.danger.withOpacity(0.06) : AppColors.background,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide(
                          color: _error != null ? AppColors.danger : AppColors.primary,
                          width: 2,
                        ),
                      ),
                    ),
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    onChanged: (v) {
                      if (_error != null) setState(() => _error = null);
                      if (v.isNotEmpty && i < 5) {
                        _focus[i + 1].requestFocus();
                      } else if (v.isEmpty && i > 0) {
                        _focus[i - 1].requestFocus();
                      }
                      if (i == 5 && v.isNotEmpty) _submit();
                    },
                  ),
                ),
            ]),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                const Icon(Icons.error_outline_rounded, color: AppColors.danger, size: 16),
                const SizedBox(width: 6),
                Text(_error!, style: AppTypography.bodySm(AppColors.danger)),
              ]),
            ],
            const SizedBox(height: 28),
            OreButton(
              label: _verifying ? 'Verifying…' : 'Continue',
              isLoading: _verifying,
              onPressed: _submit,
            ),
            const SizedBox(height: 12),
            _resendSec > 0
              ? Text('Resend code in ${_resendSec}s', style: AppTypography.body(AppColors.textMuted))
              : TextButton.icon(
                  onPressed: _resending ? null : _resend,
                  icon: _resending
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.refresh_rounded, size: 16),
                  label: Text('Resend code', style: AppTypography.body(AppColors.primary).copyWith(fontWeight: FontWeight.w700)),
                ),
            SizedBox(height: MediaQuery.of(context).padding.bottom + 4),
          ]).animate().fadeIn(duration: Motion.medium).slideY(begin: 0.2, curve: Motion.spring),
        ),
      ),
    );
  }
}
