import 'package:flutter/foundation.dart';
import 'package:url_launcher/url_launcher.dart';

/// External turn-by-turn for a delivery. In-app polyline stays the overview.
///
/// Google URL matches the demand-zone pattern
/// `https://www.google.com/maps/dir/?api=1&…`.
/// Before pickup the route is current location → pickup → drop.
/// After pickup it is current location → drop.
class RiderTurnByTurn {
  const RiderTurnByTurn._();

  static bool hasUsablePoint(double lat, double lng) {
    if (lat == 0 && lng == 0) return false;
    if (lat.abs() > 90 || lng.abs() > 180) return false;
    return true;
  }

  /// Same host/path as demand-zone navigation, with optional origin/waypoints.
  static Uri googleMapsDir({
    required double destinationLat,
    required double destinationLng,
    double? waypointLat,
    double? waypointLng,
    List<({double lat, double lng})> extraWaypoints = const [],
  }) {
    final buffer = StringBuffer(
      'https://www.google.com/maps/dir/?api=1&destination=$destinationLat,$destinationLng&travelmode=driving',
    );
    final points = <String>[
      if (waypointLat != null && waypointLng != null && hasUsablePoint(waypointLat, waypointLng))
        '$waypointLat,$waypointLng',
      for (final point in extraWaypoints)
        if (hasUsablePoint(point.lat, point.lng)) '${point.lat},${point.lng}',
    ];
    if (points.isNotEmpty) buffer.write('&waypoints=${points.join('|')}');
    return Uri.parse(buffer.toString());
  }

  static Uri appleMapsDir({
    required double destinationLat,
    required double destinationLng,
  }) {
    return Uri.parse(
      'https://maps.apple.com/?daddr=$destinationLat,$destinationLng&dirflg=d',
    );
  }

  static Uri googleUriForTrip({
    required double pickupLat,
    required double pickupLng,
    required double dropLat,
    required double dropLng,
    required bool headingToPickup,
    List<({double lat, double lng})> extraWaypoints = const [],
  }) {
    if (headingToPickup) {
      return googleMapsDir(
        destinationLat: dropLat,
        destinationLng: dropLng,
        waypointLat: pickupLat,
        waypointLng: pickupLng,
        extraWaypoints: extraWaypoints,
      );
    }
    return googleMapsDir(
      destinationLat: dropLat,
      destinationLng: dropLng,
      extraWaypoints: extraWaypoints,
    );
  }

  static Uri appleUriForTrip({
    required double pickupLat,
    required double pickupLng,
    required double dropLat,
    required double dropLng,
    required bool headingToPickup,
  }) {
    if (headingToPickup) {
      return appleMapsDir(destinationLat: pickupLat, destinationLng: pickupLng);
    }
    return appleMapsDir(destinationLat: dropLat, destinationLng: dropLng);
  }

  /// Opens Apple Maps on iOS (current stop), otherwise Google Maps dir.
  static Future<bool> open({
    required double pickupLat,
    required double pickupLng,
    required double dropLat,
    required double dropLng,
    required bool headingToPickup,
    List<({double lat, double lng})> extraWaypoints = const [],
  }) async {
    if (!hasUsablePoint(pickupLat, pickupLng) || !hasUsablePoint(dropLat, dropLng)) {
      return false;
    }

    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.iOS) {
      final apple = appleUriForTrip(
        pickupLat: pickupLat,
        pickupLng: pickupLng,
        dropLat: dropLat,
        dropLng: dropLng,
        headingToPickup: headingToPickup,
      );
      if (await canLaunchUrl(apple)) {
        return launchUrl(apple, mode: LaunchMode.externalApplication);
      }
    }

    final google = googleUriForTrip(
      pickupLat: pickupLat,
      pickupLng: pickupLng,
      dropLat: dropLat,
      dropLng: dropLng,
      headingToPickup: headingToPickup,
      extraWaypoints: extraWaypoints,
    );
    if (await canLaunchUrl(google)) {
      return launchUrl(google, mode: LaunchMode.externalApplication);
    }
    return false;
  }
}
