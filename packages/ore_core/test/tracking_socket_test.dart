import 'package:flutter_test/flutter_test.dart';
import 'package:ore_core/ore_core.dart';

void main() {
  group('OreTrackingLocation.tryParse', () {
    test('parses the tracking socket / HTTP rider payload', () {
      final location = OreTrackingLocation.tryParse(<String, dynamic>{
        'riderId': 'rider-1',
        'lat': 5.1053,
        'lng': -1.2466,
        'ts': '2026-08-19T12:00:00.000Z',
      });

      expect(location, isNotNull);
      expect(location!.riderId, 'rider-1');
      expect(location.lat, 5.1053);
      expect(location.lng, -1.2466);
      expect(location.timestamp.toUtc().toIso8601String(), '2026-08-19T12:00:00.000Z');
    });

    test('rejects the (0, 0) stub and malformed payloads', () {
      expect(
        OreTrackingLocation.tryParse(<String, dynamic>{
          'riderId': 'rider-1',
          'lat': 0,
          'lng': 0,
          'ts': '2026-08-19T12:00:00.000Z',
        }),
        isNull,
      );
      expect(OreTrackingLocation.tryParse(<String, dynamic>{'lat': 5.1}), isNull);
      expect(OreTrackingLocation.tryParse(null), isNull);
    });
  });
}
