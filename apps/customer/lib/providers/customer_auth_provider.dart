import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:ore_core/ore_core.dart';

import '../data/address/customer_address_repository.dart';
import '../data/auth/customer_auth_repository.dart';
import '../data/auth/customer_token_storage.dart';
import '../data/cart/customer_cart_repository.dart';
import '../data/catalog/customer_review_repository.dart';
import '../data/ledger/customer_credit_repository.dart';
import '../data/ledger/customer_dispute_repository.dart';
import '../data/ledger/customer_loyalty_repository.dart';
import '../data/location/customer_location_repository.dart';
import '../data/notifications/customer_notification_repository.dart';
import '../data/notifications/customer_notification_service.dart';
import '../data/order/customer_order_repository.dart';
import '../data/order/customer_request_repository.dart';
import '../data/referral/customer_referral_repository.dart';
import '../data/tracking/customer_tracking_repository.dart';

final customerTokenStorageProvider = Provider<CustomerTokenStorage>((ref) => CustomerTokenStorage());

final customerApiClientProvider = Provider<OreApiClient>((ref) {
  final storage = ref.watch(customerTokenStorageProvider);
  late final OreApiClient client;
  client = OreApiClient(
    baseUrl: OreApiClient.resolveBaseUrl(fileValue: dotenv.isInitialized ? dotenv.env['API_BASE_URL'] : null),
    accessTokenReader: () async => (await storage.read())?.accessToken,
    tokenRefresher: () async {
      try {
        final tokens = await CustomerAuthRepository(client, storage).refresh();
        return tokens?.accessToken;
      } catch (_) {
        return null;
      }
    },
  );
  return client;
});

final customerAuthRepositoryProvider = Provider<CustomerAuthRepository>((ref) {
  return CustomerAuthRepository(ref.watch(customerApiClientProvider), ref.watch(customerTokenStorageProvider));
});

final customerCartRepositoryProvider = Provider<CustomerCartRepository>((ref) {
  return CustomerCartRepository(ref.watch(customerApiClientProvider));
});

final customerReviewRepositoryProvider = Provider<CustomerReviewRepository>((ref) {
  return CustomerReviewRepository(ref.watch(customerApiClientProvider));
});

final customerOrderRepositoryProvider = Provider<CustomerOrderRepository>((ref) {
  return CustomerOrderRepository(ref.watch(customerApiClientProvider));
});

final customerRequestRepositoryProvider = Provider<CustomerRequestRepository>((ref) {
  return CustomerRequestRepository(ref.watch(customerApiClientProvider));
});

final customerTrackingRepositoryProvider = Provider<CustomerTrackingRepository>((ref) {
  return CustomerTrackingRepository(ref.watch(customerApiClientProvider));
});

final customerNotificationRepositoryProvider = Provider<CustomerNotificationRepository>((ref) {
  return CustomerNotificationRepository(ref.watch(customerApiClientProvider));
});

final customerNotificationServiceProvider = Provider<CustomerNotificationService>((ref) {
  return CustomerNotificationService(ref.watch(customerApiClientProvider));
});

final customerCreditRepositoryProvider = Provider<CustomerCreditRepository>((ref) {
  return CustomerCreditRepository(ref.watch(customerApiClientProvider));
});

final customerLoyaltyRepositoryProvider = Provider<CustomerLoyaltyRepository>((ref) {
  return CustomerLoyaltyRepository(ref.watch(customerApiClientProvider));
});

final customerLoyaltyProvider = FutureProvider<CustomerLoyalty>((ref) async {
  return ref.watch(customerLoyaltyRepositoryProvider).get();
});

final customerDisputeRepositoryProvider = Provider<CustomerDisputeRepository>((ref) {
  return CustomerDisputeRepository(ref.watch(customerApiClientProvider));
});

final customerReferralRepositoryProvider = Provider<CustomerReferralRepository>((ref) {
  return CustomerReferralRepository(ref.watch(customerApiClientProvider));
});

final customerAddressRepositoryProvider = Provider<CustomerAddressRepository?>((ref) {
  final auth = ref.watch(customerAuthProvider);
  if (!auth.isAuthenticated) return null;
  return CustomerAddressRepository(ref.watch(customerApiClientProvider));
});

final customerTrackingHttpRepositoryProvider = Provider<CustomerTrackingRepository>((ref) {
  return CustomerTrackingRepository(ref.watch(customerApiClientProvider));
});

final customerCreditStatementProvider = FutureProvider<CustomerCreditStatement>((ref) async {
  return ref.watch(customerCreditRepositoryProvider).getStatement();
});

final customerReferralStatsProvider = FutureProvider<CustomerReferralStats>((ref) async {
  return ref.watch(customerReferralRepositoryProvider).getStats();
});

final customerReferralsProvider = FutureProvider<List<CustomerReferral>>((ref) async {
  return ref.watch(customerReferralRepositoryProvider).getMine();
});

final customerDisputesProvider = FutureProvider<List<CustomerDispute>>((ref) async {
  return ref.watch(customerDisputeRepositoryProvider).getMine();
});

class CustomerAuthState {
  const CustomerAuthState({this.isRestoring = false, this.isAuthenticated = false, this.user, this.error});

  final bool isRestoring;
  final bool isAuthenticated;
  final CustomerAuthenticatedUser? user;
  final String? error;
}

class CustomerAuthNotifier extends ChangeNotifier {
  CustomerAuthNotifier(this._repository, this._storage);

  final CustomerAuthRepository _repository;
  final CustomerTokenStorage _storage;
  CustomerAuthState _state = const CustomerAuthState();
  bool _restoreAttempted = false;

  CustomerAuthState get state => _state;
  bool get isAuthenticated => _state.isAuthenticated;
  bool get isRestoring => _state.isRestoring;
  CustomerAuthenticatedUser? get user => _state.user;

  Future<void> restoreSession() async {
    if (_restoreAttempted) return;
    _restoreAttempted = true;
    _state = const CustomerAuthState(isRestoring: true);
    notifyListeners();
    final stored = await _storage.read();
    if (stored == null) {
      _state = const CustomerAuthState();
      notifyListeners();
      return;
    }
    try {
      final user = await _repository.getCurrentUser();
      _state = CustomerAuthState(isAuthenticated: true, user: user);
    } on DioException catch (error) {
      if ([401, 403].contains(error.response?.statusCode)) await _storage.clear();
      _state = CustomerAuthState(error: error.message);
    } catch (error) {
      _state = CustomerAuthState(error: error.toString());
    }
    notifyListeners();
  }

  Future<CustomerOtpRequestResult> requestOtp(String phone) async {
    return _repository.requestOtp(phone);
  }

  Future<CustomerAuthenticatedUser> verifyOtp({required String phone, required String code}) async {
    final user = await _repository.verifyOtp(phone: phone, code: code);
    _state = CustomerAuthState(isAuthenticated: true, user: user);
    notifyListeners();
    return user;
  }

  Future<CustomerAuthenticatedUser> updateProfile({required String name, String? email}) async {
    final user = await _repository.updateProfile(name: name, email: email);
    _state = CustomerAuthState(isAuthenticated: true, user: user);
    notifyListeners();
    return user;
  }

  Future<void> logout() async {
    // Best-effort FCM token de-registration so push notifications don't keep
    // going to a logged-out device. Never block logout on a network error;
    // we wipe tokens locally regardless.
    try {
      // The notification service posts DELETE /device-token on disposal.
      // We cannot import the service here directly without a circular dep,
      // but the main.dart `ref.listenManual(customerAuthProvider, ...)` hook
      // reacts to `isAuthenticated == false` and disposes the service.
    } catch (_) {}
    await _storage.clear();
    _state = const CustomerAuthState();
    notifyListeners();
  }
}

final customerAuthProvider = ChangeNotifierProvider<CustomerAuthNotifier>((ref) {
  return CustomerAuthNotifier(ref.watch(customerAuthRepositoryProvider), ref.watch(customerTokenStorageProvider));
});
