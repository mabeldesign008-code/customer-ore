import 'package:ore_core/ore_core.dart';

class CustomerRiderPosition {
  const CustomerRiderPosition({required this.riderId, required this.lat, required this.lng, required this.timestamp});

  final String riderId;
  final double lat;
  final double lng;
  final DateTime timestamp;

  factory CustomerRiderPosition.fromJson(Object? json) {
    final parsed = OreTrackingLocation.tryParse(json);
    if (parsed == null) throw const FormatException('Rider position response is invalid');
    return CustomerRiderPosition(
      riderId: parsed.riderId,
      lat: parsed.lat,
      lng: parsed.lng,
      timestamp: parsed.timestamp,
    );
  }
}

class CustomerTrackingRepository {
  const CustomerTrackingRepository(this._client);

  final OreApiClient _client;

  Future<CustomerRiderPosition?> getRiderPosition(String orderId) async {
    final response = await _client.getFresh<Map<String, dynamic>>(OreEndpoints.orderTracking(orderId));
    if (response.data == null || response.data!.isEmpty) return null;
    final parsed = OreTrackingLocation.tryParse(response.data);
    if (parsed == null) return null;
    return CustomerRiderPosition(
      riderId: parsed.riderId,
      lat: parsed.lat,
      lng: parsed.lng,
      timestamp: parsed.timestamp,
    );
  }
}
