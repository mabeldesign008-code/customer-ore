import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ore_core/ore_core.dart';

import '../providers/customer_auth_provider.dart';
import '../core/ui/toast_x.dart';

class ProfileSetupScreen extends ConsumerStatefulWidget {
  const ProfileSetupScreen({super.key});

  @override
  ConsumerState<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends ConsumerState<ProfileSetupScreen> {
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _email = TextEditingController();

  bool _agreeTerms = true;
  bool _optInMarketing = true;
  bool _submitting = false;

  bool get _validName => _firstName.text.trim().length >= 2;

  @override
  void initState() {
    super.initState();
    final user = ref.read(customerAuthProvider).user;
    if (user?.name != null && user!.name!.isNotEmpty) {
      final parts = user.name!.split(' ');
      _firstName.text = parts.first;
      if (parts.length > 1) _lastName.text = parts.sublist(1).join(' ');
    }
    if (user?.email != null) {
      _email.text = user!.email!;
    }
    _firstName.addListener(() => setState(() {}));
    _lastName.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_validName) {
      context.showToast('Please enter your first name', type: ToastType.error);
      return;
    }
    if (!_agreeTerms) {
      context.showToast('Please agree to the Terms of Service to continue', type: ToastType.warning);
      return;
    }

    final fullName = '${_firstName.text.trim()} ${_lastName.text.trim()}'.trim();
    final email = _email.text.trim().isEmpty ? null : _email.text.trim();

    setState(() => _submitting = true);
    Haptics.medium();

    try {
      await ref.read(customerAuthProvider.notifier).updateProfile(name: fullName, email: email);
      if (!mounted) return;

      context.showToast('Welcome to Ore, ${_firstName.text.trim()}! 🎉', type: ToastType.success);

      final returnTo = GoRouterState.of(context).uri.queryParameters['returnTo'];
      context.go(
        returnTo != null && returnTo.startsWith('/')
            ? returnTo
            : '/location-permission',
      );
    } catch (e) {
      if (!mounted) return;
      context.showToast(e.toString(), type: ToastType.error);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _showTermsSheet() {
    Haptics.light();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const _TermsAndPrivacySheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(customerAuthProvider).user;
    final phone = user?.phone ?? '';

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 12),

              // Hero Badge
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(Icons.person_add_rounded, color: AppColors.primary, size: 28),
              ).animate().fadeIn(duration: 350.ms).scale(begin: const Offset(0.8, 0.8), end: const Offset(1, 1)),

              const SizedBox(height: 20),

              // Title
              Text('Welcome to Ore 👋', style: AppTypography.h1().copyWith(fontSize: 26, fontWeight: FontWeight.w800))
                  .animate().fadeIn(delay: 100.ms).slideY(begin: 0.1, end: 0),

              const SizedBox(height: 8),

              Text(
                'Let’s set up your profile for deliveries, order tracking, and receipt notifications.',
                style: AppTypography.body(AppColors.textSecondary).copyWith(height: 1.4),
              ).animate().fadeIn(delay: 150.ms).slideY(begin: 0.1, end: 0),

              const SizedBox(height: 24),

              // Verified Phone Pill
              if (phone.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.phone_rounded, color: AppColors.success, size: 18),
                      const SizedBox(width: 10),
                      Text(phone, style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w700)),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.success.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text('VERIFIED', style: AppTypography.caption(AppColors.success).copyWith(fontWeight: FontWeight.w800)),
                      ),
                    ],
                  ),
                ).animate().fadeIn(delay: 200.ms),

              const SizedBox(height: 24),

              // First Name Input
              Text('First Name *', style: AppTypography.bodySm().copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              _CustomTextField(
                controller: _firstName,
                hintText: 'e.g. Kwame',
                icon: Icons.person_rounded,
                textCapitalization: TextCapitalization.words,
              ),

              const SizedBox(height: 18),

              // Last Name Input
              Text('Last Name', style: AppTypography.bodySm().copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              _CustomTextField(
                controller: _lastName,
                hintText: 'e.g. Mensah',
                icon: Icons.person_rounded,
                textCapitalization: TextCapitalization.words,
              ),

              const SizedBox(height: 18),

              // Email Input (Optional)
              Row(
                children: [
                  Text('Email Address', style: AppTypography.bodySm().copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(width: 6),
                  Text('(for digital receipts)', style: AppTypography.caption(AppColors.textMuted)),
                ],
              ),
              const SizedBox(height: 8),
              _CustomTextField(
                controller: _email,
                hintText: 'kwame.mensah@gmail.com',
                icon: Icons.mail_outline_rounded,
                keyboardType: TextInputType.emailAddress,
              ),

              const SizedBox(height: 28),

              // Policy & Terms of Service Agreement Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: _agreeTerms ? AppColors.primary.withOpacity(0.3) : AppColors.border),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                child: Column(
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Checkbox(
                          value: _agreeTerms,
                          activeColor: AppColors.primary,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
                          onChanged: (val) => setState(() => _agreeTerms = val ?? true),
                        ),
                        Expanded(
                          child: RichText(
                            text: TextSpan(
                              style: AppTypography.bodySm(AppColors.textSecondary).copyWith(height: 1.45),
                              children: [
                                const TextSpan(text: 'I agree to the '),
                                TextSpan(
                                  text: 'Terms of Service',
                                  style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, decoration: TextDecoration.underline),
                                  recognizer: TapGestureRecognizer()..onTap = _showTermsSheet,
                                ),
                                const TextSpan(text: ' and acknowledge the '),
                                TextSpan(
                                  text: 'Privacy Policy',
                                  style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, decoration: TextDecoration.underline),
                                  recognizer: TapGestureRecognizer()..onTap = _showTermsSheet,
                                ),
                                const TextSpan(text: ' applicable to Ore Food & Errand Delivery Services.'),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 20, color: AppColors.border),
                    Row(
                      children: [
                        Switch(
                          value: _optInMarketing,
                          activeColor: AppColors.primary,
                          onChanged: (val) => setState(() => _optInMarketing = val),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Receive special discounts, order updates, and promotions via SMS & push notifications.',
                            style: AppTypography.caption(AppColors.textSecondary),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 250.ms),

              const SizedBox(height: 32),

              // Action Button
              AnimatedPress(
                onTap: _validName && _agreeTerms && !_submitting ? _submit : null,
                child: Container(
                  width: double.infinity,
                  height: 56,
                  decoration: BoxDecoration(
                    color: _validName && _agreeTerms ? AppColors.primary : AppColors.border,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: _validName && _agreeTerms
                        ? [BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 16, offset: const Offset(0, 6))]
                        : null,
                  ),
                  child: Center(
                    child: _submitting
                        ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'Agree & Continue',
                                style: AppTypography.bodyLg(Colors.white).copyWith(fontWeight: FontWeight.w800),
                              ),
                              const SizedBox(width: 8),
                              const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white, size: 20),
                            ],
                          ),
                  ),
                ),
              ).animate().fadeIn(delay: 300.ms),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

class _CustomTextField extends StatelessWidget {
  const _CustomTextField({
    required this.controller,
    required this.hintText,
    required this.icon,
    this.keyboardType,
    this.textCapitalization = TextCapitalization.none,
  });

  final TextEditingController controller;
  final String hintText;
  final IconData icon;
  final TextInputType? keyboardType;
  final TextCapitalization textCapitalization;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14),
      child: Row(
        children: [
          Icon(icon, color: AppColors.textMuted, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: TextField(
              controller: controller,
              keyboardType: keyboardType,
              textCapitalization: textCapitalization,
              style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w600),
              decoration: InputDecoration(
                hintText: hintText,
                border: InputBorder.none,
                hintStyle: AppTypography.body(AppColors.textMuted),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Full Terms of Service & Privacy Policy modal viewer.
class _TermsAndPrivacySheet extends StatelessWidget {
  const _TermsAndPrivacySheet();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          Container(
            margin: const EdgeInsets.only(top: 12, bottom: 8),
            width: 48,
            height: 5,
            decoration: BoxDecoration(
              color: AppColors.border,
              borderRadius: BorderRadius.circular(3),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            child: Row(
              children: [
                const Icon(Icons.balance_rounded, color: AppColors.primary, size: 24),
                const SizedBox(width: 10),
                Text('Terms & Privacy Policy', style: AppTypography.h3().copyWith(fontWeight: FontWeight.w800)),
                const Spacer(),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded, size: 20),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.border),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                _SectionTitle(title: '1. Ore Delivery Platform Overview'),
                _SectionBody(
                  text: 'Ore connects customers in Cape Coast, Ghana with local restaurants, supermarkets, pharmacies, and licensed errand riders. By using the platform, you agree to comply with all local regulations and platform terms.',
                ),
                const SizedBox(height: 16),
                _SectionTitle(title: '2. User Accounts & Verification'),
                _SectionBody(
                  text: 'You agree to provide accurate registration details. Accounts are verified via SMS one-time PIN (OTP). You are responsible for maintaining the confidentiality of your credentials.',
                ),
                const SizedBox(height: 16),
                _SectionTitle(title: '3. Payments, Pricing & Refunds'),
                _SectionBody(
                  text: 'All orders are denominated in Ghanaian Cedi (GH₵). Payments are securely processed via Paystack (Mobile Money / MTN, Telecel, AT, and Visa/Mastercard) and in-app Wallet. In the event of missing or damaged items, refunds are credited directly to your Ore Wallet upon verification.',
                ),
                const SizedBox(height: 16),
                _SectionTitle(title: '4. Privacy & Ghana Data Protection Act 2012'),
                _SectionBody(
                  text: 'We collect your phone number, name, email, and live location exclusively to fulfill deliveries and dispatch nearby riders. We never sell your personal information. Your data is encrypted and processed in compliance with the Data Protection Act, 2012 (Act 843) of Ghana.',
                ),
                const SizedBox(height: 16),
                _SectionTitle(title: '5. Rider Safety & Fair Usage'),
                _SectionBody(
                  text: 'Customers must maintain respectful conduct with delivery partners and vendor staff. Fraudulent chargebacks, abusive errand requests, or false dispute claims will lead to account suspension.',
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: Text('I Understand', style: AppTypography.bodyLg(Colors.white).copyWith(fontWeight: FontWeight.bold)),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(title, style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w800, color: AppColors.textPrimary));
  }
}

class _SectionBody extends StatelessWidget {
  const _SectionBody({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Text(text, style: AppTypography.bodySm(AppColors.textSecondary).copyWith(height: 1.5)),
    );
  }
}
