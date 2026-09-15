import 'package:flutter_test/flutter_test.dart';
import 'package:ore_core/ore_core.dart';

import 'package:ore_rider/data/auth/rider_auth_repository.dart';
import 'package:ore_rider/data/auth/rider_token_storage.dart';

void main() {
  group('RiderOtpRequestResult', () {
    test('parses the backend response including development code', () {
      final result = RiderOtpRequestResult.fromJson(
        <String, dynamic>{
          'sent': true,
          'devCode': '123456',
        },
      );

      expect(result.sent, isTrue);
      expect(result.devCode, '123456');
    });

    test('rejects a response without sent', () {
      expect(
        () => RiderOtpRequestResult.fromJson(<String, dynamic>{}),
        throwsFormatException,
      );
    });
  });

  group('RiderOtpVerificationResult', () {
    test('parses tokens and a rider user', () {
      final result = RiderOtpVerificationResult.fromJson(
        <String, dynamic>{
          'accessToken': 'access-token',
          'refreshToken': 'refresh-token',
          'user': <String, dynamic>{
            'id': 'user-id',
            'phone': '233241234567',
            'role': 'rider',
            'name': 'Ama Rider',
            'publicId': 'ORC-2026-000001',
          },
        },
      );

      expect(result.tokens.accessToken, 'access-token');
      expect(result.tokens.refreshToken, 'refresh-token');
      expect(result.user.id, 'user-id');
      expect(result.user.role, 'rider');
    });

    test('parses the current-user JWT payload shape', () {
      final user = RiderAuthenticatedUser.fromCurrentUserJson(
        <String, dynamic>{
          'sub': 'user-id',
          'phone': '233241234567',
          'role': 'rider',
          'name': 'Ama Rider',
          'riderId': 'rider-id',
        },
      );

      expect(user.id, 'user-id');
      expect(user.riderId, 'rider-id');
    });

    test('rejects a non-rider role', () {
      expect(
        () => RiderOtpVerificationResult.fromJson(
          <String, dynamic>{
            'accessToken': 'access-token',
            'refreshToken': 'refresh-token',
            'user': <String, dynamic>{
              'id': 'user-id',
              'phone': '233241234567',
              'role': 'customer',
            },
          },
        ),
        throwsFormatException,
      );
    });
  });

  group('RiderAuthRepository', () {
    test('rejects non-E.164 phone input before making a request', () async {
      final repository = RiderAuthRepository(
        OreApiClient(baseUrl: 'https://example.invalid'),
        RiderTokenStorage(store: MemorySecretStore()),
      );

      await expectLater(
        repository.requestOtp(phone: '0241234567'),
        throwsArgumentError,
      );
    });

    test('rejects OTP codes that are not six digits before making a request', () async {
      final repository = RiderAuthRepository(
        OreApiClient(baseUrl: 'https://example.invalid'),
        RiderTokenStorage(store: MemorySecretStore()),
      );

      await expectLater(
        repository.verifyOtp(
          phone: '+233241234567',
          code: '0000',
        ),
        throwsArgumentError,
      );
    });
  });
}

class MemorySecretStore implements RiderSecretStore {
  final Map<String, String> values = <String, String>{};

  @override
  Future<String?> read({required String key}) async => values[key];

  @override
  Future<void> write({required String key, required String value}) async {
    values[key] = value;
  }

  @override
  Future<void> delete({required String key}) async {
    values.remove(key);
  }
}
