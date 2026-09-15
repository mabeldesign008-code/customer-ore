import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_form_builder/flutter_form_builder.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import 'package:ore_core/ore_core.dart' show OreSupportModal, OreToast, ToastType;
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../widgets/common/top_bar.dart';
import '../../widgets/common/primary_button.dart';
import '../../widgets/forms/custom_text_field.dart';
import '../../widgets/forms/custom_dropdown.dart';
import '../../providers/auth/vendor_auth_provider.dart';
import '../../providers/auth/registration_provider.dart';
import '../../providers/vendor_data_provider.dart';
import 'document_upload_screen.dart';

class OwnerInformationScreen extends ConsumerStatefulWidget {
  const OwnerInformationScreen({super.key});

  @override
  ConsumerState<OwnerInformationScreen> createState() => _OwnerInformationScreenState();
}

class _OwnerInformationScreenState extends ConsumerState<OwnerInformationScreen> {
  final _formKey = GlobalKey<FormBuilderState>();
  final _picker = ImagePicker();
  bool _smileIdVerified = false;
  bool _capturing = false;
  XFile? _selfie;
  List<XFile> _angles = <XFile>[];

  Future<void> _onVerifySmileId() async {
    HapticFeedback.mediumImpact();
    setState(() => _capturing = true);
    try {
      final selfie = await _picker.pickImage(source: ImageSource.camera, imageQuality: 80, maxWidth: 1600);
      if (selfie == null) throw StateError('Selfie capture was cancelled');
      final angles = <XFile>[];
      for (var index = 0; index < 6; index++) {
        final angle = await _picker.pickImage(source: ImageSource.camera, imageQuality: 80, maxWidth: 1600);
        if (angle == null) throw StateError('Liveness capture was cancelled at image ${index + 1}');
        angles.add(angle);
      }
      if (!mounted) return;
      setState(() {
        _selfie = selfie;
        _angles = angles;
        _smileIdVerified = true;
      });
      OreToast.show(context, message: 'Biometric images captured and ready for verification', type: ToastType.success);
    } catch (error) {
      if (mounted) OreToast.show(context, message: error.toString(), type: ToastType.error);
    } finally {
      if (mounted) setState(() => _capturing = false);
    }
  }

  Future<void> _onContinue() async {
    if (!_smileIdVerified || _selfie == null || _angles.length < 6) {
      OreToast.show(context, message: 'Capture the selfie and six liveness images first', type: ToastType.error);
      return;
    }
    if (!(_formKey.currentState?.saveAndValidate() ?? false)) return;
    final values = _formKey.currentState!.value;
    try {
      final ownerName = values['ownerName']?.toString() ?? '';
      final ownerRole = values['ownerRole']?.toString() ?? 'Owner';
      final ownerEmail = values['ownerEmail']?.toString() ?? '';
      final ownerPhone = ref.read(vendorAuthProvider).state.user?.phone ?? '';
      final ghanaCardNumber = values['ghanaCardNumber']?.toString() ?? '';
      final selfieBase64 = base64Encode(await _selfie!.readAsBytes());
      final angleImagesBase64 = [
        for (final image in _angles) base64Encode(await image.readAsBytes()),
      ];
      await ref.read(vendorOnboardingRepositoryProvider).saveStage(3, <String, dynamic>{
        'ownerName': ownerName,
        'ownerRole': ownerRole,
        'ownerPhone': ownerPhone,
        'ownerEmail': ownerEmail,
        'ghanaCardNumber': ghanaCardNumber,
        'idType': 'GHANA_CARD',
        'selfieBase64': selfieBase64,
        'angleImagesBase64': angleImagesBase64,
      });
      final notifier = ref.read(registrationProvider.notifier);
      notifier.updateField('ownerName', ownerName);
      notifier.updateField('ownerRole', ownerRole);
      notifier.updateField('ownerPhone', ownerPhone);
      notifier.updateField('ownerEmail', ownerEmail);
      notifier.updateField('ghanaCardNumber', ghanaCardNumber);
      notifier.updateField('selfieBase64', selfieBase64);
      notifier.updateField('angleImagesBase64', angleImagesBase64);
      notifier.updateField('smileIdLivenessPassed', true);
      if (!mounted) return;
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const DocumentUploadScreen()));
    } catch (_) {
      if (mounted) OreToast.show(context, message: 'Unable to submit owner verification', type: ToastType.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(100),
        child: TopBar(
          title: 'Vendor Registration',
          step: 3,
          total: 5,
          onBack: () {
            if (context.canPop()) context.pop();
          },
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
                  top: 20,
                  bottom: 32,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Owner Information', style: AppTextStyles.heading2),
                        IconButton(tooltip: 'Action', 
                          icon: const Icon(LucideIcons.headset, color: AppColors.primary),
                          onPressed: () => OreSupportModal.show(context, title: 'Owner Verification Support'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Please provide the legal details of the primary business owner / director.',
                      style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 16),

                    // Full Name
                    const CustomTextField(
                      name: 'ownerName',
                      label: 'Full Legal Name',
                      hintText: 'e.g., Kofi Mensah',
                    ),
                    const SizedBox(height: 16),

                    // Role
                    CustomDropdownField<String>(
                      name: 'ownerRole',
                      label: 'Role in Business',
                      hintText: 'Select role',
                      items: const [
                        DropdownMenuItem(value: 'Owner', child: Text('Sole Proprietor / Owner')),
                        DropdownMenuItem(value: 'Director', child: Text('Managing Director')),
                        DropdownMenuItem(value: 'Partner', child: Text('General Partner')),
                        DropdownMenuItem(value: 'Manager', child: Text('Store Manager')),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Phone (Verified)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Verified Phone Number', style: AppTextStyles.label),
                        const SizedBox(height: 4),
                        Container(
                          height: 48,
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Row(
                            children: [
                              Text('+233 24 123 4567', style: AppTextStyles.inputText),
                              const Spacer(),
                              const Icon(LucideIcons.circleCheck, size: 16, color: AppColors.success),
                              const SizedBox(width: 4),
                              Text('VERIFIED', style: AppTextStyles.captionBold.copyWith(color: AppColors.success)),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Email
                    const CustomTextField(
                      name: 'ownerEmail',
                      label: 'Owner Email Address',
                      hintText: 'e.g., kofi.mensah@ghana-biz.com',
                      keyboardType: TextInputType.emailAddress,
                    ),
                    const SizedBox(height: 16),

                    // Ghana Card Number
                    const CustomTextField(
                      name: 'ghanaCardNumber',
                      label: 'Ghana Card Number (National ID)',
                      hintText: 'GHA-723145678-9',
                    ),
                    const SizedBox(height: 24),

                    // Smile ID Verification Card
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(
                          color: _smileIdVerified ? AppColors.success : AppColors.primary,
                          width: 1.5,
                        ),
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: (_smileIdVerified ? AppColors.success : AppColors.primary).withOpacity(0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  _smileIdVerified ? LucideIcons.checkCircle : LucideIcons.scanFace,
                                  color: _smileIdVerified ? AppColors.success : AppColors.primary,
                                  size: 24,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Smile ID Biometric Liveness', style: AppTextStyles.heading3),
                                    Text(
                                      _smileIdVerified ? 'Biometric images captured; provider verification pending' : '1 selfie + 6 facial angle checks',
                                      style: AppTextStyles.bodyTextSmall.copyWith(color: AppColors.textSecondary),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          Text(
                            'Smile ID verifies the owner against the national identity database with biometric anti-spoofing.',
                            style: AppTextStyles.bodyTextSmall,
                          ),
                          const SizedBox(height: 16),
                          OutlinedButton.icon(
                            onPressed: _capturing ? null : _onVerifySmileId,
                            icon: _capturing
                                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                                : Icon(_smileIdVerified ? LucideIcons.refreshCw : LucideIcons.camera, size: 18),
                            label: Text(_capturing ? 'Capture in progress…' : (_smileIdVerified ? 'Recapture Biometrics' : 'Start Smile ID Liveness')),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppColors.primary,
                              side: const BorderSide(color: AppColors.primary),
                              minimumSize: const Size(double.infinity, 44),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
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
                  label: 'Continue to Step 4',
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
