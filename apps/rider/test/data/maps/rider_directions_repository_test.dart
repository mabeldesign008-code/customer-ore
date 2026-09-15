import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';

import 'package:ore_rider/data/maps/rider_directions_repository.dart';

void main() {
  test('decodes the Google encoded polyline format', () {
    final points = decodeEncodedPolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');

    expect(points, hasLength(3));
    expect(points.first.latitude, closeTo(38.5, 0.00001));
    expect(points.first.longitude, closeTo(-120.2, 0.00001));
    expect(points[1].latitude, closeTo(40.7, 0.00001));
    expect(points[1].longitude, closeTo(-120.95, 0.00001));
    expect(points[2], const LatLng(43.252, -126.453));
  });

  test('rejects a malformed polyline', () {
    expect(() => decodeEncodedPolyline('!'), throwsA(isA<FormatException>()));
  });
}
