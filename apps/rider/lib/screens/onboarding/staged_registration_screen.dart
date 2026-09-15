import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart';
import '../../data/auth/rider_api_client_provider.dart';
import '../../data/onboarding/rider_onboarding_repository.dart';
import '../../providers/rider_provider.dart';

/// 4-Stage Gated Rider Onboarding Wizard matching Ore Architecture Spec Section 3.
class RiderStagedRegistrationScreen extends ConsumerStatefulWidget {
  const RiderStagedRegistrationScreen({super.key, this.initialStage = 1});

  final int initialStage;

  @override
  ConsumerState<RiderStagedRegistrationScreen> createState() => _RiderStagedRegistrationScreenState();
}

class _RiderStagedRegistrationScreenState extends ConsumerState<RiderStagedRegistrationScreen> {
  late int _currentStage;
  bool _loading = false;

  // Stage 1 Controllers
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _email = TextEditingController();
  final _dob = TextEditingController();
  String _gender = 'MALE';
  final _digitalAddress = TextEditingController(); // GhanaPostGPS
  final _street = TextEditingController();
  final _emergencyName = TextEditingController();
  final _emergencyPhone = TextEditingController();
  final _emergencyRel = TextEditingController();

  // Stage 2: Smile ID & Identity
  String _idType = 'GHANA_CARD';
  final _idNumber = TextEditingController();
  final ImagePicker _imagePicker = ImagePicker();
  XFile? _selfieFile;
  List<XFile> _livenessFiles = <XFile>[];
  bool _selfieCaptured = false;

  // Stage 3: Vehicle Docs
  final _ghanaCardNumber = TextEditingController();
  XFile? _documentFrontFile;
  XFile? _documentBackFile;
  bool _docFrontUploaded = false;
  bool _docBackUploaded = false;
  bool _licenseUploaded = false;

  // Stage 4: Vehicle Info & Payout
  String _vehicleType = 'MOTORBIKE';
  final _vehicleMake = TextEditingController();
  final _vehicleModel = TextEditingController();
  final _vehiclePlate = TextEditingController();
  String _payoutType = 'MOMO';
  String _momoProvider = 'MTN';
  final _payoutNumber = TextEditingController();
  final _payoutName = TextEditingController();
  bool _consentGranted = false;

  @override
  void initState() {
    super.initState();
    _currentStage = widget.initialStage;
  }

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _email.dispose();
    _dob.dispose();
    _digitalAddress.dispose();
    _street.dispose();
    _emergencyName.dispose();
    _emergencyPhone.dispose();
    _emergencyRel.dispose();
    _idNumber.dispose();
    _ghanaCardNumber.dispose();
    _vehicleMake.dispose();
    _vehicleModel.dispose();
    _vehiclePlate.dispose();
    _payoutNumber.dispose();
    _payoutName.dispose();
    super.dispose();
  }

  Future<void> _nextStage() async {
    HapticFeedback.lightImpact();

    if (_currentStage == 1) {
      setState(() => _loading = true);
      try {
        final application = await ref
            .read(riderOnboardingRepositoryProvider)
            .saveStage1(
              RiderStage1Input(
                firstName: _firstName.text,
                lastName: _lastName.text,
                dob: _dob.text,
                gender: _gender,
                email: _email.text,
                digitalAddress: _digitalAddress.text,
                streetLandmark: _street.text,
                emergencyName: _emergencyName.text,
                emergencyRelationship: _emergencyRel.text,
                emergencyPhone: _emergencyPhone.text,
              ),
            );
        if (!mounted) return;
        setState(() {
          _loading = false;
          _currentStage = application.currentStage.clamp(1, 4).toInt();
        });
        OreToast.show(
          context,
          message: 'Personal details saved',
          type: ToastType.success,
        );
      } on DioException catch (error) {
        _showOnboardingError(_networkErrorMessage(error));
      } on ArgumentError {
        _showOnboardingError('Enter a valid emergency phone number');
      } on FormatException {
        _showOnboardingError('The server returned an unexpected response');
      } catch (_) {
        _showOnboardingError('Unable to save your details. Please try again.');
      }
      return;
    }

    if (_currentStage == 2) {
      if (_selfieFile == null || _livenessFiles.length < 6) {
        _showOnboardingError('Capture the selfie and at least six liveness images first');
        return;
      }
      setState(() => _currentStage = 3);
      return;
    }

    if (_currentStage == 4) {
      await _submitDocumentVerification();
      return;
    }

    // Stage 3 document files and Stage 2 biometric files are submitted
    // together with Stage 4 data through the real verification endpoint.
    if (_currentStage == 3) {
      setState(() => _currentStage = 4);
    }
  }

  void _showOnboardingError(String message) {
    if (!mounted) return;
    setState(() => _loading = false);
    OreToast.show(context, message: message, type: ToastType.error);
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
      _ => 'Unable to save your details. Please try again.',
    };
  }

  Future<void> _captureBiometrics() async {
    if (_loading) return;
    setState(() {
      _loading = true;
      _selfieCaptured = false;
      _selfieFile = null;
      _livenessFiles = <XFile>[];
    });

    try {
      final selfie = await _imagePicker.pickImage(
        source: ImageSource.camera,
        imageQuality: 80,
        maxWidth: 1600,
      );
      if (selfie == null) {
        _showOnboardingError('Selfie capture cancelled');
        return;
      }
      final angles = <XFile>[];
      for (var index = 0; index < 6; index++) {
        final angle = await _imagePicker.pickImage(
          source: ImageSource.camera,
          imageQuality: 80,
          maxWidth: 1600,
        );
        if (angle == null) {
          _showOnboardingError('Facial angle capture cancelled');
          return;
        }
        angles.add(angle);
      }

      if (!mounted) return;
      setState(() {
        _loading = false;
        _selfieFile = selfie;
        _livenessFiles = angles;
        _selfieCaptured = true;
      });
      OreToast.show(
        context,
        message: 'Biometric images captured. Tap Continue to submit.',
        type: ToastType.success,
      );
    } catch (_) {
      _showOnboardingError('Unable to capture biometric images. Please try again.');
    }
  }

  Future<void> _pickDocument(String kind) async {
    if (_loading) return;
    setState(() => _loading = true);
    try {
      final file = await _imagePicker.pickImage(
        source: ImageSource.camera,
        imageQuality: 82,
        maxWidth: 1600,
      );
      if (file == null) {
        _showOnboardingError('Document capture cancelled');
        return;
      }
      if (!mounted) return;
      setState(() {
        switch (kind) {
          case 'ghana_card_front':
            _documentFrontFile = file;
            _docFrontUploaded = true;
            break;
          case 'ghana_card_back':
            _documentBackFile = file;
            _docBackUploaded = true;
            break;
          case 'license':
            _licenseUploaded = true;
            break;
        }
        _loading = false;
      });
      OreToast.show(
        context,
        message: 'Document captured',
        type: ToastType.success,
      );
    } catch (_) {
      _showOnboardingError('Unable to capture the document. Please try again.');
    }
  }

  Future<void> _submitDocumentVerification() async {
    final selfie = _selfieFile;
    final documentFront = _documentFrontFile;
    if (selfie == null || _livenessFiles.length < 6) {
      _showOnboardingError('Complete selfie and liveness capture first');
      return;
    }
    if (documentFront == null) {
      _showOnboardingError('Capture the Ghana Card front first');
      return;
    }
    if (!_consentGranted) {
      _showOnboardingError('Consent is required before verification');
      return;
    }

    setState(() => _loading = true);
    try {
      final rider = ref.read(riderAuthProvider).state.rider;
      final onboarding = ref.read(riderOnboardingRepositoryProvider);
      await onboarding.verifyPayout(
        type: _payoutType,
        provider: _momoProvider,
        accountNumber: _payoutNumber.text,
        accountName: _payoutName.text,
      );
      await onboarding.submitDocumentVerification(
            RiderDocumentVerificationInput(
              givenNames: _firstName.text,
              lastName: _lastName.text,
              email: _email.text,
              phoneNumber: rider?.phone,
              idType: _idType,
              // Stage 3 is the final document-review field. Use it as the
              // authoritative document number, with the biometric-stage value
              // retained only as a resume fallback for older drafts.
              idNumber: _ghanaCardNumber.text.trim().isNotEmpty
                  ? _ghanaCardNumber.text
                  : _idNumber.text,
              stage4: <String, dynamic>{
                'vehicleType': _vehicleType,
                'make': _vehicleMake.text,
                'model': _vehicleModel.text,
                'licensePlate': _vehiclePlate.text,
                'payout': <String, dynamic>{
                  'type': _payoutType,
                  'provider': _momoProvider,
                  'accountNumber': _payoutNumber.text,
                  'accountName': _payoutName.text,
                },
              },
              selfie: selfie,
              livenessImages: _livenessFiles,
              documentFront: documentFront,
              documentBack: _documentBackFile,
              consent: <String, dynamic>{
                'granted': true,
                'granted_at': DateTime.now().toUtc().toIso8601String(),
                'notice_language': 'EN',
              },
            ),
          );
      if (!mounted) return;
      setState(() => _loading = false);
      context.go('/application-status?status=PENDING_REVIEW');
    } on DioException catch (error) {
      _showOnboardingError(_networkErrorMessage(error));
    } on ArgumentError catch (error) {
      _showOnboardingError(error.message?.toString() ?? 'Verification data is incomplete');
    } on FormatException {
      _showOnboardingError('The server returned an unexpected response');
    } catch (_) {
      _showOnboardingError('Unable to submit verification. Please try again.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final progress = (_currentStage / 4);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(tooltip: 'Go back', 
          icon: const Icon(LucideIcons.arrowLeft, color: AppColors.textPrimary),
          onPressed: () {
            if (_currentStage > 1) {
              setState(() => _currentStage--);
            } else {
              context.pop();
            }
          },
        ),
        title: Column(
          children: [
            Text('Rider Registration', style: AppTypography.h3()),
            Text('Stage $_currentStage of 4 (${(progress * 100).round()}%)',
                style: AppTypography.caption(AppColors.primary)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.headset, color: AppColors.primary),
            tooltip: 'Support',
            onPressed: () => OreSupportModal.show(context, title: 'Rider Onboarding Support'),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(4),
          child: Semantics(
            label: 'Registration progress',
            value: '${(progress * 100).round()}%',
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: AppColors.border,
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
            ),
          ),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            child: _buildStageContent(),
          ),
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: OreButton(
          label: _currentStage == 4 ? 'Submit Application' : 'Continue to Stage ${_currentStage + 1}',
          isLoading: _loading,
          onPressed: _isStageValid() ? _nextStage : null,
        ),
      ),
    );
  }

  bool _isStageValid() {
    if (_currentStage == 1) {
      return _firstName.text.trim().isNotEmpty &&
          _lastName.text.trim().isNotEmpty &&
          _email.text.trim().isNotEmpty &&
          _dob.text.trim().isNotEmpty &&
          _digitalAddress.text.trim().isNotEmpty &&
          _street.text.trim().isNotEmpty &&
          _emergencyName.text.trim().isNotEmpty &&
          _emergencyRel.text.trim().isNotEmpty &&
          _emergencyPhone.text.trim().isNotEmpty;
    }
    if (_currentStage == 2) {
      return _selfieFile != null &&
          _livenessFiles.length >= 6 &&
          _idNumber.text.trim().isNotEmpty;
    }
    if (_currentStage == 3) {
      return _ghanaCardNumber.text.trim().isNotEmpty &&
          _documentFrontFile != null;
    }
    if (_currentStage == 4) {
      return _payoutNumber.text.trim().isNotEmpty &&
          _payoutName.text.trim().isNotEmpty &&
          _documentFrontFile != null &&
          _selfieFile != null &&
          _livenessFiles.length >= 6 &&
          _consentGranted;
    }
    return true;
  }

  Widget _buildStageContent() {
    switch (_currentStage) {
      case 1:
        return _buildStage1();
      case 2:
        return _buildStage2();
      case 3:
        return _buildStage3();
      case 4:
        return _buildStage4();
      default:
        return const SizedBox.shrink();
    }
  }

  // ── Stage 1: Personal Information (25%) ───────────────────────────
  Widget _buildStage1() {
    return Column(
      key: const ValueKey(1),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Personal Details', style: AppTypography.h2()),
        const SizedBox(height: 4),
        Text('Please provide your legal name and contact details (18+ required).',
            style: AppTypography.body(AppColors.textSecondary)),
        const SizedBox(height: 24),
        Row(
          children: [
            Expanded(
              child: _inputField(label: 'First Name', controller: _firstName, hint: 'e.g. Kwame'),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _inputField(label: 'Last Name', controller: _lastName, hint: 'e.g. Mensah'),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _inputField(label: 'Email Address', controller: _email, hint: 'kwame@example.com', keyboard: TextInputType.emailAddress),
        const SizedBox(height: 16),
        _inputField(label: 'Date of Birth (YYYY-MM-DD)', controller: _dob, hint: '2000-01-01'),
        const SizedBox(height: 16),
        Text('Gender', style: AppTypography.label()),
        const SizedBox(height: 8),
        Row(
          children: ['MALE', 'FEMALE'].map((g) {
            final selected = _gender == g;
            return Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: AnimatedPress(
                  onTap: () => setState(() => _gender = g),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(
                      color: selected ? AppColors.primary.withOpacity(0.08) : Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: selected ? AppColors.primary : AppColors.border, width: selected ? 2 : 1),
                    ),
                    alignment: Alignment.center,
                    child: Text(g, style: AppTypography.button(selected ? AppColors.primary : AppColors.textPrimary)),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 24),
        Text('Residential Address (Cape Coast)', style: AppTypography.h3()),
        const SizedBox(height: 12),
        _inputField(label: 'GhanaPostGPS Digital Address', controller: _digitalAddress, hint: 'e.g. CC-012-3456'),
        const SizedBox(height: 16),
        _inputField(label: 'Street / Landmark', controller: _street, hint: 'Near UCC Old Site Gate'),
        const SizedBox(height: 24),
        Text('Emergency Contact', style: AppTypography.h3()),
        const SizedBox(height: 12),
        _inputField(label: 'Contact Name', controller: _emergencyName, hint: 'Contact Full Name'),
        const SizedBox(height: 16),
        _inputField(label: 'Relationship', controller: _emergencyRel, hint: 'Next of Kin'),
        const SizedBox(height: 16),
        _inputField(label: 'Emergency Phone Number', controller: _emergencyPhone, hint: '024 123 4567', keyboard: TextInputType.phone),
      ],
    );
  }

  // ── Stage 2: Smile ID Identity & Liveness (50%) ───────────────────
  Widget _buildStage2() {
    return Column(
      key: const ValueKey(2),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Identity Verification', style: AppTypography.h2()),
        const SizedBox(height: 4),
        Text('Smile ID biometric verification. Capture 1 selfie and 6 facial angles.',
            style: AppTypography.body(AppColors.textSecondary)),
        const SizedBox(height: 24),
        Text('Identification Document', style: AppTypography.label()),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          value: _idType,
          items: const [
            DropdownMenuItem(value: 'GHANA_CARD', child: Text('Ghana Card (National ID)')),
            DropdownMenuItem(value: 'PASSPORT', child: Text('Ghanaian Passport')),
            DropdownMenuItem(value: 'DRIVERS_LICENSE', child: Text("Driver's License")),
          ],
          onChanged: (v) => setState(() => _idType = v!),
          decoration: InputDecoration(
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppColors.border)),
          ),
        ),
        const SizedBox(height: 16),
        _inputField(label: 'ID Number', controller: _idNumber, hint: 'GHA-000000000-0'),
        const SizedBox(height: 24),
        // Smile ID Liveness Capture Card
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: _selfieCaptured ? AppColors.success : AppColors.border, width: 1.5),
          ),
          child: Column(
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: (_selfieCaptured ? AppColors.success : AppColors.primary).withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  _selfieCaptured ? LucideIcons.checkCircle : LucideIcons.scanFace,
                  color: _selfieCaptured ? AppColors.success : AppColors.primary,
                  size: 40,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                _selfieCaptured ? 'Biometric Images Captured' : 'Smile ID Liveness Check',
                style: AppTypography.h3(),
              ),
              const SizedBox(height: 6),
              Text(
                _selfieCaptured
                    ? '1 selfie + 6 angle images are ready for server verification.'
                    : 'Requires good lighting. You will be prompted to turn your head left, right, up, and down.',
                textAlign: TextAlign.center,
                style: AppTypography.bodySmall(AppColors.textSecondary),
              ),
              const SizedBox(height: 20),
              OreButton.secondary(
                label: _selfieCaptured ? 'Recapture Biometrics' : 'Start Smile ID Liveness',
                isLoading: _loading,
                onPressed: _captureBiometrics,
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ── Stage 3: Vehicle & Rider Documents (75%) ──────────────────────
  Widget _buildStage3() {
    return Column(
      key: const ValueKey(3),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Document Uploads', style: AppTypography.h2()),
        const SizedBox(height: 4),
        Text('Upload clear, unexpired photos of your legal credentials.',
            style: AppTypography.body(AppColors.textSecondary)),
        const SizedBox(height: 24),
        _inputField(label: 'Ghana Card Pin', controller: _ghanaCardNumber, hint: 'GHA-712345678-9'),
        const SizedBox(height: 20),
        _documentUploadTile(
          title: 'Ghana Card (Front)',
          uploaded: _docFrontUploaded,
          onTap: () => _pickDocument('ghana_card_front'),
        ),
        const SizedBox(height: 12),
        _documentUploadTile(
          title: 'Ghana Card (Back)',
          uploaded: _docBackUploaded,
          onTap: () => _pickDocument('ghana_card_back'),
        ),
        const SizedBox(height: 12),
        _documentUploadTile(
          title: "Driver's License / Permit",
          uploaded: _licenseUploaded,
          onTap: () => _pickDocument('license'),
        ),
      ],
    );
  }

  // ── Stage 4: Vehicle Information & Payout Account (100%) ──────────
  Widget _buildStage4() {
    return Column(
      key: const ValueKey(4),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Vehicle & Payout', style: AppTypography.h2()),
        const SizedBox(height: 4),
        Text('Configure your delivery vehicle and Mobile Money / Bank payout account.',
            style: AppTypography.body(AppColors.textSecondary)),
        const SizedBox(height: 24),
        Text('Vehicle Type', style: AppTypography.label()),
        const SizedBox(height: 8),
        Row(
          children: ['BICYCLE', 'MOTORBIKE', 'CAR'].map((v) {
            final selected = _vehicleType == v;
            return Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: AnimatedPress(
                  onTap: () => setState(() => _vehicleType = v),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: selected ? AppColors.primary.withOpacity(0.08) : Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: selected ? AppColors.primary : AppColors.border, width: selected ? 2 : 1),
                    ),
                    alignment: Alignment.center,
                    child: Text(v, style: AppTypography.caption(selected ? AppColors.primary : AppColors.textPrimary)),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 16),
        _inputField(label: 'Make & Model', controller: _vehicleMake, hint: 'e.g. Royal 150cc'),
        const SizedBox(height: 16),
        _inputField(label: 'License Plate Number', controller: _vehiclePlate, hint: 'e.g. CR 1234-24'),
        const SizedBox(height: 24),
        Text('Payout Account', style: AppTypography.h3()),
        const SizedBox(height: 12),
        Row(
          children: const [
            {'label': 'MTN', 'code': 'MTN'},
            {'label': 'Telecel', 'code': 'VOD'},
            {'label': 'ATMoney', 'code': 'ATL'},
          ].map((provider) {
            final code = provider['code']!;
            final selected = _momoProvider == code;
            return Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: AnimatedPress(
                  onTap: () => setState(() => _momoProvider = code),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: selected ? AppColors.primary.withOpacity(0.08) : Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: selected ? AppColors.primary : AppColors.border),
                    ),
                    alignment: Alignment.center,
                    child: Text(provider['label']!, style: AppTypography.button(selected ? AppColors.primary : AppColors.textPrimary)),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 16),
        _inputField(label: 'MoMo Number', controller: _payoutNumber, hint: '024 123 4567', keyboard: TextInputType.phone),
        const SizedBox(height: 16),
        _inputField(label: 'Account Name (Must match your ID)', controller: _payoutName, hint: 'Kwame Mensah'),
        const SizedBox(height: 16),
        CheckboxListTile(
          value: _consentGranted,
          onChanged: (value) => setState(() => _consentGranted = value ?? false),
          contentPadding: EdgeInsets.zero,
          controlAffinity: ListTileControlAffinity.leading,
          title: const Text('I consent to SmileID document and biometric verification.'),
        ),
      ],
    );
  }

  Widget _inputField({
    required String label,
    required TextEditingController controller,
    required String hint,
    TextInputType keyboard = TextInputType.text,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTypography.label()),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          keyboardType: keyboard,
          onChanged: (_) => setState(() {}),
          decoration: InputDecoration(
            hintText: hint,
            filled: true,
            fillColor: Colors.white,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppColors.border)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppColors.border)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppColors.primary, width: 2)),
          ),
        ),
      ],
    );
  }

  Widget _documentUploadTile({required String title, required bool uploaded, required VoidCallback onTap}) {
    return AnimatedPress(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: uploaded ? AppColors.success : AppColors.border),
        ),
        child: Row(
          children: [
            Icon(uploaded ? LucideIcons.fileCheck : LucideIcons.uploadCloud, color: uploaded ? AppColors.success : AppColors.primary),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: AppTypography.button(AppColors.textPrimary)),
                  Text(uploaded ? 'Ready for verification' : 'Tap to capture / upload',
                      style: AppTypography.caption(uploaded ? AppColors.success : AppColors.textSecondary)),
                ],
              ),
            ),
            Icon(uploaded ? LucideIcons.check : LucideIcons.camera, color: uploaded ? AppColors.success : AppColors.textMuted, size: 20),
          ],
        ),
      ),
    );
  }
}
