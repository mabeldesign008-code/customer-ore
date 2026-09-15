import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:ore_core/ore_core.dart';

import '../../data/auth/vendor_auth_repository.dart';
import '../../data/auth/vendor_token_storage.dart';

class VendorAuthState {
  const VendorAuthState({this.isLoggedIn = false, this.user});

  final bool isLoggedIn;
  final VendorAuthenticatedUser? user;
}

class VendorAuthNotifier extends ChangeNotifier {
  VendorAuthNotifier(this._storage, this._repository);

  final VendorTokenStorage _storage;
  final VendorAuthRepository _repository;
  final StreamController<VendorAuthState> _events = StreamController.broadcast();
  VendorAuthState _state = const VendorAuthState();
  bool _restoreAttempted = false;

  VendorAuthState get state => _state;
  bool get isLoggedIn => _state.isLoggedIn;
  Stream<VendorAuthState> get events => _events.stream;

  void setAuthenticated(VendorAuthenticatedUser user) {
    _state = VendorAuthState(isLoggedIn: true, user: user);
    _events.add(_state);
    notifyListeners();
  }

  Future<void> restoreSession() async {
    if (_restoreAttempted) return;
    _restoreAttempted = true;
    try {
      if (await _storage.read() == null) return;
      setAuthenticated(await _repository.getCurrentUser());
    } on DioException catch (error) {
      final status = error.response?.statusCode;
      if (status == 401 || status == 403) await _clearSession();
    } on FormatException {
      await _clearSession();
    } catch (_) {
      // Keep secure tokens for a later explicit retry; never fabricate login.
    }
  }

  Future<void> _clearSession() async {
    try {
      await _storage.clear();
    } catch (_) {}
  }

  Future<void> logout() async {
    await _storage.clear();
    _state = const VendorAuthState();
    _events.add(_state);
    notifyListeners();
  }

  @override
  void dispose() {
    _events.close();
    super.dispose();
  }
}

final vendorTokenStorageProvider = Provider<VendorTokenStorage>((ref) {
  return VendorTokenStorage();
});

final vendorApiClientProvider = Provider<OreApiClient>((ref) {
  final storage = ref.watch(vendorTokenStorageProvider);
  late final OreApiClient client;
  client = OreApiClient(
    baseUrl: OreApiClient.resolveBaseUrl(fileValue: dotenv.isInitialized ? dotenv.env['API_BASE_URL'] : null),
    accessTokenReader: () async => (await storage.read())?.accessToken,
    tokenRefresher: () async {
      try {
        final tokens = await VendorAuthRepository(client, storage).refresh();
        return tokens?.accessToken;
      } catch (_) {
        return null;
      }
    },
  );
  return client;
});

final vendorAuthRepositoryProvider = Provider<VendorAuthRepository>((ref) {
  return VendorAuthRepository(
    ref.watch(vendorApiClientProvider),
    ref.watch(vendorTokenStorageProvider),
  );
});

final vendorAuthProvider = ChangeNotifierProvider<VendorAuthNotifier>((ref) {
  return VendorAuthNotifier(
    ref.watch(vendorTokenStorageProvider),
    ref.watch(vendorAuthRepositoryProvider),
  );
});
