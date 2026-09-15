import 'package:flutter_test/flutter_test.dart';
import 'package:ore_rider/data/maps/rider_turn_by_turn.dart';

void main() {
  test('Google URL before pickup is current → pickup → drop', () {
    final uri = RiderTurnByTurn.googleUriForTrip(
      pickupLat: 5.1053,
      pickupLng: -1.2466,
      dropLat: 5.1315,
      dropLng: -1.2795,
      headingToPickup: true,
    );

    expect(uri.host, 'www.google.com');
    expect(uri.path, '/maps/dir/');
    expect(uri.queryParameters['api'], '1');
    expect(uri.queryParameters['destination'], '5.1315,-1.2795');
    expect(uri.queryParameters['waypoints'], '5.1053,-1.2466');
    expect(uri.queryParameters['travelmode'], 'driving');
  });

  test('Google URL after pickup is current → drop only', () {
    final uri = RiderTurnByTurn.googleUriForTrip(
      pickupLat: 5.1053,
      pickupLng: -1.2466,
      dropLat: 5.1315,
      dropLng: -1.2795,
      headingToPickup: false,
    );

    expect(uri.queryParameters['destination'], '5.1315,-1.2795');
    expect(uri.queryParameters.containsKey('waypoints'), isFalse);
  });

  test('Apple URL points at the current stop', () {
    final toPickup = RiderTurnByTurn.appleUriForTrip(
      pickupLat: 5.1053,
      pickupLng: -1.2466,
      dropLat: 5.1315,
      dropLng: -1.2795,
      headingToPickup: true,
    );
    expect(toPickup.host, 'maps.apple.com');
    expect(toPickup.queryParameters['daddr'], '5.1053,-1.2466');
    expect(toPickup.queryParameters['dirflg'], 'd');

    final toDrop = RiderTurnByTurn.appleUriForTrip(
      pickupLat: 5.1053,
      pickupLng: -1.2466,
      dropLat: 5.1315,
      dropLng: -1.2795,
      headingToPickup: false,
    );
    expect(toDrop.queryParameters['daddr'], '5.1315,-1.2795');
  });

  test('rejects the (0,0) stub', () {
    expect(RiderTurnByTurn.hasUsablePoint(0, 0), isFalse);
    expect(RiderTurnByTurn.hasUsablePoint(5.1, -1.2), isTrue);
  });

  test('stacked extra waypoints join the Google URL without inventing a stop', () {
    final uri = RiderTurnByTurn.googleUriForTrip(
      pickupLat: 5.1053,
      pickupLng: -1.2466,
      dropLat: 5.1315,
      dropLng: -1.2795,
      headingToPickup: true,
      extraWaypoints: const [(lat: 5.11, lng: -1.25)],
    );

    expect(uri.queryParameters['waypoints'], '5.1053,-1.2466|5.11,-1.25');
  });
}
