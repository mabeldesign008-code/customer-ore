import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart';

import '../../data/auth/rider_api_client_provider.dart';
import '../../providers/rider_provider.dart';
import '../../core/router/app_router.dart';

class RiderLoginScreen extends ConsumerStatefulWidget {
  const RiderLoginScreen({super.key});
  @override
  ConsumerState<RiderLoginScreen> createState() => _RiderLoginScreenState();
}

class _RiderLoginScreenState extends ConsumerState<RiderLoginScreen> {
  final _phoneCtrl = TextEditingController(text: '24');
  final _otp = List.generate(6, (_) => TextEditingController());
  bool _showOtp = false;
  bool _loading = false;

  @override
  void dispose() {
    _phoneCtrl.dispose();
    for (var c in _otp) { c.dispose(); }
    super.dispose();
  }

  Future<void> _sendCode() async {
    final phoneDigits = _phoneCtrl.text.replaceAll(RegExp(r'\s+'), '');
    if (phoneDigits.length < 9) {
      OreToast.show(context, message: 'Enter a valid phone number', type: ToastType.error);
      return;
    }

    HapticFeedback.lightImpact();
    setState(() => _loading = true);

    try {
      await ref.read(riderAuthRepositoryProvider).requestOtp(
            phone: _ghanaPhone(phoneDigits),
          );
      if (!mounted) return;
      setState(() {
        _showOtp = true;
        _loading = false;
      });
      OreToast.show(
        context,
        message: 'Verification code sent',
        type: ToastType.success,
      );
    } on DioException catch (error) {
      if (!mounted) return;
      setState(() => _loading = false);
      OreToast.show(
        context,
        message: _networkErrorMessage(error),
        type: ToastType.error,
      );
    } on ArgumentError {
      if (!mounted) return;
      setState(() => _loading = false);
      OreToast.show(
        context,
        message: 'Enter a valid phone number',
        type: ToastType.error,
      );
    } on FormatException {
      if (!mounted) return;
      setState(() => _loading = false);
      OreToast.show(
        context,
        message: 'The server returned an unexpected response',
        type: ToastType.error,
      );
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
      OreToast.show(
        context,
        message: 'Unable to send the verification code. Please try again.',
        type: ToastType.error,
      );
    }
  }

  Future<void> _verify() async {
    final code = _otp.map((c) => c.text).join();
    if (code.length != 6) {
      OreToast.show(context, message: 'Enter the 6-digit code', type: ToastType.error);
      return;
    }

    setState(() => _loading = true);
    final phone = _ghanaPhone(_phoneCtrl.text.replaceAll(RegExp(r'\s+'), ''));

    try {
      final result = await ref.read(riderAuthRepositoryProvider).verifyOtp(
            phone: phone,
            code: code,
          );
      if (!mounted) return;
      ref.read(riderAuthProvider).setAuthenticated(result.user);
      context.go(RiderRoutes.home);
    } on DioException catch (error) {
      if (!mounted) return;
      setState(() => _loading = false);
      OreToast.show(
        context,
        message: _networkErrorMessage(error),
        type: ToastType.error,
      );
    } on FormatException {
      if (!mounted) return;
      setState(() => _loading = false);
      OreToast.show(
        context,
        message: 'The server returned an unexpected response',
        type: ToastType.error,
      );
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
      OreToast.show(
        context,
        message: 'Unable to save your session. Please try again.',
        type: ToastType.error,
      );
    }
  }

  String _ghanaPhone(String digits) {
    if (digits.startsWith('0')) return '+233${digits.substring(1)}';
    if (digits.startsWith('233')) return '+$digits';
    return '+233$digits';
  }

  String _networkErrorMessage(DioException error) {
    final body = error.response?.data;
    if (body is Map) {
      final envelope = body['error'];
      if (envelope is Map && envelope['message'] is String) {
        return envelope['message'] as String;
      }
      if (body['message'] is String) return body['message'] as String;
    }

    return switch (error.type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.sendTimeout ||
      DioExceptionType.receiveTimeout => 'The request timed out. Please try again.',
      DioExceptionType.connectionError => 'No internet connection. Please try again.',
      _ => 'Unable to complete authentication. Please try again.',
    };
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppColors.primary, AppColors.primaryDark],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    Container(
                      width: 44, height: 44,
                      decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(14)),
                      child: const Icon(LucideIcons.bike, color: Colors.white),
                    ),
                    const SizedBox(width: 12),
                    Text('ore rider', style: AppTypography.h3(Colors.white)),
                    const Spacer(),
                    IconButton(tooltip: 'Action', 
                      icon: const Icon(LucideIcons.headset, color: Colors.white),
                      onPressed: () => OreSupportModal.show(context, title: 'Rider Support'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Expanded(
                child: Container(
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
                  ),
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('Welcome back', style: AppTypography.h1()),
                      const SizedBox(height: 8),
                      Text('Sign in to start accepting deliveries', style: AppTypography.body()),
                      const SizedBox(height: 32),
                      Text('Phone number', style: AppTypography.caption().copyWith(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 8),
                      Container(
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14),
                            child: Text('+233', style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w700)),
                          ),
                          Container(width: 1, height: 30, color: AppColors.border),
                          Expanded(
                            child: TextField(
                              controller: _phoneCtrl,
                              keyboardType: TextInputType.phone,
                              decoration: const InputDecoration(
                                border: InputBorder.none,
                                hintText: '24 123 4567',
                                contentPadding: EdgeInsets.symmetric(horizontal: 14),
                              ),
                              inputFormatters: [LengthLimitingTextInputFormatter(9)],
                            ),
                          ),
                        ]),
                      ),
                      if (_showOtp) ...[
                        const SizedBox(height: 24),
                        Text('Enter 6-digit code', style: AppTypography.caption().copyWith(fontWeight: FontWeight.w700)),
                        const SizedBox(height: 12),
                        Row(children: [
                          for (int i = 0; i < 6; i++) ...[
                            Expanded(
                              child: Container(
                                margin: EdgeInsets.only(right: i == 5 ? 0 : 10),
                                child: TextField(
                                  controller: _otp[i],
                                  keyboardType: TextInputType.number,
                                  textAlign: TextAlign.center,
                                  maxLength: 1,
                                  onChanged: (v) {
                                    if (v.isNotEmpty && i < 5) {
                                      FocusScope.of(context).nextFocus();
                                    }
                                    if (i == 5 && _otp.every((c) => c.text.isNotEmpty)) {
                                      _verify();
                                    }
                                  },
                                  style: AppTypography.h2().copyWith(fontSize: 24, fontWeight: FontWeight.w800),
                                  decoration: InputDecoration(
                                    counterText: '',
                                    filled: true,
                                    fillColor: AppColors.surface,
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(14),
                                      borderSide: const BorderSide(color: AppColors.border),
                                    ),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(14),
                                      borderSide: const BorderSide(color: AppColors.border),
                                    ),
                                    focusedBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(14),
                                      borderSide: const BorderSide(color: AppColors.primary, width: 2),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ]).animate().fadeIn().slideY(begin: 0.2),
                      ],
                      const SizedBox(height: 32),
                      OreButton(
                        label: _showOtp ? 'Verify & sign in' : 'Send code',
                        onPressed: _loading ? null : (_showOtp ? _verify : _sendCode),
                        isLoading: _loading,
                      ),
                      const SizedBox(height: 16),
                      Center(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            Haptics.medium();
                            context.push(RiderRoutes.onboardingStaged);
                          },
                          icon: const Icon(LucideIcons.userPlus, size: 18),
                          label: const Text('Apply as New Rider (4 Stages)'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.primary,
                            side: const BorderSide(color: AppColors.primary),
                            minimumSize: const Size(double.infinity, 50),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                        ),
                      ),
                    ]),
                  ),
                ).animate().fadeIn(duration: Motion.medium).slideY(begin: 0.08),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
