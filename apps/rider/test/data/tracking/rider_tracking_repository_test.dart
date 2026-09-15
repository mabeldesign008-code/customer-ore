import 'package:flutter_test/flutter_test.dart';

import 'package:ore_rider/data/tracking/rider_tracking_repository.dart';

void main() {
  test('serializes a location sample without unsupported fields', () {
    const sample = RiderLocationSample(
      lat: 5.56,
      lng: -0.18,
      speedKmh: 24.5,
      orderId: 'order-id',
    );

    final json = sample.toJson();

    expect(json['lat'], 5.56);
    expect(json['lng'], -0.18);
    expect(json['speedKmh'], 24.5);
    expect(json['orderId'], 'order-id');
  });

  test('parses a queued location sample', () {
    final sample = RiderLocationSample.fromJson(
      <String, dynamic>{
        'lat': 5.56,
        'lng': -0.18,
        'speedKmh': 0,
      },
    );

    expect(sample.lat, 5.56);
    expect(sample.orderId, isNull);
  });
}
