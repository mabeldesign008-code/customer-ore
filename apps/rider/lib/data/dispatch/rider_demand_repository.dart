import 'package:ore_core/ore_core.dart';

class RiderDemandZone {
  const RiderDemandZone({
    required this.zoneId,
    required this.zoneName,
    required this.centerLat,
    required this.centerLng,
    required this.radiusMeters,
    required this.distanceFromRiderKm,
    required this.demandLevel,
    required this.expectedOrdersNext30Min,
    required this.expectedWaitMin,
    required this.expectedWaitMax,
    required this.confidence,
    required this.freshAt,
    required this.expiresAt,
    required this.reason,
    required this.onlineRidersNearby,
    required this.unassignedOrdersNearby,
    required this.serviceTypes,
  });

  final String zoneId;
  final String zoneName;
  final double centerLat;
  final double centerLng;
  final double radiusMeters;
  final double distanceFromRiderKm;
  final String demandLevel;
  final int expectedOrdersNext30Min;
  final int expectedWaitMin;
  final int expectedWaitMax;
  final String confidence;
  final DateTime freshAt;
  final DateTime expiresAt;
  final String reason;
  final int onlineRidersNearby;
  final int unassignedOrdersNearby;
  final List<String> serviceTypes;

  bool get isStale => DateTime.now().isAfter(expiresAt);

  bool get hasValidCenter => centerLat.abs() > 0.0001 || centerLng.abs() > 0.0001;

  factory RiderDemandZone.fromJson(Object? json) {
    if (json is! Map) {
      throw const FormatException('Demand zone must be a JSON object');
    }
    final row = Map<String, dynamic>.from(json);
    final wait = row['expectedWaitMin'];
    if (wait is! Map) throw const FormatException('Demand zone wait range is missing');
    final serviceTypes = row['serviceTypes'];
    final freshAt = DateTime.tryParse(row['freshAt']?.toString() ?? '');
    final expiresAt = DateTime.tryParse(row['expiresAt']?.toString() ?? '');
    if (freshAt == null || expiresAt == null) {
      throw const FormatException('Demand zone freshness timestamps are invalid');
    }
    return RiderDemandZone(
      zoneId: _requiredString(row['zoneId'], 'zoneId'),
      zoneName: _requiredString(row['zoneName'], 'zoneName'),
      centerLat: _requiredDouble(row['centerLat'], 'centerLat'),
      centerLng: _requiredDouble(row['centerLng'], 'centerLng'),
      radiusMeters: _requiredDouble(row['radiusMeters'], 'radiusMeters'),
      distanceFromRiderKm: _requiredDouble(row['distanceFromRiderKm'], 'distanceFromRiderKm'),
      demandLevel: _requiredString(row['demandLevel'], 'demandLevel'),
      expectedOrdersNext30Min: _requiredInt(row['expectedOrdersNext30Min'], 'expectedOrdersNext30Min'),
      expectedWaitMin: _requiredInt(wait['min'], 'expectedWaitMin.min'),
      expectedWaitMax: _requiredInt(wait['max'], 'expectedWaitMin.max'),
      confidence: _requiredString(row['confidence'], 'confidence'),
      freshAt: freshAt,
      expiresAt: expiresAt,
      reason: _requiredString(row['reason'], 'reason'),
      onlineRidersNearby: _requiredInt(row['onlineRidersNearby'], 'onlineRidersNearby'),
      unassignedOrdersNearby: _requiredInt(row['unassignedOrdersNearby'], 'unassignedOrdersNearby'),
      serviceTypes: serviceTypes is List ? serviceTypes.whereType<String>().toList(growable: false) : const <String>[],
    );
  }
}

class RiderDemandZones {
  const RiderDemandZones({required this.freshAt, required this.expiresAt, required this.zones});

  final DateTime freshAt;
  final DateTime expiresAt;
  final List<RiderDemandZone> zones;

  bool get isStale => DateTime.now().isAfter(expiresAt);

  factory RiderDemandZones.fromJson(Object? json) {
    if (json is! Map) {
      throw const FormatException('Demand zones response must be a JSON object');
    }
    final row = Map<String, dynamic>.from(json);
    final freshAt = DateTime.tryParse(row['freshAt']?.toString() ?? '');
    final expiresAt = DateTime.tryParse(row['expiresAt']?.toString() ?? '');
    final rawZones = row['zones'];
    if (freshAt == null || expiresAt == null || rawZones is! List) {
      throw const FormatException('Demand zones response is invalid');
    }
    return RiderDemandZones(
      freshAt: freshAt,
      expiresAt: expiresAt,
      zones: rawZones.map(RiderDemandZone.fromJson).toList(growable: false),
    );
  }
}

class RiderDemandRepository {
  const RiderDemandRepository(this._client);

  final OreApiClient _client;

  Future<RiderDemandZones> getDemandZones() async {
    final response = await _client.getFresh<Map<String, dynamic>>(
      OreEndpoints.riderDemandZones,
    );
    return RiderDemandZones.fromJson(response.data);
  }
}

String _requiredString(Object? value, String field) {
  if (value is! String || value.trim().isEmpty) {
    throw FormatException('Missing or invalid demand zone $field');
  }
  return value;
}

double _requiredDouble(Object? value, String field) {
  if (value is num) return value.toDouble();
  throw FormatException('Missing or invalid demand zone $field');
}

int _requiredInt(Object? value, String field) {
  if (value is num) return value.toInt();
  throw FormatException('Missing or invalid demand zone $field');
}
