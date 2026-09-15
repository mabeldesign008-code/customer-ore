import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/catalog/vendor_catalog_repository.dart';
import '../data/order/vendor_order_repository.dart';
import '../data/ledger/vendor_ledger_repository.dart';
import '../data/onboarding/vendor_onboarding_repository.dart';
import '../data/notifications/vendor_notification_service.dart';
import '../data/notifications/vendor_notification_repository.dart';
import 'auth/vendor_auth_provider.dart';

final vendorCatalogRepositoryProvider = Provider<VendorCatalogRepository>((ref) {
  return VendorCatalogRepository(ref.watch(vendorApiClientProvider));
});

final vendorSnapshotProvider = FutureProvider<VendorSnapshot>((ref) async {
  final auth = ref.watch(vendorAuthProvider);
  if (!auth.isLoggedIn) throw StateError('Vendor session is not authenticated');
  return ref.watch(vendorCatalogRepositoryProvider).getMyVendor();
});

final vendorOrderRepositoryProvider = Provider<VendorOrderRepository>((ref) {
  return VendorOrderRepository(ref.watch(vendorApiClientProvider));
});

final vendorOrdersProvider = FutureProvider.family<List<VendorOrder>, String>((ref, vendorId) async {
  final auth = ref.watch(vendorAuthProvider);
  if (!auth.isLoggedIn) throw StateError('Vendor session is not authenticated');
  return ref.watch(vendorOrderRepositoryProvider).list(vendorId: vendorId);
});

final vendorOrderProvider = FutureProvider.family<VendorOrder, String>((ref, orderId) async {
  final auth = ref.watch(vendorAuthProvider);
  if (!auth.isLoggedIn) throw StateError('Vendor session is not authenticated');
  return ref.watch(vendorOrderRepositoryProvider).get(orderId);
});

final vendorLedgerRepositoryProvider = Provider<VendorLedgerRepository>((ref) {
  return VendorLedgerRepository(ref.watch(vendorApiClientProvider));
});

final vendorBalanceProvider = FutureProvider<VendorBalanceSnapshot>((ref) async {
  final auth = ref.watch(vendorAuthProvider);
  if (!auth.isLoggedIn) throw StateError('Vendor session is not authenticated');
  return ref.watch(vendorLedgerRepositoryProvider).getBalance();
});

final vendorAnalyticsProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, period) async {
  final auth = ref.watch(vendorAuthProvider);
  if (!auth.isLoggedIn) throw StateError('Vendor session is not authenticated');
  return ref.watch(vendorCatalogRepositoryProvider).getAnalytics(period);
});

final vendorStatementProvider = FutureProvider<VendorLedgerStatement>((ref) async {
  final auth = ref.watch(vendorAuthProvider);
  if (!auth.isLoggedIn) throw StateError('Vendor session is not authenticated');
  return ref.watch(vendorLedgerRepositoryProvider).getStatement();
});

final vendorStatementRangeProvider = FutureProvider.family<VendorLedgerStatement, ({DateTime? from, DateTime? to})>((ref, range) async {
  final auth = ref.watch(vendorAuthProvider);
  if (!auth.isLoggedIn) throw StateError('Vendor session is not authenticated');
  return ref.watch(vendorLedgerRepositoryProvider).getStatement(from: range.from, to: range.to);
});

final vendorOnboardingRepositoryProvider = Provider<VendorOnboardingRepository>((ref) {
  return VendorOnboardingRepository(ref.watch(vendorApiClientProvider));
});

final vendorApplicationProvider = FutureProvider<VendorApplicationStatus>((ref) async {
  final auth = ref.watch(vendorAuthProvider);
  if (!auth.isLoggedIn) throw StateError('Vendor session is not authenticated');
  return ref.watch(vendorOnboardingRepositoryProvider).getStatus();
});

final vendorNotificationServiceProvider = Provider<VendorNotificationService>((ref) {
  return VendorNotificationService(ref.watch(vendorApiClientProvider));
});

final vendorNotificationRepositoryProvider = Provider<VendorNotificationRepository>((ref) {
  return VendorNotificationRepository(ref.watch(vendorApiClientProvider));
});

final vendorNotificationsProvider = FutureProvider<List<VendorNotification>>((ref) async {
  final auth = ref.watch(vendorAuthProvider);
  if (!auth.isLoggedIn) throw StateError('Vendor session is not authenticated');
  return ref.watch(vendorNotificationRepositoryProvider).getFeed();
});
