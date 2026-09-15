import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/auth/registration_form.dart';

/// Registration form state provider
/// Manages the entire 5-step registration flow
class RegistrationNotifier extends Notifier<RegistrationForm> {
  @override
  RegistrationForm build() => RegistrationForm();

  /// Update a single field in the form
  void updateField(String field, dynamic value) {
    switch (field) {
      // Step 1
      case 'businessType':
        state = state.copyWith(businessType: value as String);
        break;

      // Step 2
      case 'businessName':
        state = state.copyWith(businessName: value as String);
        break;
      case 'businessDescription':
        state = state.copyWith(businessDescription: value as String);
        break;
      case 'businessPhone':
        state = state.copyWith(businessPhone: value as String);
        break;
      case 'businessEmail':
        state = state.copyWith(businessEmail: value as String);
        break;
      case 'region':
        state = state.copyWith(region: value as String);
        break;
      case 'city':
        state = state.copyWith(city: value as String);
        break;
      case 'streetAddress':
        state = state.copyWith(streetAddress: value as String);
        break;
      case 'landmark':
        state = state.copyWith(landmark: value as String);
        break;
      case 'digitalAddress':
        state = state.copyWith(digitalAddress: value as String);
        break;
      case 'workplaceLat':
        state = state.copyWith(workplaceLat: value as double?);
        break;
      case 'workplaceLng':
        state = state.copyWith(workplaceLng: value as double?);
        break;
      case 'workplaceAccuracy':
        state = state.copyWith(workplaceAccuracy: value as double?);
        break;
      case 'isMockLocation':
        state = state.copyWith(isMockLocation: value as bool);
        break;

      // Step 3
      case 'ownerName':
        state = state.copyWith(ownerName: value as String);
        break;
      case 'ownerRole':
        state = state.copyWith(ownerRole: value as String);
        break;
      case 'ownerPhone':
        state = state.copyWith(ownerPhone: value as String);
        break;
      case 'ownerEmail':
        state = state.copyWith(ownerEmail: value as String);
        break;
      case 'ghanaCardNumber':
        state = state.copyWith(ghanaCardNumber: value as String);
        break;
      case 'identityVerified':
        state = state.copyWith(identityVerified: value as bool);
        break;
      case 'smileIdLivenessPassed':
        state = state.copyWith(smileIdLivenessPassed: value as bool);
        break;

      // Step 4
      case 'registrationNumber':
        state = state.copyWith(registrationNumber: value as String);
        break;
      case 'businessRegistrationDoc':
        state = state.copyWith(businessRegistrationDoc: value as String?);
        break;
      case 'documentFrontBase64':
        state = state.copyWith(documentFrontBase64: value as String?);
        break;
      case 'documentBackBase64':
        state = state.copyWith(documentBackBase64: value as String?);
        break;
      case 'documentFrontName':
        state = state.copyWith(documentFrontName: value as String?);
        break;
      case 'documentBackName':
        state = state.copyWith(documentBackName: value as String?);
        break;
      case 'selfieBase64':
        state = state.copyWith(selfieBase64: value as String?);
        break;
      case 'angleImagesBase64':
        state = state.copyWith(angleImagesBase64: List<String>.from(value as List));
        break;
      case 'taxIdentificationNumber':
        state = state.copyWith(taxIdentificationNumber: value as String?);
        break;
      case 'ownerIdDocument':
        state = state.copyWith(ownerIdDocument: value as String?);
        break;
      case 'businessPermit':
        state = state.copyWith(businessPermit: value as String?);
        break;
      case 'documentsUploaded':
        state = state.copyWith(documentsUploaded: value as bool);
        break;

      // Step 5
      case 'payoutType':
        state = state.copyWith(payoutType: value as String);
        break;
      case 'providerName':
        state = state.copyWith(providerName: value as String);
        break;
      case 'accountNumber':
        state = state.copyWith(accountNumber: value as String);
        break;
      case 'accountName':
        state = state.copyWith(accountName: value as String);
        break;
      case 'bankDetailsVerified':
        state = state.copyWith(bankDetailsVerified: value as bool);
        break;
      case 'acceptedPaymentTerms':
        state = state.copyWith(acceptedPaymentTerms: value as bool);
        break;
    }
  }

  /// Hydrate non-sensitive fields from the authoritative backend draft so a
  /// Vendor can resume after an app restart. Binary/KYC bytes are never
  /// persisted in application JSON and must be selected again before submit.
  void hydrateFromApplication(Map<String, dynamic> stageData) {
    final stage1 = _asMap(stageData['stage1']);
    final stage2 = _asMap(stageData['stage2']);
    final address = _asMap(stage2['displayAddress']);
    final gps = _asMap(stage2['workplaceGps']);
    final stage3 = _asMap(stageData['stage3']);
    final stage4 = _asMap(stageData['stage4']);
    final stage5 = _asMap(stageData['stage5']);
    final payout = _asMap(stage5['payout']);
    final type = _vendorTypeFromApi(stage1['vendorType']?.toString());
    state = state.copyWith(
      businessType: type ?? state.businessType,
      businessName: stage2['businessName'] is String ? stage2['businessName'] as String : state.businessName,
      businessDescription: stage2['description'] is String ? stage2['description'] as String : state.businessDescription,
      businessPhone: stage2['businessPhone'] is String ? stage2['businessPhone'] as String : state.businessPhone,
      businessEmail: stage2['businessEmail'] is String ? stage2['businessEmail'] as String : state.businessEmail,
      region: address['region'] is String ? address['region'] as String : state.region,
      city: address['city'] is String ? address['city'] as String : state.city,
      streetAddress: address['streetAddress'] is String ? address['streetAddress'] as String : state.streetAddress,
      landmark: address['landmark'] is String ? address['landmark'] as String : state.landmark,
      digitalAddress: address['digitalAddress'] is String ? address['digitalAddress'] as String : state.digitalAddress,
      workplaceLat: gps['lat'] is num ? (gps['lat'] as num).toDouble() : state.workplaceLat,
      workplaceLng: gps['lng'] is num ? (gps['lng'] as num).toDouble() : state.workplaceLng,
      workplaceAccuracy: gps['accuracy'] is num ? (gps['accuracy'] as num).toDouble() : state.workplaceAccuracy,
      ownerName: stage3['ownerName'] is String ? stage3['ownerName'] as String : state.ownerName,
      ownerRole: stage3['ownerRole'] is String ? stage3['ownerRole'] as String : state.ownerRole,
      ownerPhone: stage3['ownerPhone'] is String ? stage3['ownerPhone'] as String : state.ownerPhone,
      ownerEmail: stage3['ownerEmail'] is String ? stage3['ownerEmail'] as String : state.ownerEmail,
      ghanaCardNumber: stage3['ghanaCardNumber'] is String ? stage3['ghanaCardNumber'] as String : state.ghanaCardNumber,
      registrationNumber: stage4['registrationNumber'] is String ? stage4['registrationNumber'] as String : state.registrationNumber,
      businessRegistrationDoc: stage4['businessRegDocKey'] is String ? stage4['businessRegDocKey'] as String : state.businessRegistrationDoc,
      documentsUploaded: stage4['businessRegDocKey'] is String,
      payoutType: payout['type'] is String ? payout['type'] as String : state.payoutType,
      providerName: payout['provider'] is String ? payout['provider'] as String : state.providerName,
      accountNumber: payout['accountNumber'] is String ? payout['accountNumber'] as String : state.accountNumber,
      accountName: payout['accountName'] is String ? payout['accountName'] as String : state.accountName,
      acceptedPaymentTerms: stage5['acceptedTerms'] == true,
    );
  }

  /// Reset the form
  void reset() {
    state = RegistrationForm();
  }

  /// Submit the registration
  Future<bool> submit() async {
    // Network submission is performed by the stage-specific onboarding
    // repository calls. This method only reports local form completeness.
    return state.isComplete();
  }
}

/// Provider for registration state
final registrationProvider =
    NotifierProvider<RegistrationNotifier, RegistrationForm>(
  () => RegistrationNotifier(),
);

/// Current step provider
class _StepNotifier extends Notifier<int> {
  @override
  int build() => 1;

  void setStep(int step) => state = step;
  void nextStep() => state++;
  void prevStep() => state = (state > 1) ? state - 1 : 1;
}

final registrationStepProvider =
    NotifierProvider<_StepNotifier, int>(() => _StepNotifier());

Map<String, dynamic> _asMap(Object? value) => value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};

String? _vendorTypeFromApi(String? value) {
  switch (value?.toUpperCase()) {
    case 'FOOD':
      return 'food';
    case 'GROCERY':
    case 'GROCERIES':
      return 'groceries';
    case 'MARKET':
      return 'market';
    case 'PHARMACY':
      return 'pharmacy';
    case 'SHOP':
      return 'shop';
    case 'LAUNDRY':
      return 'laundry';
    default:
      return null;
  }
}
