import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/router/app_router.dart';
import '../../providers/auth/vendor_auth_provider.dart';
import '../../widgets/common/primary_button.dart';

class VendorLoginScreen extends ConsumerStatefulWidget {
  const VendorLoginScreen({super.key});

  @override
  ConsumerState<VendorLoginScreen> createState() => _VendorLoginScreenState();
}

class _VendorLoginScreenState extends ConsumerState<VendorLoginScreen> {
  final _phone = TextEditingController();
  final _otp = List.generate(6, (_) => TextEditingController());
  bool _showOtp = false;
  bool _loading = false;

  @override
  void dispose() {
    _phone.dispose();
    for (final controller in _otp) {
      controller.dispose();
    }
    super.dispose();
  }

  String _phoneE164() {
    final digits = _phone.text.replaceAll(RegExp(r'\s+'), '');
    if (digits.startsWith('0')) return '+233${digits.substring(1)}';
    if (digits.startsWith('233')) return '+$digits';
    return '+233$digits';
  }

  Future<void> _requestOtp() async {
    if (_phone.text.replaceAll(RegExp(r'\s+'), '').length < 9) {
      _showError('Enter a valid Ghana phone number');
      return;
    }
    setState(() => _loading = true);
    try {
      await ref.read(vendorAuthRepositoryProvider).requestOtp(phone: _phoneE164());
      if (!mounted) return;
      setState(() {
        _showOtp = true;
        _loading = false;
      });
      _showMessage('Verification code sent');
    } on DioException catch (error) {
      _finishWithError(_messageFrom(error));
    } on ArgumentError catch (error) {
      _finishWithError(error.message?.toString() ?? 'Enter a valid phone number');
    } catch (_) {
      _finishWithError('Unable to send the verification code');
    }
  }

  Future<void> _verifyOtp() async {
    final code = _otp.map((controller) => controller.text).join();
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      _showError('Enter the six-digit verification code');
      return;
    }
    setState(() => _loading = true);
    try {
      final result = await ref.read(vendorAuthRepositoryProvider).verifyOtp(
            phone: _phoneE164(),
            code: code,
          );
      if (!mounted) return;
      ref.read(vendorAuthProvider).setAuthenticated(result.user);
      // Re-enter the bootstrap resolver so an existing draft/pending review is
      // resumed instead of always landing on an empty dashboard.
      context.go(VendorRoutes.splash);
    } on DioException catch (error) {
      _finishWithError(_messageFrom(error));
    } on ArgumentError catch (error) {
      _finishWithError(error.message?.toString() ?? 'Enter a valid code');
    } catch (_) {
      _finishWithError('Unable to verify the code');
    }
  }

  String _messageFrom(DioException error) {
    final body = error.response?.data;
    if (body is Map) {
      final nested = body['error'];
      if (nested is Map && nested['message'] is String) return nested['message'] as String;
      if (body['message'] is String) return body['message'] as String;
    }
    return error.type == DioExceptionType.connectionError
        ? 'No internet connection. Please try again.'
        : 'Unable to complete authentication. Please try again.';
  }

  void _finishWithError(String message) {
    if (!mounted) return;
    setState(() => _loading = false);
    _showError(message);
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(backgroundColor: AppColors.error, content: Text(message)),
    );
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(backgroundColor: AppColors.success, content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.primaryTransparent,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(LucideIcons.store, color: AppColors.primary),
                  ),
                  const SizedBox(width: 12),
                  Text('ore vendor', style: AppTextStyles.heading3),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Welcome back', style: AppTextStyles.heading1),
                    const SizedBox(height: 8),
                    Text('Sign in to manage your store and orders', style: AppTextStyles.body.copyWith(color: AppColors.textSecondary)),
                    const SizedBox(height: 32),
                    Text('Phone number', style: AppTextStyles.label),
                    const SizedBox(height: 8),
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Row(
                        children: [
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 14),
                            child: Text('+233', style: AppTextStyles.subtitleMedium),
                          ),
                          Container(width: 1, height: 30, color: AppColors.border),
                          Expanded(
                            child: TextField(
                              controller: _phone,
                              keyboardType: TextInputType.phone,
                              inputFormatters: [LengthLimitingTextInputFormatter(10)],
                              decoration: const InputDecoration(
                                border: InputBorder.none,
                                hintText: '24 123 4567',
                                contentPadding: EdgeInsets.symmetric(horizontal: 14),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (_showOtp) ...[
                      const SizedBox(height: 28),
                      Text('Enter six-digit code', style: AppTextStyles.label),
                      const SizedBox(height: 12),
                      Row(
                        children: List.generate(6, (index) {
                          return Expanded(
                            child: Padding(
                              padding: EdgeInsets.only(right: index == 5 ? 0 : 8),
                              child: TextField(
                                controller: _otp[index],
                                keyboardType: TextInputType.number,
                                maxLength: 1,
                                textAlign: TextAlign.center,
                                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                                onChanged: (value) {
                                  if (value.isNotEmpty && index < 5) FocusScope.of(context).nextFocus();
                                  if (index == 5 && _otp.every((item) => item.text.isNotEmpty)) _verifyOtp();
                                },
                                decoration: InputDecoration(
                                  counterText: '',
                                  filled: true,
                                  fillColor: Colors.white,
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                                ),
                                style: AppTextStyles.heading2,
                              ),
                            ),
                          );
                        }),
                      ),
                    ],
                    const SizedBox(height: 32),
                    PrimaryButton(
                      label: _showOtp ? 'Verify & continue' : 'Send verification code',
                      loading: _loading,
                      onPressed: _loading ? null : () {
                        if (_showOtp) {
                          _verifyOtp();
                        } else {
                          _requestOtp();
                        }
                      },
                      icon: const Icon(LucideIcons.arrowRight, color: Colors.white, size: 18),
                    ),
                    const SizedBox(height: 18),
                    Center(
                      child: Text(
                        'Vendor access is protected by phone verification.',
                        textAlign: TextAlign.center,
                        style: AppTextStyles.caption,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
