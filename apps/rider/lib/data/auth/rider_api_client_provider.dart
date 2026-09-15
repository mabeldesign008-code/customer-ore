import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ore_core/ore_core.dart';

import '../dispatch/rider_dispatch_repository.dart';
import '../dispatch/rider_demand_repository.dart';
import '../dispatch/rider_block_repository.dart';
import '../ledger/rider_ledger_repository.dart';
import '../maps/rider_directions_repository.dart';
import '../notifications/rider_notification_repository.dart';
import '../support/rider_incident_repository.dart';
import '../notifications/rider_notification_service.dart';
import '../onboarding/rider_onboarding_repository.dart';
import '../onboarding/rider_documents_repository.dart';
import '../order/rider_order_repository.dart';
import '../tracking/rider_tracking_repository.dart';
import 'rider_auth_repository.dart';
import 'rider_token_storage.dart';

/// Shared secure token storage for the rider session.
final riderTokenStorageProvider = Provider<RiderTokenStorage>((ref) {
  return RiderTokenStorage();
});

/// Rider API client configured to read the current access token securely for
/// protected requests. Repositories and screens use this client for backend
/// data; credentials remain outside the Flutter binary.
final riderApiClientProvider = Provider<OreApiClient>((ref) {
  final tokenStorage = ref.watch(riderTokenStorageProvider);
  late final OreApiClient client;
  client = OreApiClient(
    baseUrl: OreApiClient.resolveBaseUrl(fileValue: dotenv.isInitialized ? dotenv.env['API_BASE_URL'] : null),
    accessTokenReader: () async =>
        (await tokenStorage.read())?.accessToken,
    tokenRefresher: () async {
      try {
        final tokens = await RiderAuthRepository(client, tokenStorage).refresh();
        return tokens?.accessToken;
      } catch (_) {
        return null;
      }
    },
  );
  return client;
});

/// Rider authentication repository backed by the shared API client.
final riderAuthRepositoryProvider = Provider<RiderAuthRepository>((ref) {
  return RiderAuthRepository(
    ref.watch(riderApiClientProvider),
    ref.watch(riderTokenStorageProvider),
  );
});

/// Rider dispatch repository using the authenticated shared client.
final riderDispatchRepositoryProvider = Provider<RiderDispatchRepository>((ref) {
  return RiderDispatchRepository(ref.watch(riderApiClientProvider));
});

final riderDemandRepositoryProvider = Provider<RiderDemandRepository>((ref) {
  return RiderDemandRepository(ref.watch(riderApiClientProvider));
});

final riderBlockRepositoryProvider = Provider<RiderBlockRepository>((ref) {
  return RiderBlockRepository(ref.watch(riderApiClientProvider));
});

final riderBlocksProvider = FutureProvider<List<RiderBlock>>((ref) async {
  return ref.watch(riderBlockRepositoryProvider).list();
});

final riderPerformanceProvider = FutureProvider<RiderPerformance>((ref) async {
  return ref.watch(riderDispatchRepositoryProvider).getPerformance();
});

final riderPeakPayProvider = FutureProvider<RiderPeakPay>((ref) async {
  return ref.watch(riderDispatchRepositoryProvider).getPeakPay();
});

/// Google Directions client used only for public road-route geometry.
final riderDirectionsRepositoryProvider = Provider<RiderDirectionsRepository>((ref) {
  return RiderDirectionsRepository();
});

/// Rider onboarding repository using the authenticated shared client.
final riderOnboardingRepositoryProvider = Provider<RiderOnboardingRepository>((ref) {
  return RiderOnboardingRepository(ref.watch(riderApiClientProvider));
});

final riderDocumentsRepositoryProvider = Provider<RiderDocumentsRepository>((ref) {
  return RiderDocumentsRepository(ref.watch(riderApiClientProvider));
});

final riderDocumentsProvider = FutureProvider<List<RiderDocumentRecord>>((ref) async {
  return ref.watch(riderDocumentsRepositoryProvider).list();
});

/// Rider order actions using the authenticated shared client.
final riderOrderRepositoryProvider = Provider<RiderOrderRepository>((ref) {
  return RiderOrderRepository(ref.watch(riderApiClientProvider));
});

/// Rider tracking client using the authenticated shared client.
final riderTrackingRepositoryProvider = Provider<RiderTrackingRepository>((ref) {
  return RiderTrackingRepository(ref.watch(riderApiClientProvider));
});

/// Rider ledger client using the authenticated shared client.
final riderLedgerRepositoryProvider = Provider<RiderLedgerRepository>((ref) {
  return RiderLedgerRepository(ref.watch(riderApiClientProvider));
});

final riderWalletProvider = FutureProvider<RiderWalletSnapshot>((ref) async {
  return ref.watch(riderLedgerRepositoryProvider).getWallet();
});

final riderEarningsStatementProvider = FutureProvider<RiderEarningsStatement>((ref) async {
  return ref.watch(riderLedgerRepositoryProvider).getStatement();
});

final riderWithdrawalsProvider = FutureProvider<List<RiderWithdrawalRecord>>((ref) async {
  return ref.watch(riderLedgerRepositoryProvider).listWithdrawals();
});

final riderNotificationServiceProvider = Provider<RiderNotificationService>((ref) {
  return RiderNotificationService(ref.watch(riderApiClientProvider));
});

final riderNotificationRepositoryProvider = Provider<RiderNotificationRepository>((ref) {
  return RiderNotificationRepository(ref.watch(riderApiClientProvider));
});

final riderIncidentRepositoryProvider = Provider<RiderIncidentRepository>((ref) {
  return RiderIncidentRepository(ref.watch(riderApiClientProvider));
});

final riderNotificationsProvider = FutureProvider<List<RiderNotification>>((ref) async {
  return ref.watch(riderNotificationRepositoryProvider).getFeed();
});
