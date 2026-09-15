import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ore_core/ore_core.dart';

import 'customer_auth_provider.dart';

/// Server-backed customer order state.
///
/// There is intentionally no local status timer here. Vendor, dispatch and
/// rider transitions are authoritative; the customer refreshes the order DTO
/// and receives the same lifecycle used by the other apps.
class OrdersNotifier extends Notifier<List<OreOrder>> {
  Future<void>? _hydrateFuture;

  @override
  List<OreOrder> build() {
    final authenticated = ref.watch(customerAuthProvider).isAuthenticated;
    if (authenticated) {
      Future.microtask(() => hydrate().catchError((_) {}));
      final poller = Timer.periodic(const Duration(seconds: 20), (_) {
        if (ref.read(customerAuthProvider).isAuthenticated && state.any((order) => order.isActive)) {
          unawaited(hydrate().catchError((_) {}));
        }
      });
      ref.onDispose(poller.cancel);
    }
    return const <OreOrder>[];
  }

  Future<void> hydrate() {
    final inFlight = _hydrateFuture;
    if (inFlight != null) return inFlight;
    if (!ref.read(customerAuthProvider).isAuthenticated) {
      return Future<void>.value();
    }
    final future = _loadHistory();
    _hydrateFuture = future;
    future.then<void>(
      (_) {
        if (identical(_hydrateFuture, future)) _hydrateFuture = null;
      },
      onError: (Object error, StackTrace stack) {
        if (identical(_hydrateFuture, future)) _hydrateFuture = null;
      },
    );
    return future;
  }

  Future<void> _loadHistory() async {
    state = await ref.read(customerOrderRepositoryProvider).getHistory();
  }

  Future<void> refreshOrder(String orderId) async {
    final remote = await ref.read(customerOrderRepositoryProvider).getOrder(orderId);
    _replace(remote);
  }

  Future<OreOrder> cancelOrder(String orderId, {String? reason}) async {
    final remote = await ref.read(customerOrderRepositoryProvider).cancel(
          orderId: orderId,
          reason: reason,
        );
    _replace(remote);
    return remote;
  }

  void _replace(OreOrder remote) {
    state = [
      for (final order in state)
        if (order.id == remote.id) remote else order,
    ];
    if (!state.any((order) => order.id == remote.id)) {
      state = [remote, ...state];
    }
  }

  OreOrder? byId(String id) {
    for (final order in state) {
      if (order.id == id) return order;
    }
    return null;
  }

  List<OreOrder> get active => state.where((o) => o.isActive).toList();

  List<OreOrder> get history => state.where((o) => !o.isActive).toList();
}

final ordersProvider =
    NotifierProvider<OrdersNotifier, List<OreOrder>>(OrdersNotifier.new);

final activeOrdersProvider = Provider<List<OreOrder>>(
  (ref) => ref.watch(ordersProvider).where((o) => o.isActive).toList(),
);

final orderHistoryProvider = Provider<List<OreOrder>>(
  (ref) => ref.watch(ordersProvider).where((o) => !o.isActive).toList(),
);

final orderByIdProvider = Provider.family<OreOrder?, String>((ref, id) {
  final list = ref.watch(ordersProvider);
  for (final order in list) {
    if (order.id == id) return order;
  }
  return null;
});
