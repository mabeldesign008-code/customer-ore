import 'package:flutter_test/flutter_test.dart';

import 'package:ore_vendor/data/auth/vendor_auth_repository.dart';
import 'package:ore_vendor/data/auth/vendor_token_storage.dart';

void main() {
  test('parses a vendor auth response and normalizes backend phone', () {
    final result = VendorOtpVerificationResult.fromJson(<String, dynamic>{
      'accessToken': 'access',
      'refreshToken': 'refresh',
      'user': <String, dynamic>{
        'id': 'user-id',
        'phone': '233241234567',
        'role': 'vendor',
        'name': 'Vendor Owner',
      },
    });

    expect(result.user.role, 'vendor');
    expect(result.user.phone, '+233241234567');
    expect(result.tokens.accessToken, 'access');
  });

  test('rejects a non-vendor role', () {
    expect(
      () => VendorAuthenticatedUser.fromJson(<String, dynamic>{
        'id': 'user-id',
        'phone': '233241234567',
        'role': 'rider',
      }),
      throwsFormatException,
    );
  });

  test('stores and clears the vendor token pair', () async {
    final store = _MemorySecretStore();
    final storage = VendorTokenStorage(store: store);
    await storage.save(const VendorStoredTokens(accessToken: 'a', refreshToken: 'r'));
    expect((await storage.read())?.accessToken, 'a');
    await storage.clear();
    expect(await storage.read(), isNull);
  });
}

class _MemorySecretStore implements VendorSecretStore {
  final values = <String, String>{};

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
