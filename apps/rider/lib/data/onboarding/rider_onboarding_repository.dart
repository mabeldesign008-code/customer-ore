import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';
import 'package:ore_core/ore_core.dart';

/// Stage 1 personal and contact information sent to the onboarding service.
class RiderStage1Input {
  const RiderStage1Input({
    required this.firstName,
    required this.lastName,
    required this.dob,
    required this.gender,
    required this.email,
    required this.digitalAddress,
    required this.streetLandmark,
    required this.emergencyName,
    required this.emergencyRelationship,
    required this.emergencyPhone,
    this.region = 'Central Region',
    this.city = 'Cape Coast',
  });

  final String firstName;
  final String lastName;
  final String dob;
  final String gender;
  final String email;
  final String region;
  final String city;
  final String digitalAddress;
  final String streetLandmark;
  final String emergencyName;
  final String emergencyRelationship;
  final String emergencyPhone;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'firstName': firstName.trim(),
      'lastName': lastName.trim(),
      'dob': dob.trim(),
      'gender': gender,
      'email': email.trim(),
      'residentialAddress': <String, String>{
        'region': region.trim(),
        'city': city.trim(),
        'digitalAddress': digitalAddress.trim(),
        'streetLandmark': streetLandmark.trim(),
      },
      'emergencyContact': <String, String>{
        'name': emergencyName.trim(),
        'relationship': emergencyRelationship.trim(),
        'phone': _normalizeGhanaPhone(emergencyPhone),
      },
    };
  }
}

/// Stage 2 identity and liveness payload sent to the onboarding service.
class RiderStage2Input {
  const RiderStage2Input({
    required this.idType,
    required this.idNumber,
    required this.selfieBase64,
    required this.angleImagesBase64,
  });

  final String idType;
  final String idNumber;
  final String selfieBase64;
  final List<String> angleImagesBase64;

  Map<String, dynamic> toJson() {
    if (idNumber.trim().length < 4) {
      throw ArgumentError.value(
        idNumber,
        'idNumber',
        'Identification number must contain at least 4 characters',
      );
    }
    if (selfieBase64.length < 100) {
      throw ArgumentError.value(
        selfieBase64,
        'selfieBase64',
        'Selfie payload is too small to submit',
      );
    }
    if (angleImagesBase64.length < 4 || angleImagesBase64.length > 6) {
      throw ArgumentError.value(
        angleImagesBase64,
        'angleImagesBase64',
        'Submit between 4 and 6 angle images',
      );
    }

    return <String, dynamic>{
      'idType': idType,
      'idNumber': idNumber.trim(),
      'selfieBase64': selfieBase64,
      'angleImagesBase64': List<String>.of(angleImagesBase64),
    };
  }
}

/// Multipart input for the project-owner-provided SmileID flow.
class RiderDocumentVerificationInput {
  const RiderDocumentVerificationInput({
    required this.givenNames,
    required this.lastName,
    required this.email,
    required this.phoneNumber,
    required this.idType,
    required this.idNumber,
    required this.stage4,
    required this.selfie,
    required this.livenessImages,
    required this.documentFront,
    required this.consent,
    this.documentBack,
  });

  final String givenNames;
  final String lastName;
  final String? email;
  final String? phoneNumber;
  final String idType;
  final String idNumber;
  final Map<String, dynamic> stage4;
  final XFile selfie;
  final List<XFile> livenessImages;
  final XFile documentFront;
  final XFile? documentBack;
  final Map<String, dynamic> consent;
}

/// Accepted SmileID submission returned by the Ore onboarding service.
class RiderDocumentSubmissionResult {
  const RiderDocumentSubmissionResult({
    required this.applicationId,
    required this.jobId,
    required this.userId,
    required this.status,
    this.message,
    this.createdAt,
    this.callbackUrl,
  });

  final String applicationId;
  final String jobId;
  final String userId;
  final String status;
  final String? message;
  final DateTime? createdAt;
  final String? callbackUrl;

  factory RiderDocumentSubmissionResult.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('SmileID submission must be a JSON object');
    }
    return RiderDocumentSubmissionResult(
      applicationId: _requiredString(json['applicationId'], 'applicationId'),
      jobId: _requiredString(json['jobId'], 'jobId'),
      userId: _requiredString(json['userId'], 'userId'),
      status: _requiredString(json['status'], 'status'),
      message: _optionalString(json['message']),
      createdAt: _optionalDateTime(json['createdAt']),
      callbackUrl: _optionalString(json['callbackUrl']),
    );
  }
}

/// Smile verification state exposed by the onboarding status endpoint.
class RiderSmileVerificationStatus {
  const RiderSmileVerificationStatus({
    required this.jobId,
    required this.status,
    this.providerUserId,
    this.reason,
    this.message,
    this.submittedAt,
    this.completedAt,
  });

  final String jobId;
  final String status;
  final String? providerUserId;
  final String? reason;
  final String? message;
  final DateTime? submittedAt;
  final DateTime? completedAt;

  factory RiderSmileVerificationStatus.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Smile verification status must be a JSON object');
    }

    return RiderSmileVerificationStatus(
      jobId: _requiredString(json['jobId'], 'smileVerification.jobId'),
      status: _requiredString(json['status'], 'smileVerification.status'),
      providerUserId: _optionalString(json['providerUserId']),
      reason: _optionalString(json['reason']),
      message: _optionalString(json['message']),
      submittedAt: _optionalDateTime(json['submittedAt']),
      completedAt: _optionalDateTime(json['completedAt']),
    );
  }
}

/// Persisted rider application summary returned by onboarding endpoints.
class RiderApplication {
  const RiderApplication({
    required this.id,
    required this.kind,
    required this.status,
    required this.currentStage,
    required this.maxStages,
    this.applicantName,
    this.publicId,
    this.reason,
    this.requiresActionField,
    this.smileVerification,
  });

  final String id;
  final String kind;
  final String status;
  final int currentStage;
  final int maxStages;
  final String? applicantName;
  final String? publicId;
  final String? reason;
  final String? requiresActionField;
  final RiderSmileVerificationStatus? smileVerification;

  factory RiderApplication.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Rider application must be a JSON object');
    }

    final currentStage = json['currentStage'];
    final maxStages = json['maxStages'];
    if (currentStage is! num || maxStages is! num) {
      throw const FormatException('Rider application stage values must be numbers');
    }

    final applicantName = json['applicantName'];
    if (applicantName != null && applicantName is! String) {
      throw const FormatException('Rider application applicantName must be a string');
    }

    final publicId = json['publicId'];
    if (publicId != null && publicId is! String) {
      throw const FormatException('Rider application publicId must be a string');
    }

    final reason = _optionalString(json['reason']);
    final requiresActionField = _optionalString(json['requiresActionField']);

    final smileVerificationJson = json['smileVerification'];
    final smileVerification = smileVerificationJson == null
        ? null
        : RiderSmileVerificationStatus.fromJson(smileVerificationJson);

    return RiderApplication(
      id: _requiredString(json['id'], 'id'),
      kind: _requiredString(json['kind'], 'kind'),
      status: _requiredString(json['status'], 'status'),
      currentStage: currentStage.toInt(),
      maxStages: maxStages.toInt(),
      applicantName: applicantName as String?,
      publicId: publicId as String?,
      reason: reason,
      requiresActionField: requiresActionField,
      smileVerification: smileVerification,
    );
  }
}

/// Onboarding service operations for the rider application.
class RiderOnboardingRepository {
  const RiderOnboardingRepository(this._client);

  final OreApiClient _client;

  /// Saves Stage 1 and returns the server-controlled next stage/status.
  Future<RiderApplication> saveStage1(RiderStage1Input input) async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.riderStage(1),
      data: input.toJson(),
    );
    return RiderApplication.fromJson(response.data);
  }

  /// Sends captured identity/liveness images for backend Smile ID processing.
  Future<RiderApplication> saveStage2(RiderStage2Input input) async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.riderStage(2),
      data: input.toJson(),
    );
    return RiderApplication.fromJson(response.data);
  }

  /// Reads the server-controlled rider application and Smile verification state.
  Future<RiderApplication> getApplicationStatus() async {
    final response = await _client.getFresh<Map<String, dynamic>>(
      OreEndpoints.onboardingStatus,
      query: const <String, dynamic>{'kind': 'RIDER'},
    );
    return RiderApplication.fromJson(response.data);
  }

  /// Verifies the payout destination through the backend Paystack client.
  Future<void> verifyPayout({
    required String type,
    required String provider,
    required String accountNumber,
    required String accountName,
  }) async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.verifyPayout,
      data: <String, String>{
        'type': type,
        'provider': provider.trim(),
        'accountNumber': accountNumber.trim(),
        'accountName': accountName.trim(),
      },
    );
    final verified = response.data?['verified'];
    if (verified is! bool || !verified) {
      throw const FormatException('Payout account was not verified');
    }
  }

  /// Submits document, selfie, liveness, personal details, and consent.
  Future<RiderDocumentSubmissionResult> submitDocumentVerification(
    RiderDocumentVerificationInput input,
  ) async {
    if (input.livenessImages.length < 6 || input.livenessImages.length > 8) {
      throw ArgumentError.value(
        input.livenessImages,
        'livenessImages',
        'Submit between 6 and 8 liveness images',
      );
    }
    if (input.givenNames.trim().isEmpty || input.lastName.trim().isEmpty) {
      throw ArgumentError('Given names and last name are required');
    }
    if (input.idNumber.trim().length < 4) {
      throw ArgumentError('Identification number is required');
    }
    if (input.stage4.isEmpty) {
      throw ArgumentError('Vehicle and payout details are required');
    }
    if ((input.email == null || input.email!.trim().isEmpty) &&
        (input.phoneNumber == null || input.phoneNumber!.trim().isEmpty)) {
      throw ArgumentError('Email or phone number is required');
    }

    final data = <String, dynamic>{
      'selfie': await _toMultipart(input.selfie),
      'document_front': await _toMultipart(input.documentFront),
      'given_names': input.givenNames.trim(),
      'last_name': input.lastName.trim(),
      'id_type': input.idType,
      'id_number': input.idNumber.trim(),
      'stage4': jsonEncode(input.stage4),
      'consent': jsonEncode(input.consent),
      if (input.email != null && input.email!.trim().isNotEmpty)
        'email': input.email!.trim(),
      if (input.phoneNumber != null && input.phoneNumber!.trim().isNotEmpty)
        'phone_number': input.phoneNumber!.trim(),
      if (input.documentBack != null)
        'document_back': await _toMultipart(input.documentBack!),
    };

    for (var index = 0; index < input.livenessImages.length; index++) {
      data['liveness_${index + 1}'] =
          await _toMultipart(input.livenessImages[index]);
    }

    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.smileDocumentSubmission,
      data: FormData.fromMap(data),
    );
    return RiderDocumentSubmissionResult.fromJson(response.data);
  }

  Future<MultipartFile> _toMultipart(XFile file) async {
    final bytes = await file.readAsBytes();
    if (bytes.isEmpty) throw ArgumentError('Image file is empty: ${file.name}');
    final filename = file.name.isEmpty ? 'capture.jpg' : file.name;
    return MultipartFile.fromBytes(
      bytes,
      filename: filename,
      contentType: _imageContentType(filename),
    );
  }
}

MediaType _imageContentType(String filename) {
  final lower = filename.toLowerCase();
  return lower.endsWith('.png')
      ? MediaType('image', 'png')
      : MediaType('image', 'jpeg');
}

String _requiredString(Object? value, String field) {
  if (value is! String || value.isEmpty) {
    throw FormatException('Missing or invalid rider application $field');
  }
  return value;
}

String? _optionalString(Object? value) {
  if (value == null) return null;
  if (value is String) return value;
  throw const FormatException('Optional status field must be a string or null');
}

DateTime? _optionalDateTime(Object? value) {
  if (value == null) return null;
  if (value is! String) {
    throw const FormatException('Status timestamp must be a string or null');
  }
  return DateTime.tryParse(value);
}

String _normalizeGhanaPhone(String phone) {
  final compact = phone.replaceAll(RegExp(r'[\s-]+'), '');
  if (compact.startsWith('+')) {
    if (RegExp(r'^\+\d{8,15}$').hasMatch(compact)) return compact;
  } else if (compact.startsWith('0') && compact.length >= 9) {
    final normalized = '+233${compact.substring(1)}';
    if (RegExp(r'^\+\d{8,15}$').hasMatch(normalized)) return normalized;
  } else if (compact.startsWith('233') && compact.length >= 11) {
    final normalized = '+$compact';
    if (RegExp(r'^\+\d{8,15}$').hasMatch(normalized)) return normalized;
  }

  throw ArgumentError.value(
    phone,
    'emergencyPhone',
    'Emergency phone must be a valid Ghana phone number',
  );
}
