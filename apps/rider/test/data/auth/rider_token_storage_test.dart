import 'package:flutter_test/flutter_test.dart';

import 'package:ore_rider/data/auth/rider_token_storage.dart';

void main() {
  group('RiderTokenStorage', () {
    test('saves and reads a complete token pair', () async {
      final store = MemorySecretStore();
      final storage = RiderTokenStorage(store: store);

      await storage.save(
        const RiderStoredTokens(
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        ),
      );

      final tokens = await storage.read();
      expect(tokens?.accessToken, 'access-token');
      expect(tokens?.refreshToken, 'refresh-token');
    });

    test('clears and rejects a partially stored pair', () async {
      final store = MemorySecretStore();
      store.values[RiderTokenStorage.accessTokenKey] = 'access-token';
      final storage = RiderTokenStorage(store: store);

      final tokens = await storage.read();

      expect(tokens, isNull);
      expect(store.values, isEmpty);
      expect(store.deletedKeys, contains(RiderTokenStorage.accessTokenKey));
      expect(store.deletedKeys, contains(RiderTokenStorage.refreshTokenKey));
    });

    test('rejects empty token values', () async {
      final storage = RiderTokenStorage(store: MemorySecretStore());

      await expectLater(
        storage.save(
          const RiderStoredTokens(
            accessToken: '',
            refreshToken: 'refresh-token',
          ),
        ),
        throwsArgumentError,
      );
    });

    test('cleans up the first write when the second write fails', () async {
      final store = MemorySecretStore();
      store.failOnWriteKey = RiderTokenStorage.refreshTokenKey;
      final storage = RiderTokenStorage(store: store);

      await expectLater(
        storage.save(
          const RiderStoredTokens(
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
          ),
        ),
        throwsStateError,
      );

      expect(store.values, isEmpty);
    });
  });
}

class MemorySecretStore implements RiderSecretStore {
  final Map<String, String> values = <String, String>{};
  final List<String> deletedKeys = <String>[];
  String? failOnWriteKey;

  @override
  Future<String?> read({required String key}) async => values[key];

  @override
  Future<void> write({required String key, required String value}) async {
    if (key == failOnWriteKey) {
      throw StateError('write failed');
    }
    values[key] = value;
  }

  @override
  Future<void> delete({required String key}) async {
    deletedKeys.add(key);
    values.remove(key);
  }
}
