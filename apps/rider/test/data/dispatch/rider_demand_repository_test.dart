import 'package:flutter_test/flutter_test.dart';
import 'package:ore_rider/data/dispatch/rider_demand_repository.dart';

void main() {
  test('parses demand zones used by the map without inventing cells', () {
    final payload = RiderDemandZones.fromJson(<String, dynamic>{
      'freshAt': '2026-08-19T12:00:00.000Z',
      'expiresAt': '2026-08-19T12:10:00.000Z',
      'zones': <Map<String, dynamic>>[
        <String, dynamic>{
          'zoneId': 'cc:cell:1',
          'zoneName': 'Cape Coast demand area 1',
          'centerLat': 5.1053,
          'centerLng': -1.2466,
          'radiusMeters': 1050,
          'distanceFromRiderKm': 0.8,
          'demandLevel': 'HIGH',
          'expectedOrdersNext30Min': 4,
          'expectedWaitMin': <String, dynamic>{'min': 6, 'max': 13},
          'confidence': 'MEDIUM',
          'freshAt': '2026-08-19T12:00:00.000Z',
          'expiresAt': '2026-08-19T12:10:00.000Z',
          'reason': 'FOOD demand is high while nearby idle supply is moderate',
          'onlineRidersNearby': 2,
          'unassignedOrdersNearby': 1,
          'serviceTypes': <String>['FOOD'],
        },
      ],
    });

    expect(payload.zones, hasLength(1));
    expect(payload.zones.single.hasValidCenter, isTrue);
    expect(payload.zones.single.centerLat, 5.1053);
    expect(payload.zones.single.radiusMeters, 1050);
    expect(payload.zones.single.demandLevel, 'HIGH');
  });

  test('rejects a zero coordinate as a map cell', () {
    final zone = RiderDemandZone.fromJson(<String, dynamic>{
      'zoneId': 'bad',
      'zoneName': 'Unknown',
      'centerLat': 0,
      'centerLng': 0,
      'radiusMeters': 900,
      'distanceFromRiderKm': 0,
      'demandLevel': 'LOW',
      'expectedOrdersNext30Min': 0,
      'expectedWaitMin': <String, dynamic>{'min': 8, 'max': 20},
      'confidence': 'LOW',
      'freshAt': '2026-08-19T12:00:00.000Z',
      'expiresAt': '2026-08-19T12:10:00.000Z',
      'reason': 'Not enough recent or historical order activity yet',
      'onlineRidersNearby': 0,
      'unassignedOrdersNearby': 0,
      'serviceTypes': <String>[],
    });

    expect(zone.hasValidCenter, isFalse);
  });
}
