import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';
import 'package:ore_core/ore_core.dart';

import 'package:ore_rider/data/onboarding/rider_onboarding_repository.dart';

void main() {
  test('maps Stage 1 fields to the backend schema', () {
    const input = RiderStage1Input(
      firstName: 'Ama',
      lastName: 'Rider',
      dob: '2000-01-01',
      gender: 'FEMALE',
      email: 'ama@example.com',
      digitalAddress: 'CC-012-3456',
      streetLandmark: 'Near UCC Old Site Gate',
      emergencyName: 'Kofi Rider',
      emergencyRelationship: 'Next of Kin',
      emergencyPhone: '024 123 4567',
    );

    final json = input.toJson();
    final address = json['residentialAddress'] as Map<String, dynamic>;
    final emergency = json['emergencyContact'] as Map<String, dynamic>;

    expect(json['firstName'], 'Ama');
    expect(json['gender'], 'FEMALE');
    expect(address['region'], 'Central Region');
    expect(address['city'], 'Cape Coast');
    expect(emergency['phone'], '+233241234567');
  });

  test('rejects an invalid emergency phone before a request', () {
    const input = RiderStage1Input(
      firstName: 'Ama',
      lastName: 'Rider',
      dob: '2000-01-01',
      gender: 'FEMALE',
      email: 'ama@example.com',
      digitalAddress: 'CC-012-3456',
      streetLandmark: 'Near UCC Old Site Gate',
      emergencyName: 'Kofi Rider',
      emergencyRelationship: 'Next of Kin',
      emergencyPhone: 'not-a-phone',
    );

    expect(input.toJson, throwsArgumentError);
  });

  test('maps Stage 2 biometric payload to the backend schema', () {
    final input = RiderStage2Input(
      idType: 'GHANA_CARD',
      idNumber: 'GHA-123456789-0',
      selfieBase64: List<String>.filled(100, 's').join(),
      angleImagesBase64: <String>['a', 'b', 'c', 'd', 'e', 'f'],
    );

    final json = input.toJson();

    expect(json['idType'], 'GHANA_CARD');
    expect(json['idNumber'], 'GHA-123456789-0');
    expect(json['selfieBase64'], hasLength(100));
    expect(json['angleImagesBase64'], hasLength(6));
  });

  test('rejects too few biometric angle images', () {
    final input = RiderStage2Input(
      idType: 'GHANA_CARD',
      idNumber: 'GHA-123456789-0',
      selfieBase64: List<String>.filled(100, 's').join(),
      angleImagesBase64: const <String>['a', 'b', 'c'],
    );

    expect(input.toJson, throwsArgumentError);
  });

  test('parses an accepted document verification response', () {
    final result = RiderDocumentSubmissionResult.fromJson(
      <String, dynamic>{
        'applicationId': 'application-id',
        'jobId': 'job-id',
        'userId': 'smile-user-id',
        'status': 'accepted',
        'message': 'Job submitted',
        'createdAt': '2026-08-16T12:00:00.000Z',
        'callbackUrl': 'https://example.test/webhook',
      },
    );

    expect(result.jobId, 'job-id');
    expect(result.status, 'accepted');
    expect(result.createdAt, isNotNull);
  });

  test('rejects document submission with fewer than six liveness images', () async {
    final repository = RiderOnboardingRepository(
      OreApiClient(baseUrl: 'https://example.invalid'),
    );
    final input = RiderDocumentVerificationInput(
      givenNames: 'Ama',
      lastName: 'Rider',
      email: 'ama@example.com',
      phoneNumber: null,
      idType: 'GHANA_CARD',
      idNumber: 'GHA-123456789-0',
      stage4: const <String, dynamic>{
        'vehicleType': 'MOTORBIKE',
        'payout': <String, dynamic>{
          'type': 'MOMO',
          'provider': 'MTN',
          'accountNumber': '0241234567',
          'accountName': 'Ama Rider',
        },
      },
      selfie: XFile('selfie.jpg'),
      livenessImages: List<XFile>.generate(5, (_) => XFile('liveness.jpg')),
      documentFront: XFile('document.jpg'),
      consent: const <String, dynamic>{'granted': true},
    );

    await expectLater(
      repository.submitDocumentVerification(input),
      throwsArgumentError,
    );
  });

  test('parses the server application stage response', () {
    final application = RiderApplication.fromJson(
      <String, dynamic>{
        'id': 'application-id',
        'applicantUserId': 'user-id',
        'applicantPhone': '233241234567',
        'applicantName': 'Ama Rider',
        'kind': 'RIDER',
        'status': 'IN_PROGRESS',
        'currentStage': 2,
        'maxStages': 4,
        'smileVerification': <String, dynamic>{
          'jobId': 'job-123',
          'providerUserId': 'smile-user-123',
          'status': 'ACCEPTED',
          'reason': null,
          'message': 'Job submitted',
          'submittedAt': '2026-08-16T12:00:00.000Z',
          'completedAt': null,
        },
      },
    );

    expect(application.id, 'application-id');
    expect(application.currentStage, 2);
    expect(application.status, 'IN_PROGRESS');
    expect(application.smileVerification?.jobId, 'job-123');
    expect(application.smileVerification?.status, 'ACCEPTED');
  });
}
