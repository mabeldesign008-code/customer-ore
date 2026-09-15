import 'package:ore_core/ore_core.dart';

class CustomerFavouriteRepository {
  const CustomerFavouriteRepository(this._client);

  final OreApiClient _client;

  Future<List<OreVendor>> list() async {
    final response = await _client.getFresh<List<dynamic>>(OreEndpoints.customerFavourites);
    return (response.data ?? const <dynamic>[]).whereType<Map>().map(_vendor).toList(growable: false);
  }

  Future<List<OreVendor>> add(String vendorId) async {
    final response = await _client.post<List<dynamic>>(
      OreEndpoints.customerFavourites,
      data: <String, String>{'vendorId': vendorId},
    );
    return (response.data ?? const <dynamic>[]).whereType<Map>().map(_vendor).toList(growable: false);
  }

  Future<List<OreVendor>> remove(String vendorId) async {
    final response = await _client.post<List<dynamic>>(OreEndpoints.customerFavouriteRemove(vendorId));
    return (response.data ?? const <dynamic>[]).whereType<Map>().map(_vendor).toList(growable: false);
  }

  OreVendor _vendor(Map raw) {
    final json = Map<String, dynamic>.from(raw);
    final typeName = (json['vendorType'] ?? json['serviceCode'] ?? 'FOOD').toString().toUpperCase();
    final type = ServiceType.values.firstWhere(
      (value) => value.name.toUpperCase() == typeName || value.name.toUpperCase().startsWith(typeName.substring(0, typeName.length > 2 ? 2 : typeName.length)),
      orElse: () => ServiceType.food,
    );
    return OreVendor(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      logoUrl: json['logoUrl'] as String?,
      coverUrl: json['bannerUrl'] as String?,
      serviceType: type,
      category: type.label,
      isOpen: json['openNow'] as bool? ?? true,
      lat: (json['lat'] as num?)?.toDouble(),
      lng: (json['lng'] as num?)?.toDouble(),
    );
  }
}
