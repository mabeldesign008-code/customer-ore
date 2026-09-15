import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class VendorStoredTokens {
  const VendorStoredTokens({required this.accessToken, required this.refreshToken});

  final String accessToken;
  final String refreshToken;
}

abstract interface class VendorSecretStore {
  Future<String?> read({required String key});
  Future<void> write({required String key, required String value});
  Future<void> delete({required String key});
}

class FlutterVendorSecretStore implements VendorSecretStore {
  FlutterVendorSecretStore({FlutterSecureStorage? storage})
      : _storage = storage ?? FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  @override
  Future<String?> read({required String key}) => _storage.read(key: key);

  @override
  Future<void> write({required String key, required String value}) =>
      _storage.write(key: key, value: value);

  @override
  Future<void> delete({required String key}) => _storage.delete(key: key);
}

class VendorTokenStorage {
  VendorTokenStorage({VendorSecretStore? store})
      : _store = store ?? FlutterVendorSecretStore();

  static const accessTokenKey = 'vendor_access_token';
  static const refreshTokenKey = 'vendor_refresh_token';

  final VendorSecretStore _store;

  Future<void> save(VendorStoredTokens tokens) async {
    if (tokens.accessToken.isEmpty || tokens.refreshToken.isEmpty) {
      throw ArgumentError('Vendor token pair cannot contain empty values');
    }
    try {
      await _store.write(key: accessTokenKey, value: tokens.accessToken);
      await _store.write(key: refreshTokenKey, value: tokens.refreshToken);
    } catch (_) {
      try {
        await clear();
      } catch (_) {}
      rethrow;
    }
  }

  Future<VendorStoredTokens?> read() async {
    final access = await _store.read(key: accessTokenKey);
    final refresh = await _store.read(key: refreshTokenKey);
    if (access == null && refresh == null) return null;
    if (access == null || refresh == null) {
      await clear();
      return null;
    }
    return VendorStoredTokens(accessToken: access, refreshToken: refresh);
  }

  Future<void> clear() async {
    await _store.delete(key: accessTokenKey);
    await _store.delete(key: refreshTokenKey);
  }
}
