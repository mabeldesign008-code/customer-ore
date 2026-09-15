import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
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
import '../../widgets/onboarding/location_preview.dart';
import '../../providers/vendor_data_provider.dart';
import 'owner_information_screen.dart';

class BusinessInformationScreen extends ConsumerStatefulWidget {
  const BusinessInformationScreen({super.key});

  @override
  ConsumerState<BusinessInformationScreen> createState() => _BusinessInformationScreenState();
}

class _BusinessInformationScreenState extends ConsumerState<BusinessInformationScreen> {
  final _formKey = GlobalKey<FormBuilderState>();
  bool _gpsAutoDetected = false;
  double? _gpsLat;
  double? _gpsLng;
  double? _gpsAccuracy;
  bool _isDetectingGps = false;

  Future<void> _detectWorkplaceGps() async {
    HapticFeedback.lightImpact();
    setState(() => _isDetectingGps = true);
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        throw StateError('Location services are disabled');
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        throw StateError('Location permission is required for workplace verification');
      }
      final position = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      if (!mounted) return;
      setState(() {
        _gpsAutoDetected = true;
        _gpsLat = position.latitude;
        _gpsLng = position.longitude;
        _gpsAccuracy = position.accuracy;
      });
      OreToast.show(context, message: 'Workplace GPS locked', type: ToastType.success);
    } catch (error) {
      if (mounted) OreToast.show(context, message: error.toString(), type: ToastType.error);
    } finally {
      if (mounted) setState(() => _isDetectingGps = false);
    }
  }

  Future<void> _onContinue() async {
    if (!_gpsAutoDetected || _gpsLat == null || _gpsLng == null || _gpsAccuracy == null) {
      OreToast.show(
        context,
        message: 'Mandatory Workplace Check: You must auto-detect your location while at the store',
        type: ToastType.error,
      );
      return;
    }

    if (!(_formKey.currentState?.saveAndValidate() ?? false)) return;
    final values = _formKey.currentState!.value;
    try {
      await ref.read(vendorOnboardingRepositoryProvider).saveStage(2, <String, dynamic>{
        'businessName': values['businessName'],
        'description': values['businessDescription'],
        'businessPhone': _normalizePhone(values['businessPhone']?.toString() ?? ''),
        'businessEmail': values['businessEmail'],
        'displayAddress': <String, String>{
          'region': values['region']?.toString() ?? 'Central Region',
          'city': values['city']?.toString() ?? 'Cape Coast',
          'streetAddress': values['streetAddress']?.toString() ?? '',
          'landmark': values['landmark']?.toString() ?? '',
          'digitalAddress': values['digitalAddress']?.toString() ?? '',
        },
        'workplaceGps': <String, dynamic>{
          'lat': _gpsLat,
          'lng': _gpsLng,
          'accuracy': _gpsAccuracy,
          'isMock': false,
        },
      });
      if (!mounted) return;
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const OwnerInformationScreen()));
    } catch (_) {
      if (mounted) OreToast.show(context, message: 'Unable to save business information', type: ToastType.error);
    }
  }

  String _normalizePhone(String value) {
    final compact = value.replaceAll(RegExp(r'\s+'), '');
    if (compact.startsWith('+')) return compact;
    if (compact.startsWith('0')) return '+233${compact.substring(1)}';
    if (compact.startsWith('233')) return '+$compact';
    return '+233$compact';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(100),
        child: TopBar(
          title: 'Vendor Registration',
          step: 2,
          total: 5,
          onBack: () {
            if (context.canPop()) {
              context.pop();
            }
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
                  top: 24,
                  bottom: 32,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Business Information', style: AppTextStyles.heading2),
                        IconButton(tooltip: 'Action', 
                          icon: const Icon(LucideIcons.headset, color: AppColors.primary),
                          onPressed: () => OreSupportModal.show(context, title: 'Store Setup Support'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Basic Info Fields
                    const CustomTextField(
                      name: 'businessName',
                      label: 'Business Name',
                      hintText: 'e.g., Cape Coast Kitchen',
                    ),
                    const SizedBox(height: 16),

                    const CustomTextField(
                      name: 'businessDescription',
                      label: 'Business Description',
                      hintText: 'Tell us about your services and menu...',
                      maxLines: 4,
                      maxLength: 200,
                    ),
                    const SizedBox(height: 16),

                    const CustomTextField(
                      name: 'businessPhone',
                      label: 'Business Phone',
                      hintText: '20 123 4567',
                      prefixText: '+233',
                      keyboardType: TextInputType.phone,
                    ),
                    const SizedBox(height: 16),

                    const CustomTextField(
                      name: 'businessEmail',
                      label: 'Business Email',
                      hintText: 'contact@business.com',
                      keyboardType: TextInputType.emailAddress,
                    ),

                    const SizedBox(height: 24),

                    // Display Address Section
                    Text('Business Display Address', style: AppTextStyles.heading3),
                    const SizedBox(height: 16),

                    Row(
                      children: [
                        Expanded(
                          child: CustomDropdownField<String>(
                            name: 'region',
                            label: 'Region',
                            hintText: 'Central Region',
                            items: const [
                              DropdownMenuItem(value: 'Central Region', child: Text('Central Region')),
                              DropdownMenuItem(value: 'Greater Accra', child: Text('Greater Accra')),
                              DropdownMenuItem(value: 'Ashanti', child: Text('Ashanti')),
                            ],
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: CustomDropdownField<String>(
                            name: 'city',
                            label: 'City / Town',
                            hintText: 'Cape Coast',
                            items: const [
                              DropdownMenuItem(value: 'Cape Coast', child: Text('Cape Coast')),
                              DropdownMenuItem(value: 'Elmina', child: Text('Elmina')),
                              DropdownMenuItem(value: 'Accra', child: Text('Accra')),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    const CustomTextField(
                      name: 'streetAddress',
                      label: 'Street Address',
                      hintText: 'e.g. Commercial Street, Kotokuraba',
                    ),
                    const SizedBox(height: 16),

                    const CustomTextField(
                      name: 'landmark',
                      label: 'Landmark',
                      hintText: 'Near Cape Coast Castle / UCC Old Site',
                    ),
                    const SizedBox(height: 16),

                    const CustomTextField(
                      name: 'digitalAddress',
                      label: 'Digital Address (GhanaPost GPS)',
                      hintText: 'CC-001-2345',
                    ),
                    const SizedBox(height: 28),

                    // Dedicated Workplace GPS Auto-Detect Card (Mandatory Architecture)
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(
                          color: _gpsAutoDetected ? AppColors.success : AppColors.primary,
                          width: 1.5,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.04),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: (_gpsAutoDetected ? AppColors.success : AppColors.primary).withOpacity(0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  _gpsAutoDetected ? LucideIcons.mapPinCheck : LucideIcons.radar,
                                  color: _gpsAutoDetected ? AppColors.success : AppColors.primary,
                                  size: 22,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Workplace GPS Verification', style: AppTextStyles.heading3),
                                    Text(
                                      'Auto-detect only • Mock location blocked',
                                      style: AppTextStyles.bodyTextSmall.copyWith(color: AppColors.textSecondary),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          Text(
                            'To prevent fake store registrations, you must be physically present at the store location. Manual entry or pin-dropping is strictly disabled.',
                            style: AppTextStyles.bodyTextSmall,
                          ),
                          const SizedBox(height: 16),
                          if (_gpsAutoDetected) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                color: AppColors.success.withOpacity(0.08),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Row(
                                children: [
                                  const Icon(LucideIcons.shieldCheck, color: AppColors.success, size: 16),
                                  const SizedBox(width: 8),
                                  Text(
                                    'GPS Verified: ${_gpsLat?.toStringAsFixed(4)}, ${_gpsLng?.toStringAsFixed(4)} (±${_gpsAccuracy?.toStringAsFixed(1)}m)',
                                    style: AppTextStyles.bodyTextSmall.copyWith(
                                      color: AppColors.success,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 12),
                          ],
                          OutlinedButton.icon(
                            onPressed: _isDetectingGps ? null : _detectWorkplaceGps,
                            icon: _isDetectingGps
                                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                                : const Icon(LucideIcons.locateFixed, size: 18),
                            label: Text(_gpsAutoDetected ? 'Re-detect Workplace GPS' : 'Auto-detect Workplace GPS'),
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
                    const SizedBox(height: 20),
                    LocationPreview(latitude: _gpsLat, longitude: _gpsLng),
                  ],
                ),
              ),
            ),

            // Sticky Footer
            Container(
              decoration: const BoxDecoration(
                color: AppColors.background,
                border: Border(
                  top: BorderSide(color: AppColors.border),
                ),
              ),
              padding: const EdgeInsets.only(
                left: 16,
                right: 16,
                top: 17,
                bottom: 16,
              ),
              child: SafeArea(
                top: false,
                child: PrimaryButton(
                  label: 'Continue to Step 3',
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
