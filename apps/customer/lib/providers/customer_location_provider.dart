import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ore_core/ore_core.dart';

import '../data/location/customer_location_repository.dart';
import 'customer_auth_provider.dart';

final customerLocationRepositoryProvider = Provider<CustomerLocationRepository>((ref) {
  return CustomerLocationRepository(ref.watch(customerApiClientProvider));
});
