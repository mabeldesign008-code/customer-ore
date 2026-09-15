import 'package:dio/dio.dart';
import 'package:latlong2/latlong.dart';

/// Road route returned by Google's Directions API.
class RiderDrivingRoute {
  const RiderDrivingRoute({
    required this.points,
    required this.distanceMeters,
    required this.durationSeconds,
    this.summary,
  });

  final List<LatLng> points;
  final int distanceMeters;
  final int durationSeconds;
  final String? summary;
}

/// Google Maps Directions API client used to draw the actual road route on
/// the rider delivery map. The key is a build-time value so it can be
/// restricted to the app's Android/iOS/web origins on the PC deployment.
class RiderDirectionsRepository {
  RiderDirectionsRepository({Dio? dio})
      : _dio = dio ??
            Dio(
              BaseOptions(
                connectTimeout: const Duration(seconds: 15),
                receiveTimeout: const Duration(seconds: 15),
              ),
            );

  static const String apiKey = String.fromEnvironment('GOOGLE_MAPS_API_KEY');
  static const String endpoint =
      'https://maps.googleapis.com/maps/api/directions/json';

  final Dio _dio;

  Future<RiderDrivingRoute> getDrivingRoute({
    required LatLng origin,
    required LatLng destination,
  }) async {
    if (apiKey.isEmpty) {
      throw StateError(
        'GOOGLE_MAPS_API_KEY is required to calculate the delivery route',
      );
    }

    final response = await _dio.get<Map<String, dynamic>>(
      endpoint,
      queryParameters: <String, dynamic>{
        'origin': '${origin.latitude},${origin.longitude}',
        'destination': '${destination.latitude},${destination.longitude}',
        'mode': 'driving',
        'key': apiKey,
      },
    );
    final body = response.data;
    if (body == null || body['status'] != 'OK') {
      throw StateError(
        'Google Directions returned ${body?['status'] ?? 'an empty response'}',
      );
    }

    final routes = body['routes'];
    if (routes is! List || routes.isEmpty || routes.first is! Map) {
      throw StateError('Google Directions returned no route');
    }
    final route = Map<String, dynamic>.from(routes.first as Map);
    final overview = route['overview_polyline'];
    if (overview is! Map || overview['points'] is! String) {
      throw StateError('Google Directions returned no route polyline');
    }

    final legs = route['legs'];
    final firstLeg = legs is List && legs.isNotEmpty && legs.first is Map
        ? Map<String, dynamic>.from(legs.first as Map)
        : const <String, dynamic>{};
    final distance = firstLeg['distance'];
    final duration = firstLeg['duration'];

    return RiderDrivingRoute(
      points: decodeEncodedPolyline(overview['points'] as String),
      distanceMeters: _valueFromMetric(distance),
      durationSeconds: _valueFromMetric(duration),
      summary: route['summary'] as String?,
    );
  }

  static int _valueFromMetric(Object? value) {
    if (value is Map && value['value'] is num) {
      return (value['value'] as num).toInt();
    }
    return 0;
  }
}

/// Decodes Google's encoded polyline format into map coordinates.
List<LatLng> decodeEncodedPolyline(String encoded) {
  final points = <LatLng>[];
  var index = 0;
  var latitude = 0;
  var longitude = 0;

  while (index < encoded.length) {
    final latitudeDelta = _decodePolylineValue(encoded, index);
    index = latitudeDelta.nextIndex;
    final longitudeDelta = _decodePolylineValue(encoded, index);
    index = longitudeDelta.nextIndex;

    latitude += latitudeDelta.value;
    longitude += longitudeDelta.value;
    points.add(LatLng(latitude / 100000, longitude / 100000));
  }

  if (points.isEmpty) throw StateError('Google route polyline is empty');
  return points;
}

({int value, int nextIndex}) _decodePolylineValue(String encoded, int start) {
  var index = start;
  var shift = 0;
  var result = 0;

  while (true) {
    if (index >= encoded.length) {
      throw const FormatException('Malformed Google route polyline');
    }
    final byte = encoded.codeUnitAt(index++) - 63;
    result |= (byte & 0x1f) << shift;
    shift += 5;
    if (byte < 0x20) break;
    if (shift > 30) {
      throw const FormatException('Google route polyline value is too large');
    }
  }

  final value = (result & 1) == 1 ? ~(result >> 1) : result >> 1;
  return (value: value, nextIndex: index);
}
