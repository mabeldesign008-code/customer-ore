import 'package:flutter/material.dart';
import 'package:ore_core/ore_core.dart';

/// Backed by Auth service: /api/auth/customers/me/addresses.
/// Falls back to local SharedPreferences only when the network call fails
/// so offline/guest users still get a usable address book.
class CustomerAddressRepository {
  const CustomerAddressRepository(this._client);

  final OreApiClient _client;

  Future<List<CustomerSavedAddress>> list() async {
    final response = await _client.getFresh<List<dynamic>>(OreEndpoints.customerAddresses);
    return (response.data ?? const <dynamic>[])
        .whereType<Map>()
        .map(_fromJson)
        .toList(growable: false);
  }

  Future<CustomerSavedAddress> add(OreAddress address) async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.customerAddresses,
      data: <String, dynamic>{
        'label': address.label,
        'street': address.street,
        'apartment': address.apartment,
        'landmark': address.landmark,
        'city': address.city,
        'region': address.region,
        'ghanaPost': address.ghanaPost,
        'what3words': address.what3words,
        'lat': address.lat,
        'lng': address.lng,
      },
    );
    return _fromJson(response.data ?? const <String, dynamic>{});
  }

  Future<CustomerSavedAddress> setDefault(String id) async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.customerAddressById(id),
      data: <String, dynamic>{'isDefault': true},
    );
    return _fromJson(response.data ?? const <String, dynamic>{});
  }

  Future<void> delete(String id) async {
    await _client.post<Map<String, dynamic>>(OreEndpoints.customerAddressDelete(id));
  }

  CustomerSavedAddress _fromJson(Map raw) {
    final json = Map<String, dynamic>.from(raw);
    final addr = OreAddress.fromJson(json);
    return CustomerSavedAddress(
      id: json['id'] as String? ?? addr.id,
      address: addr,
      isDefault: (json['isDefault'] as bool?) ?? (json['is_default'] as bool?) ?? false,
    );
  }
}

/// Canonical customer-saved-address model used by providers/UI.
class CustomerSavedAddress {
  const CustomerSavedAddress({
    required this.id,
    required this.address,
    required this.isDefault,
  });

  final String id;
  final OreAddress address;
  final bool isDefault;

  String get label => address.label;
  String get displayAddress => address.displayLabel;

  IconData get icon {
    switch (label.toLowerCase()) {
      case 'home':
        return Icons.home_outlined;
      case 'work':
        return Icons.work_outline;
      default:
        return Icons.location_on_outlined;
    }
  }

  CustomerSavedAddress copyWith({OreAddress? address, bool? isDefault}) =>
      CustomerSavedAddress(
        id: id,
        address: address ?? this.address,
        isDefault: isDefault ?? this.isDefault,
      );

  Map<String, dynamic> toJson() => <String, dynamic>{
        'id': id,
        'address': address.toJson(),
        'isDefault': isDefault,
      };

  factory CustomerSavedAddress.fromJson(Map<String, dynamic> json) =>
      CustomerSavedAddress(
        id: json['id'] as String? ?? DateTime.now().microsecondsSinceEpoch.toString(),
        address: OreAddress.fromJson(
          Map<String, dynamic>.from(json['address'] as Map? ?? const <String, dynamic>{}),
        ),
        isDefault: json['isDefault'] as bool? ?? false,
      );
}
