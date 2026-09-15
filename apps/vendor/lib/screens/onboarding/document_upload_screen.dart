import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import 'package:ore_core/ore_core.dart' show OreSupportModal, OreToast, ToastType;
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../widgets/common/top_bar.dart';
import '../../widgets/common/primary_button.dart';
import '../../providers/vendor_data_provider.dart';
import '../../providers/auth/registration_provider.dart';
import 'bank_details_screen.dart';

class DocumentUploadScreen extends ConsumerStatefulWidget {
  const DocumentUploadScreen({super.key});

  @override
  ConsumerState<DocumentUploadScreen> createState() => _DocumentUploadScreenState();
}

class _DocumentUploadScreenState extends ConsumerState<DocumentUploadScreen> {
  final _registrationNumber = TextEditingController();
  bool _uploading = false;

  // Required documents state
  String? _businessRegDoc;
  String? _ghanaCardFront;
  String? _ghanaCardBack;

  // Optional category document toggles
  bool _includeTIN = true;
  bool _includeBusinessPhotos = true;
  bool _includeVAT = false;

  bool get _canContinue => _businessRegDoc != null && _ghanaCardFront != null && _ghanaCardBack != null;

  @override
  void dispose() {
    _registrationNumber.dispose();
    super.dispose();
  }

  Future<void> _pickAndUpload(String docType) async {
    if (_uploading) return;
    HapticFeedback.lightImpact();
    final result = await FilePicker.platform.pickFiles(withData: true, type: FileType.custom, allowedExtensions: const ['pdf', 'jpg', 'jpeg', 'png']);
    final file = result?.files.single;
    if (file == null || file.bytes == null) return;
    final lower = file.name.toLowerCase();
    if (docType != 'businessReg' && lower.endsWith('.pdf')) {
      if (mounted) OreToast.show(context, message: 'Ghana Card images must be JPG or PNG', type: ToastType.error);
      return;
    }
    final contentType = lower.endsWith('.pdf')
        ? 'application/pdf'
        : lower.endsWith('.png')
            ? 'image/png'
            : 'image/jpeg';
    setState(() => _uploading = true);
    try {
      final application = await ref.read(vendorOnboardingRepositoryProvider).getStatus();
      final key = await ref.read(vendorOnboardingRepositoryProvider).uploadDocument(
        applicationId: application.id,
        documentType: docType,
        fileName: file.name.replaceAll(RegExp(r'[^A-Za-z0-9._-]'), '_'),
        contentType: contentType,
        bytes: file.bytes!,
      );
      if (!mounted) return;
      final notifier = ref.read(registrationProvider.notifier);
      switch (docType) {
        case 'businessReg':
          notifier.updateField('businessRegistrationDoc', key);
          break;
        case 'ghanaCardFront':
          notifier.updateField('documentFrontBase64', base64Encode(file.bytes!));
          notifier.updateField('documentFrontName', file.name);
          break;
        case 'ghanaCardBack':
          notifier.updateField('documentBackBase64', base64Encode(file.bytes!));
          notifier.updateField('documentBackName', file.name);
          break;
      }
      setState(() {
        switch (docType) {
          case 'businessReg':
            _businessRegDoc = key;
            break;
          case 'ghanaCardFront':
            _ghanaCardFront = key;
            break;
          case 'ghanaCardBack':
            _ghanaCardBack = key;
            break;
        }
      });
      OreToast.show(context, message: 'Document uploaded securely', type: ToastType.success);
    } catch (_) {
      if (mounted) OreToast.show(context, message: 'Unable to upload document', type: ToastType.error);
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _onContinue() async {
    final registrationNumber = _registrationNumber.text.trim();
    if (!_canContinue || registrationNumber.length < 3) {
      OreToast.show(
        context,
        message: 'Please upload Business Registration and Ghana Card (Front & Back)',
        type: ToastType.error,
      );
      return;
    }
    try {
      final notifier = ref.read(registrationProvider.notifier);
      notifier.updateField('registrationNumber', registrationNumber);
      notifier.updateField('documentsUploaded', true);
      await ref.read(vendorOnboardingRepositoryProvider).saveStage(4, <String, dynamic>{
        'registrationNumber': registrationNumber,
        'businessRegDocKey': _businessRegDoc,
      });
      if (!mounted) return;
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const BankDetailsScreen()));
    } catch (_) {
      if (mounted) OreToast.show(context, message: 'Unable to save business documents', type: ToastType.error);
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
          step: 4,
          total: 5,
          onBack: () {
            if (context.canPop()) context.pop();
          },
        ),
      ),
      body: Column(
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
                      Text('Business Documents', style: AppTextStyles.heading2),
                      IconButton(tooltip: 'Action', 
                        icon: const Icon(LucideIcons.headset, color: AppColors.primary),
                        onPressed: () => OreSupportModal.show(context, title: 'Document Upload Support'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Upload clear photos or PDFs of your Registrar General registration and owner Ghana Card.',
                    style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 24),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Business Registration Number', style: AppTextStyles.label),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _registrationNumber,
                        decoration: InputDecoration(
                          hintText: 'e.g. CS-123456789',
                          filled: true,
                          fillColor: Colors.white,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Business Registration Certificate
                  _buildUploadBox(
                    title: 'Business Registration Certificate (RGD)',
                    subtitle: 'PDF, PNG, or JPG (max 10MB)',
                    fileName: _businessRegDoc,
                    onTap: _uploading ? null : () => _pickAndUpload('businessReg'),
                  ),
                  const SizedBox(height: 16),

                  // Ghana Card Front
                  _buildUploadBox(
                    title: "Owner's Ghana Card (Front)",
                    subtitle: 'Clear, all 4 corners visible',
                    fileName: _ghanaCardFront,
                    onTap: _uploading ? null : () => _pickAndUpload('ghanaCardFront'),
                  ),
                  const SizedBox(height: 16),

                  // Ghana Card Back
                  _buildUploadBox(
                    title: "Owner's Ghana Card (Back)",
                    subtitle: 'Clear, barcode visible',
                    fileName: _ghanaCardBack,
                    onTap: _uploading ? null : () => _pickAndUpload('ghanaCardBack'),
                  ),
                  const SizedBox(height: 24),

                  // Optional Regulatory Documents
                  Text('Additional Tax & Permitted Documents', style: AppTextStyles.heading3),
                  const SizedBox(height: 12),
                  _buildToggleRow(
                    title: 'Tax Identification Number (TIN / GRA)',
                    value: _includeTIN,
                    onChanged: (v) => setState(() => _includeTIN = v),
                  ),
                  _buildToggleRow(
                    title: 'Store Front Photos & Kitchen Area',
                    value: _includeBusinessPhotos,
                    onChanged: (v) => setState(() => _includeBusinessPhotos = v),
                  ),
                  _buildToggleRow(
                    title: 'VAT Registration Certificate',
                    value: _includeVAT,
                    onChanged: (v) => setState(() => _includeVAT = v),
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
                label: 'Continue to Step 5',
                onPressed: _onContinue,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUploadBox({
    required String title,
    required String subtitle,
    required String? fileName,
    required VoidCallback? onTap,
  }) {
    final uploaded = fileName != null;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: uploaded ? AppColors.success : AppColors.border,
            width: uploaded ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: (uploaded ? AppColors.success : AppColors.primary).withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                uploaded ? LucideIcons.fileCheck : LucideIcons.uploadCloud,
                color: uploaded ? AppColors.success : AppColors.primary,
                size: 20,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: AppTextStyles.heading3.copyWith(fontSize: 14)),
                  const SizedBox(height: 2),
                  Text(
                    uploaded ? fileName : subtitle,
                    style: AppTextStyles.bodyTextSmall.copyWith(
                      color: uploaded ? AppColors.success : AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              uploaded ? LucideIcons.check : LucideIcons.chevronRight,
              color: uploaded ? AppColors.success : AppColors.textSecondary,
              size: 18,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildToggleRow({
    required String title,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(child: Text(title, style: AppTextStyles.bodyTextSmall)),
          Switch.adaptive(
            value: value,
            activeColor: AppColors.primary,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }
}
