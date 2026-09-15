import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:ore_core/ore_core.dart';

import '../data/address/customer_address_repository.dart';
import 'customer_auth_provider.dart';

/// Backend-synced customer address book.
///
/// Loads from Auth service `/customers/me/addresses` when authenticated.
/// Local SharedPreferences remain as a cache and as the source of truth
/// during guest sessions or transient network failures.
class CustomerAddressBook extends ChangeNotifier {
  CustomerAddressBook({required this.storageKey, this.repository});

  final String storageKey;
  final CustomerAddressRepository? repository;

  late final Future<void> ready;
  List<CustomerSavedAddress> _addresses = const <CustomerSavedAddress>[];
  bool loading = true;
  String? error;
  bool _hasTriedRemote = false;

  List<CustomerSavedAddress> get addresses => List.unmodifiable(_addresses);

  CustomerSavedAddress? get defaultAddress {
    for (final a in _addresses) {
      if (a.isDefault) return a;
    }
    return _addresses.isEmpty ? null : _addresses.first;
  }

  @override
  void dispose() {
    super.dispose();
  }

  Future<void> _loadLocal() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(storageKey);
      if (raw != null && raw.isNotEmpty) {
        final decoded = jsonDecode(raw);
        if (decoded is List) {
          _addresses = decoded
              .whereType<Map>()
              .map((row) => CustomerSavedAddress.fromJson(Map<String, dynamic>.from(row)))
              .toList(growable: false);
        }
      }
    } catch (_) {
      // ignore local read errors
    }
  }

  Future<void> _persistLocal() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        storageKey,
        jsonEncode(_addresses.map((a) => a.toJson()).toList()),
      );
    } catch (_) {}
  }

  Future<void> _loadFromBackend() async {
    if (_hasTriedRemote || repository == null) return;
    _hasTriedRemote = true;
    try {
      final remote = await repository!.list();
      _addresses = remote;
      await _persistLocal();
      error = null;
    } catch (e) {
      error = 'Saved addresses could not be synced — showing device copy.';
      if (kDebugMode) debugPrint('address book remote failed: $e');
    }
  }

  Future<void> reload() async {
    loading = true;
    error = null;
    _hasTriedRemote = false;
    notifyListeners();
    await _loadLocal();
    await _loadFromBackend();
    loading = false;
    notifyListeners();
  }

  Future<void> add(OreAddress address) async {
    final saved = CustomerSavedAddress(
      id: address.id.isEmpty ? DateTime.now().microsecondsSinceEpoch.toString() : address.id,
      address: address,
      isDefault: _addresses.isEmpty,
    );
    _addresses = <CustomerSavedAddress>[..._addresses, saved];
    notifyListeners();
    await _persistLocal();

    if (repository != null) {
      try {
        final remote = await repository!.add(address);
        // Replace the optimistic local ID with the server-issued ID.
        _addresses = _addresses.map((a) => identical(a, saved) ? remote : a).toList();
        await _persistLocal();
      } catch (e) {
        error = 'Address saved to this device only. Sync failed.';
        if (kDebugMode) debugPrint('address add remote failed: $e');
      }
    }
    notifyListeners();
  }

  Future<void> remove(String id) async {
    final removingDefault = _addresses.any((a) => a.id == id && a.isDefault);
    var next = _addresses.where((a) => a.id != id).toList(growable: false);
    if (removingDefault && next.isNotEmpty) {
      next = <CustomerSavedAddress>[next.first.copyWith(isDefault: true), ...next.skip(1)];
    }
    _addresses = next;
    notifyListeners();
    await _persistLocal();

    if (repository != null) {
      try {
        await repository!.delete(id);
      } catch (_) {}
    }
  }

  Future<void> setDefault(String id) async {
    _addresses = _addresses
        .map((a) => a.copyWith(isDefault: a.id == id))
        .toList(growable: false);
    notifyListeners();
    await _persistLocal();
    if (repository != null) {
      try {
        await repository!.setDefault(id);
      } catch (_) {}
    }
  }
}

final customerAddressBookProvider = ChangeNotifierProvider<CustomerAddressBook>((ref) {
  final auth = ref.watch(customerAuthProvider);
  final customerId = auth.user?.id ?? 'guest';
  final repository = auth.isAuthenticated
      ? CustomerAddressRepository(ref.watch(customerApiClientProvider))
      : null;
  final book = CustomerAddressBook(
    storageKey: 'customer_saved_addresses_$customerId',
    repository: repository,
  );
  book.ready = book._loadLocal().then((_) {
    book.loading = false;
    book.notifyListeners();
    book._loadFromBackend().then((_) {
      book.loading = false;
      book.notifyListeners();
    });
  });
  return book;
});

/// The currently selected delivery address (shared across checkout & flow screens).
class SelectedAddressController extends ChangeNotifier {
  CustomerSavedAddress? _selected;
  CustomerSavedAddress? get selected => _selected;

  void select(CustomerSavedAddress? a) {
    _selected = a;
    notifyListeners();
  }
}

final selectedAddressProvider = ChangeNotifierProvider<SelectedAddressController>((ref) {
  // Default to the user's default address when the book is loaded.
  final ctrl = SelectedAddressController();
  ref.listen(customerAddressBookProvider, (prev, next) {
    if (ctrl._selected == null) ctrl.select(next.defaultAddress);
  }, fireImmediately: true);
  return ctrl;
});
