/// Vendor Registration Form Model matching Ore Architecture Spec Section 4.
class RegistrationForm {
  // Step 1: Business Type
  String businessType;

  // Step 2: Business Info & Strict Workplace GPS
  String businessName;
  String businessDescription;
  String businessPhone;
  String businessEmail;
  String region;
  String city;
  String streetAddress;
  String landmark;
  String digitalAddress;
  double? workplaceLat;
  double? workplaceLng;
  double? workplaceAccuracy;
  bool isMockLocation;

  // Step 3: Owner Information & Smile ID
  String ownerName;
  String ownerRole;
  String ownerPhone;
  String ownerEmail;
  String ghanaCardNumber;
  bool identityVerified;
  bool smileIdLivenessPassed;

  // Step 4: Business Documents
  String registrationNumber;
  String? businessRegistrationDoc;
  String? documentFrontBase64;
  String? documentBackBase64;
  String? documentFrontName;
  String? documentBackName;

  // SmileID biometric capture retained until final asynchronous submission
  String? selfieBase64;
  List<String> angleImagesBase64;
  String? taxIdentificationNumber;
  String? ownerIdDocument;
  String? businessPermit;
  bool documentsUploaded;

  // Step 5: Payout Setup & Payment Terms
  String payoutType; // MOMO or BANK
  String providerName; // MTN, Telecel, AT or Bank Name
  String accountNumber;
  String accountName;
  bool bankDetailsVerified;
  bool acceptedPaymentTerms;

  RegistrationForm({
    this.businessType = 'food',
    this.businessName = '',
    this.businessDescription = '',
    this.businessPhone = '',
    this.businessEmail = '',
    this.region = 'Central Region',
    this.city = 'Cape Coast',
    this.streetAddress = '',
    this.landmark = '',
    this.digitalAddress = '',
    this.workplaceLat,
    this.workplaceLng,
    this.workplaceAccuracy,
    this.isMockLocation = false,
    this.ownerName = '',
    this.ownerRole = 'Store Owner',
    this.ownerPhone = '',
    this.ownerEmail = '',
    this.ghanaCardNumber = '',
    this.identityVerified = false,
    this.smileIdLivenessPassed = false,
    this.registrationNumber = '',
    this.businessRegistrationDoc,
    this.documentFrontBase64,
    this.documentBackBase64,
    this.documentFrontName,
    this.documentBackName,
    this.selfieBase64,
    this.angleImagesBase64 = const <String>[],
    this.taxIdentificationNumber,
    this.ownerIdDocument,
    this.businessPermit,
    this.documentsUploaded = false,
    this.payoutType = 'MOMO',
    this.providerName = 'MTN',
    this.accountNumber = '',
    this.accountName = '',
    this.bankDetailsVerified = false,
    this.acceptedPaymentTerms = false,
  });

  RegistrationForm copyWith({
    String? businessType,
    String? businessName,
    String? businessDescription,
    String? businessPhone,
    String? businessEmail,
    String? region,
    String? city,
    String? streetAddress,
    String? landmark,
    String? digitalAddress,
    double? workplaceLat,
    double? workplaceLng,
    double? workplaceAccuracy,
    bool? isMockLocation,
    String? ownerName,
    String? ownerRole,
    String? ownerPhone,
    String? ownerEmail,
    String? ghanaCardNumber,
    bool? identityVerified,
    bool? smileIdLivenessPassed,
    String? registrationNumber,
    String? businessRegistrationDoc,
    String? documentFrontBase64,
    String? documentBackBase64,
    String? documentFrontName,
    String? documentBackName,
    String? selfieBase64,
    List<String>? angleImagesBase64,
    String? taxIdentificationNumber,
    String? ownerIdDocument,
    String? businessPermit,
    bool? documentsUploaded,
    String? payoutType,
    String? providerName,
    String? accountNumber,
    String? accountName,
    bool? bankDetailsVerified,
    bool? acceptedPaymentTerms,
  }) {
    return RegistrationForm(
      businessType: businessType ?? this.businessType,
      businessName: businessName ?? this.businessName,
      businessDescription: businessDescription ?? this.businessDescription,
      businessPhone: businessPhone ?? this.businessPhone,
      businessEmail: businessEmail ?? this.businessEmail,
      region: region ?? this.region,
      city: city ?? this.city,
      streetAddress: streetAddress ?? this.streetAddress,
      landmark: landmark ?? this.landmark,
      digitalAddress: digitalAddress ?? this.digitalAddress,
      workplaceLat: workplaceLat ?? this.workplaceLat,
      workplaceLng: workplaceLng ?? this.workplaceLng,
      workplaceAccuracy: workplaceAccuracy ?? this.workplaceAccuracy,
      isMockLocation: isMockLocation ?? this.isMockLocation,
      ownerName: ownerName ?? this.ownerName,
      ownerRole: ownerRole ?? this.ownerRole,
      ownerPhone: ownerPhone ?? this.ownerPhone,
      ownerEmail: ownerEmail ?? this.ownerEmail,
      ghanaCardNumber: ghanaCardNumber ?? this.ghanaCardNumber,
      identityVerified: identityVerified ?? this.identityVerified,
      smileIdLivenessPassed: smileIdLivenessPassed ?? this.smileIdLivenessPassed,
      registrationNumber: registrationNumber ?? this.registrationNumber,
      businessRegistrationDoc: businessRegistrationDoc ?? this.businessRegistrationDoc,
      documentFrontBase64: documentFrontBase64 ?? this.documentFrontBase64,
      documentBackBase64: documentBackBase64 ?? this.documentBackBase64,
      documentFrontName: documentFrontName ?? this.documentFrontName,
      documentBackName: documentBackName ?? this.documentBackName,
      selfieBase64: selfieBase64 ?? this.selfieBase64,
      angleImagesBase64: angleImagesBase64 ?? this.angleImagesBase64,
      taxIdentificationNumber: taxIdentificationNumber ?? this.taxIdentificationNumber,
      ownerIdDocument: ownerIdDocument ?? this.ownerIdDocument,
      businessPermit: businessPermit ?? this.businessPermit,
      documentsUploaded: documentsUploaded ?? this.documentsUploaded,
      payoutType: payoutType ?? this.payoutType,
      providerName: providerName ?? this.providerName,
      accountNumber: accountNumber ?? this.accountNumber,
      accountName: accountName ?? this.accountName,
      bankDetailsVerified: bankDetailsVerified ?? this.bankDetailsVerified,
      acceptedPaymentTerms: acceptedPaymentTerms ?? this.acceptedPaymentTerms,
    );
  }

  bool isStep1Valid() => businessType.isNotEmpty;

  bool isStep2Valid() =>
      businessName.trim().length >= 3 &&
      businessDescription.trim().length >= 5 &&
      digitalAddress.trim().isNotEmpty &&
      workplaceLat != null &&
      workplaceLng != null &&
      !isMockLocation;

  bool isStep3Valid() =>
      ownerName.trim().isNotEmpty &&
      ownerPhone.trim().isNotEmpty &&
      ghanaCardNumber.trim().isNotEmpty &&
      smileIdLivenessPassed;

  bool isStep4Valid() => documentsUploaded && registrationNumber.trim().length >= 3;

  bool isStep5Valid() =>
      accountNumber.trim().isNotEmpty &&
      accountName.trim().isNotEmpty &&
      acceptedPaymentTerms;

  bool isComplete() =>
      isStep1Valid() &&
      isStep2Valid() &&
      isStep3Valid() &&
      isStep4Valid() &&
      isStep5Valid();
}
