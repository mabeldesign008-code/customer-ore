import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class CustomerStoredTokens {
  const CustomerStoredTokens({required this.accessToken, required this.refreshToken});

  final String accessToken;
  final String refreshToken;
}

class CustomerTokenStorage {
  CustomerTokenStorage({FlutterSecureStorage? storage}) : _storage = storage ?? FlutterSecureStorage();

  static const _accessKey = 'customer_access_token';
  static const _refreshKey = 'customer_refresh_token';
  final FlutterSecureStorage _storage;

  Future<CustomerStoredTokens?> read() async {
    final access = await _storage.read(key: _accessKey);
    final refresh = await _storage.read(key: _refreshKey);
    if (access == null || access.isEmpty || refresh == null || refresh.isEmpty) return null;
    return CustomerStoredTokens(accessToken: access, refreshToken: refresh);
  }

  Future<void> save(CustomerStoredTokens tokens) async {
    await _storage.write(key: _accessKey, value: tokens.accessToken);
    await _storage.write(key: _refreshKey, value: tokens.refreshToken);
  }

  Future<void> clear() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
  }
}
