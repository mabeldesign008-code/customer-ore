import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_form_builder/flutter_form_builder.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart' show OreSupportModal, OreToast, ToastType;
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../widgets/common/top_bar.dart';
import '../../widgets/common/primary_button.dart';
import '../../widgets/forms/custom_text_field.dart';
import '../../widgets/forms/custom_dropdown.dart';
import '../../providers/vendor_data_provider.dart';
import '../../providers/auth/registration_provider.dart';
import '../../data/onboarding/vendor_onboarding_repository.dart';
import 'under_review_screen.dart';

class BankDetailsScreen extends ConsumerStatefulWidget {
  const BankDetailsScreen({super.key});

  @override
  ConsumerState<BankDetailsScreen> createState() => _BankDetailsScreenState();
}

class _BankDetailsScreenState extends ConsumerState<BankDetailsScreen> {
  final _formKey = GlobalKey<FormBuilderState>();

  // Payment Method Selection
  bool _isMobileMoney = true;
  String _selectedProvider = 'MTN'; // Paystack Ghana codes: MTN, VOD, ATL
  bool _acceptedTerms = false;
  bool _recipientVerified = false;
  bool _providersLoading = false;
  List<VendorPayoutProvider> _providers = <VendorPayoutProvider>[];

  @override
  void initState() {
    super.initState();
    _loadProviders('MOMO');
  }

  Future<void> _loadProviders(String type) async {
    setState(() => _providersLoading = true);
    try {
      final providers = await ref.read(vendorOnboardingRepositoryProvider).getPayoutProviders(type);
      if (!mounted) return;
      setState(() {
        _providers = providers;
        if (_providers.isNotEmpty && !_providers.any((provider) => provider.code == _selectedProvider)) {
          _selectedProvider = _providers.first.code;
        }
      });
    } catch (_) {
      if (mounted) OreToast.show(context, message: 'Unable to load payout providers', type: ToastType.error);
    } finally {
      if (mounted) setState(() => _providersLoading = false);
    }
  }

  Future<void> _verifyPaystackRecipient() async {
    HapticFeedback.lightImpact();
    if (!(_formKey.currentState?.saveAndValidate() ?? false)) return;
    final values = _formKey.currentState!.value;
    final accountNumber = (_isMobileMoney ? values['momoNumber'] : values['accountNumber'])?.toString() ?? '';
    final accountName = (_isMobileMoney ? values['momoAccountName'] : values['accountName'])?.toString() ?? '';
    final provider = _isMobileMoney ? _selectedProvider : values['bankName']?.toString() ?? '';
    try {
      await ref.read(vendorOnboardingRepositoryProvider).verifyPayout(
        type: _isMobileMoney ? 'MOMO' : 'BANK',
        provider: provider,
        accountNumber: accountNumber,
        accountName: accountName,
      );
      if (!mounted) return;
      setState(() => _recipientVerified = true);
      OreToast.show(context, message: 'Payout account verified with Paystack Ghana', type: ToastType.success);
    } catch (_) {
      if (mounted) OreToast.show(context, message: 'Unable to verify payout account', type: ToastType.error);
    }
  }

  Future<void> _onContinue() async {
    if (!_acceptedTerms) {
      OreToast.show(context, message: 'You must review and accept the Vendor Payment Terms', type: ToastType.error);
      return;
    }
    if (!_recipientVerified) {
      OreToast.show(context, message: 'Verify the payout account before submitting', type: ToastType.error);
      return;
    }
    if (!(_formKey.currentState?.saveAndValidate() ?? false)) return;
    final values = _formKey.currentState!.value;
    final accountNumber = (_isMobileMoney ? values['momoNumber'] : values['accountNumber'])?.toString() ?? '';
    final accountName = (_isMobileMoney ? values['momoAccountName'] : values['accountName'])?.toString() ?? '';
    final provider = _isMobileMoney ? _selectedProvider : values['bankName']?.toString() ?? '';
    try {
      final stage5 = <String, dynamic>{
        'payout': <String, String>{
          'type': _isMobileMoney ? 'MOMO' : 'BANK',
          'provider': provider,
          'accountNumber': accountNumber,
          'accountName': accountName,
        },
        'acceptedTerms': true,
      };
      await ref.read(vendorOnboardingRepositoryProvider).saveStage(5, stage5);
      final draft = ref.read(registrationProvider);
      if (draft.selfieBase64 == null || draft.angleImagesBase64.length < 6 || draft.documentFrontBase64 == null || draft.businessRegistrationDoc == null) {
        throw StateError('Complete biometric and document capture before final submission');
      }
      final ownerParts = draft.ownerName.trim().split(RegExp(r'\s+'));
      final lastName = ownerParts.length > 1 ? ownerParts.removeLast() : 'Owner';
      final givenNames = ownerParts.join(' ');
      await ref.read(vendorOnboardingRepositoryProvider).submitVendorSmileDocument(
        givenNames: givenNames,
        lastName: lastName,
        email: draft.ownerEmail,
        phoneNumber: draft.ownerPhone,
        idNumber: draft.ghanaCardNumber,
        selfieBase64: draft.selfieBase64!,
        angleImagesBase64: draft.angleImagesBase64,
        documentFrontBase64: draft.documentFrontBase64!,
        documentFrontName: draft.documentFrontName ?? 'ghana_card_front.jpg',
        documentBackBase64: draft.documentBackBase64,
        documentBackName: draft.documentBackName,
        stage4: <String, dynamic>{
          'registrationNumber': draft.registrationNumber,
          'businessRegDocKey': draft.businessRegistrationDoc,
        },
        stage5: stage5,
      );
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const UnderReviewScreen()), (route) => false);
    } catch (_) {
      if (mounted) OreToast.show(context, message: 'Unable to submit Vendor application', type: ToastType.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(100),
        child: TopBar(
          title: 'Vendor Setup',
          step: 5,
          total: 5,
          onBack: () => Navigator.of(context).pop(),
        ),
      ),
      body: FormBuilder(
        key: _formKey,
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.only(
                  left: 16,
                  right: 16,
                  top: 24,
                  bottom: 32,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Payment & Settlement', style: AppTextStyles.heading2),
                        IconButton(tooltip: 'Action', 
                          icon: const Icon(LucideIcons.headset, color: AppColors.primary),
                          onPressed: () => OreSupportModal.show(context, title: 'Payout Setup Support'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Provide your verified Mobile Money or Ghanaian Bank Account for weekly automated settlements.',
                      style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 24),

                    // Method Selector (MoMo vs Bank)
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () {
                              setState(() => _isMobileMoney = true);
                              _loadProviders('MOMO');
                            },
                            borderRadius: BorderRadius.circular(14),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              decoration: BoxDecoration(
                                color: _isMobileMoney ? AppColors.primary.withOpacity(0.08) : Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: _isMobileMoney ? AppColors.primary : AppColors.border,
                                  width: _isMobileMoney ? 2 : 1,
                                ),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                'Mobile Money (MoMo)',
                                style: AppTextStyles.heading3.copyWith(
                                  fontSize: 14,
                                  color: _isMobileMoney ? AppColors.primary : AppColors.textPrimary,
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: InkWell(
                            onTap: () {
                              setState(() => _isMobileMoney = false);
                              _loadProviders('BANK');
                            },
                            borderRadius: BorderRadius.circular(14),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              decoration: BoxDecoration(
                                color: !_isMobileMoney ? AppColors.primary.withOpacity(0.08) : Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: !_isMobileMoney ? AppColors.primary : AppColors.border,
                                  width: !_isMobileMoney ? 2 : 1,
                                ),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                'Bank Account (GHIPSS)',
                                style: AppTextStyles.heading3.copyWith(
                                  fontSize: 14,
                                  color: !_isMobileMoney ? AppColors.primary : AppColors.textPrimary,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    if (_isMobileMoney) ...[
                      Text('Mobile Money Provider', style: AppTextStyles.label),
                      const SizedBox(height: 8),
                      if (_providersLoading)
                        const LinearProgressIndicator()
                      else if (_providers.isEmpty)
                        Text('No payout providers returned by Paystack.', style: AppTextStyles.caption.copyWith(color: AppColors.error))
                      else
                        Row(
                          children: _providers.map((provider) {
                            final selected = _selectedProvider == provider.code;
                            return Expanded(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 4),
                                child: InkWell(
                                  onTap: () => setState(() => _selectedProvider = provider.code),
                                  borderRadius: BorderRadius.circular(12),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    decoration: BoxDecoration(
                                      color: selected ? AppColors.primary.withOpacity(0.08) : Colors.white,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: selected ? AppColors.primary : AppColors.border, width: selected ? 1.5 : 1),
                                    ),
                                    alignment: Alignment.center,
                                    child: Text(provider.name, style: AppTextStyles.heading3.copyWith(fontSize: 14)),
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      const SizedBox(height: 16),
                      const CustomTextField(name: 'momoNumber', label: 'Mobile Money Number', hintText: '024 123 4567', keyboardType: TextInputType.phone),
                      const SizedBox(height: 16),
                      const CustomTextField(name: 'momoAccountName', label: 'Registered Account Name', hintText: 'Exact name registered on MoMo'),
                    ] else ...[
                      CustomDropdownField<String>(
                        name: 'bankName',
                        label: 'Bank in Ghana',
                        hintText: _providers.isEmpty ? 'No banks returned' : 'Select your bank',
                        items: _providers.map((provider) => DropdownMenuItem(value: provider.code, child: Text(provider.name))).toList(),
                      ),
                      const SizedBox(height: 16),
                      const CustomTextField(name: 'accountNumber', label: 'Account Number', hintText: 'Account number', keyboardType: TextInputType.number),
                      const SizedBox(height: 16),
                      const CustomTextField(name: 'accountName', label: 'Account Holder Name', hintText: 'Business or Owner registered name'),
                    ],

                    const SizedBox(height: 24),

                    // Paystack Verification Card
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: _recipientVerified ? AppColors.success : AppColors.primary,
                          width: 1.5,
                        ),
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Icon(
                                _recipientVerified ? LucideIcons.checkCircle : LucideIcons.badgeCheck,
                                color: _recipientVerified ? AppColors.success : AppColors.primary,
                                size: 22,
                              ),
                              const SizedBox(width: 10),
                              Text('Paystack Payout Verification', style: AppTextStyles.heading3),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _recipientVerified
                                ? 'Transfer Recipient Token Generated (GHS Payout Active)'
                                : 'Ore settles funds directly via Paystack Transfers. Tap below to verify your account details.',
                            style: AppTextStyles.bodyTextSmall.copyWith(color: AppColors.textSecondary),
                          ),
                          const SizedBox(height: 12),
                          if (!_recipientVerified)
                            OutlinedButton.icon(
                              onPressed: _verifyPaystackRecipient,
                              icon: const Icon(LucideIcons.shieldCheck, size: 16),
                              label: const Text('Verify Payout Account'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.primary,
                                side: const BorderSide(color: AppColors.primary),
                                minimumSize: const Size(double.infinity, 40),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                            ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Vendor Payment Terms Acceptance
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Vendor Payment Terms', style: AppTextStyles.heading3),
                          const SizedBox(height: 6),
                          Text(
                            '• Weekly settlements every Monday cutoff.\n• Minimum payout: GHS 100.\n• Rolling reserve: 10% held for dispute protection.\n• Per-category commission applied per completed order.',
                            style: AppTextStyles.bodyTextSmall.copyWith(height: 1.5),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Checkbox(
                                value: _acceptedTerms,
                                activeColor: AppColors.primary,
                                onChanged: (v) => setState(() => _acceptedTerms = v ?? false),
                              ),
                              Expanded(
                                child: Text(
                                  'I have read and accept the Vendor Payment Terms',
                                  style: AppTextStyles.bodyTextSmall.copyWith(fontWeight: FontWeight.w600),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Sticky Footer
            Container(
              decoration: const BoxDecoration(
                color: AppColors.background,
                border: Border(top: BorderSide(color: AppColors.border)),
              ),
              padding: const EdgeInsets.all(16),
              child: SafeArea(
                top: false,
                child: PrimaryButton(
                  label: 'Submit Application for Review',
                  onPressed: _onContinue,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
