import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:ore_core/ore_core.dart';

import '../data/catalog/customer_favourite_repository.dart';
import 'customer_auth_provider.dart';

/// Server-backed favourite Vendors. Empty API = empty list. No demo vendors.
class CustomerFavoritesNotifier extends ChangeNotifier {
  CustomerFavoritesNotifier(this._repository) {
    ready = reload();
  }

  final CustomerFavouriteRepository _repository;
  late final Future<void> ready;
  List<OreVendor> _vendors = const <OreVendor>[];
  bool loading = true;

  List<OreVendor> get vendors => List.unmodifiable(_vendors);

  bool contains(String vendorId) => _vendors.any((vendor) => vendor.id == vendorId);

  Future<void> reload() async {
    loading = true;
    notifyListeners();
    try {
      _vendors = await _repository.list();
    } catch (_) {
      _vendors = const <OreVendor>[];
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> toggle(OreVendor vendor) async {
    try {
      _vendors = contains(vendor.id)
          ? await _repository.remove(vendor.id)
          : await _repository.add(vendor.id);
      notifyListeners();
    } catch (_) {
      rethrow;
    }
  }

  Future<void> remove(String vendorId) async {
    _vendors = await _repository.remove(vendorId);
    notifyListeners();
  }
}

final customerFavouriteRepositoryProvider = Provider<CustomerFavouriteRepository>((ref) {
  return CustomerFavouriteRepository(ref.watch(customerApiClientProvider));
});

final customerFavoritesProvider = ChangeNotifierProvider<CustomerFavoritesNotifier>((ref) {
  return CustomerFavoritesNotifier(ref.watch(customerFavouriteRepositoryProvider));
});
