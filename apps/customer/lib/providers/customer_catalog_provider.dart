import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:ore_core/ore_core.dart';

import '../data/catalog/customer_catalog_repository.dart';
import 'customer_auth_provider.dart';

final customerCatalogRepositoryProvider = Provider<CustomerCatalogRepository>((
  ref,
) {
  return CustomerCatalogRepository(ref.watch(customerApiClientProvider));
});

class CustomerLocation {
  const CustomerLocation({required this.lat, required this.lng, this.label});

  final double lat;
  final double lng;
  final String? label;
}

class CustomerLocationOverrideNotifier extends Notifier<CustomerLocation?> {
  @override
  CustomerLocation? build() => null;

  void set(CustomerLocation location) => state = location;
  void clear() => state = null;
}

final customerLocationOverrideProvider =
    NotifierProvider<CustomerLocationOverrideNotifier, CustomerLocation?>(
      CustomerLocationOverrideNotifier.new,
    );

final customerLocationProvider = FutureProvider<CustomerLocation>((ref) async {
  final override = ref.watch(customerLocationOverrideProvider);
  if (override != null) return override;

  // Browsing is allowed for guests and must not be blocked by a denied device
  // permission. The fallback is only a catalog query centre; checkout still
  // requires a customer-pinned delivery coordinate.
  const fallback = CustomerLocation(
    lat: 5.1174,
    lng: -1.2990,
    label: 'Cape Coast service area',
  );
  try {
    if (!await Geolocator.isLocationServiceEnabled()) return fallback;
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return fallback;
    }
    final position = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );
    // The customer catalog currently serves Cape Coast only. Do not let a
    // browser/device GPS reading from another city turn the home screen into
    // a failed out-of-zone request; explicit place selections still take
    // precedence through customerLocationOverrideProvider.
    final inCapeCoast =
        position.latitude >= 4.95 &&
        position.latitude <= 5.25 &&
        position.longitude >= -1.45 &&
        position.longitude <= -1.15;
    if (!inCapeCoast) return fallback;
    return CustomerLocation(lat: position.latitude, lng: position.longitude);
  } catch (_) {
    return fallback;
  }
});

final customerVendorsProvider =
    FutureProvider.family<List<OreVendor>, ServiceType>((ref, type) async {
      final location = await ref.watch(customerLocationProvider.future);
      return ref
          .watch(customerCatalogRepositoryProvider)
          .listVendors(lat: location.lat, lng: location.lng, type: type);
    });

final customerVendorDetailProvider =
    FutureProvider.family<CustomerVendorDetail, String>((ref, vendorId) async {
      return ref.watch(customerCatalogRepositoryProvider).getVendor(vendorId);
    });

final customerSearchProvider =
    FutureProvider.family<List<CustomerSearchResult>, String>((
      ref,
      query,
    ) async {
      if (query.trim().isEmpty) return const <CustomerSearchResult>[];
      final location = await ref.watch(customerLocationProvider.future);
      return ref
          .watch(customerCatalogRepositoryProvider)
          .searchItems(query: query, lat: location.lat, lng: location.lng);
    });
