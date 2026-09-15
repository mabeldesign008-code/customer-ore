import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ore_core/ore_core.dart';

import 'customer_auth_provider.dart';

/// Multi-Vendor Cart state. Guest lines stay local until authentication, then
/// are uploaded to the authenticated server cart before checkout.
class CartNotifier extends Notifier<List<CartItem>> {
  Future<void>? _hydrateFuture;
  bool? _lastAuthenticated;
  Future<void>? _authSync;

  @override
  List<CartItem> build() {
    _lastAuthenticated = ref.read(customerAuthProvider).isAuthenticated;
    ref.listen(customerAuthProvider, (previous, next) {
      final wasAuthenticated = _lastAuthenticated ?? false;
      _lastAuthenticated = next.isAuthenticated;
      if (!wasAuthenticated && next.isAuthenticated) {
        final guestLines = state;
        if (guestLines.isEmpty) {
          _authSync = hydrate();
        } else {
          _authSync = _syncGuestLinesAfterLogin(guestLines);
        }
        unawaited(_authSync!);
      } else if (wasAuthenticated && !next.isAuthenticated) {
        // Do not expose one customer's server cart after logout.
        state = const <CartItem>[];
      }
    });

    if (ref.read(customerAuthProvider).isAuthenticated) {
      Future.microtask(() => hydrate().catchError((_) {}));
    }
    return const <CartItem>[];
  }

  Future<void> _syncGuestLinesAfterLogin(List<CartItem> guestLines) async {
    final repository = ref.read(customerCartRepositoryProvider);
    await repository.clear();
    for (final item in guestLines) {
      await repository.addItem(item);
    }
    await hydrate();
  }

  Future<void> waitForServerSync() async {
    final pending = _authSync;
    if (pending != null) await pending;
  }

  Future<void> hydrate() {
    final inFlight = _hydrateFuture;
    if (inFlight != null) return inFlight;
    if (!ref.read(customerAuthProvider).isAuthenticated) {
      return Future<void>.value();
    }
    final future = _loadRemoteCart();
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

  Future<void> _loadRemoteCart() async {
    state = await ref.read(customerCartRepositoryProvider).getCart();
  }

  Future<void> syncLocalCart() async {
    if (!ref.read(customerAuthProvider).isAuthenticated) return;
    final repository = ref.read(customerCartRepositoryProvider);
    await repository.clear();
    for (final item in state) {
      await repository.addItem(item);
    }
  }

  void addItem(CartItem item) {
    final key = item.customizationKey;
    final index = state.indexWhere((candidate) => candidate.customizationKey == key);
    if (index >= 0) {
      final updated = [...state];
      updated[index] = updated[index].copyWith(
        quantity: updated[index].quantity + item.quantity,
      );
      state = updated;
    } else {
      state = [...state, item];
    }
  }

  void increment(String key) => _updateQty(key, 1);
  void decrement(String key) => _updateQty(key, -1);

  CartItem? _find(String key) {
    for (final item in state) {
      if (item.customizationKey == key) return item;
    }
    return null;
  }

  void _updateQty(String key, int delta) {
    final existing = _find(key);
    if (existing == null) return;
    final newQty = existing.quantity + delta;
    final updated = <CartItem>[];
    for (final item in state) {
      if (item.customizationKey == key) {
        if (newQty > 0) updated.add(item.copyWith(quantity: newQty));
      } else {
        updated.add(item);
      }
    }
    state = updated;
    if (existing.backendLineId != null &&
        ref.read(customerAuthProvider).isAuthenticated &&
        newQty > 0) {
      unawaited(
        ref.read(customerCartRepositoryProvider).updateQuantity(
              lineId: existing.backendLineId!,
              quantity: newQty,
            ),
      );
    }
  }

  void remove(String key) {
    final item = _find(key);
    state = state.where((candidate) => candidate.customizationKey != key).toList();
    if (item?.backendLineId != null && ref.read(customerAuthProvider).isAuthenticated) {
      unawaited(ref.read(customerCartRepositoryProvider).remove(item!.backendLineId!));
    }
  }

  void clear() => state = const <CartItem>[];

  Future<void> clearRemote() async {
    if (ref.read(customerAuthProvider).isAuthenticated) {
      await ref.read(customerCartRepositoryProvider).clear();
    }
    state = const <CartItem>[];
  }

  double get subtotal => state.fold(0, (sum, item) => sum + item.lineTotal);
  int get totalItems => state.fold(0, (sum, item) => sum + item.quantity);

  List<String> get vendorIds => state.map((item) => item.vendorId).toSet().toList();

  Map<String, List<CartItem>> get itemsByVendor {
    final map = <String, List<CartItem>>{};
    for (final item in state) {
      map.putIfAbsent(item.vendorId, () => <CartItem>[]).add(item);
    }
    return map;
  }

  double vendorSubtotal(String vendorId) =>
      (itemsByVendor[vendorId] ?? const <CartItem>[])
          .fold(0, (sum, item) => sum + item.lineTotal);

  bool hasVendorConflict(String? vendorId) {
    if (state.isEmpty || vendorId == null) return false;
    final distinct = vendorIds;
    return distinct.length >= 3 && !distinct.contains(vendorId);
  }
}

final cartProvider = NotifierProvider<CartNotifier, List<CartItem>>(CartNotifier.new);

final cartSubtotalProvider = Provider<double>(
  (ref) => ref.watch(cartProvider).fold(0.0, (sum, item) => sum + item.lineTotal),
);

final cartCountProvider = Provider<int>(
  (ref) => ref.watch(cartProvider).fold(0, (sum, item) => sum + item.quantity),
);

final cartVendorsProvider = Provider<List<String>>(
  (ref) => ref.watch(cartProvider.notifier).vendorIds,
);

final cartVendorNameProvider = Provider<String?>((ref) {
  final items = ref.watch(cartProvider);
  return items.isEmpty ? null : items.first.vendorName;
});
