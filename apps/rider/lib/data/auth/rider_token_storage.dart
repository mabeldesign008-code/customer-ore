import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// The two JWTs returned by the auth service after OTP verification.
class RiderStoredTokens {
  const RiderStoredTokens({
    required this.accessToken,
    required this.refreshToken,
  });

  final String accessToken;
  final String refreshToken;
}

/// Minimal storage contract that keeps token persistence testable without
/// coupling tests to a platform keychain or Android keystore.
abstract interface class RiderSecretStore {
  Future<String?> read({required String key});
  Future<void> write({required String key, required String value});
  Future<void> delete({required String key});
}

/// Production adapter around the platform secure-storage plugin.
class FlutterRiderSecretStore implements RiderSecretStore {
  FlutterRiderSecretStore({FlutterSecureStorage? storage})
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

/// Persists rider authentication tokens in platform secure storage.
class RiderTokenStorage {
  RiderTokenStorage({RiderSecretStore? store})
      : _store = store ?? FlutterRiderSecretStore();

  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';

  final RiderSecretStore _store;

  /// Saves a complete token pair.
  ///
  /// Empty values are rejected because an empty bearer token must never be
  /// treated as an authenticated session. If the second write fails, the
  /// first value is removed so a partial session cannot be restored later.
  Future<void> save(RiderStoredTokens tokens) async {
    if (tokens.accessToken.isEmpty) {
      throw ArgumentError.value(
        tokens.accessToken,
        'tokens.accessToken',
        'Access token cannot be empty',
      );
    }
    if (tokens.refreshToken.isEmpty) {
      throw ArgumentError.value(
        tokens.refreshToken,
        'tokens.refreshToken',
        'Refresh token cannot be empty',
      );
    }

    try {
      await _store.write(key: accessTokenKey, value: tokens.accessToken);
      await _store.write(key: refreshTokenKey, value: tokens.refreshToken);
    } catch (_) {
      // Best effort cleanup; preserve the original storage error for the
      // caller so authentication cannot continue with an incomplete pair.
      try {
        await clear();
      } catch (_) {
        // Ignore cleanup failures and rethrow the original error below.
      }
      rethrow;
    }
  }

  /// Reads a complete token pair, or null when no valid session is stored.
  ///
  /// A partially stored pair is cleared and treated as unauthenticated.
  Future<RiderStoredTokens?> read() async {
    final accessToken = await _store.read(key: accessTokenKey);
    final refreshToken = await _store.read(key: refreshTokenKey);

    if (accessToken == null && refreshToken == null) return null;
    if (accessToken == null || refreshToken == null) {
      await clear();
      return null;
    }

    return RiderStoredTokens(
      accessToken: accessToken,
      refreshToken: refreshToken,
    );
  }

  /// Removes only the rider auth keys owned by this app.
  Future<void> clear() async {
    await _store.delete(key: accessTokenKey);
    await _store.delete(key: refreshTokenKey);
  }
}
