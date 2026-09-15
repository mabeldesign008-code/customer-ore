import 'package:ore_core/ore_core.dart';

enum GeocodeMethod {
  ghanaGps,
  what3words,
  google,
}

class PlaceSuggestion {
  const PlaceSuggestion({
    required this.placeId,
    required this.description,
    required this.mainText,
    required this.secondaryText,
  });

  final String placeId;
  final String description;
  final String mainText;
  final String secondaryText;
}

class CustomerLocationRepository {
  const CustomerLocationRepository(this._client);

  final OreApiClient _client;

  // ── Google Places Autocomplete ──────────────────────────────────────────

  Future<List<PlaceSuggestion>> searchPlaces(String input, {String? sessionToken}) async {
    if (input.trim().length < 2) return const [];
    try {
      final response = await _client.post<Map<String, dynamic>>(
        OreEndpoints.placesAutocomplete,
        data: {
          'input': input.trim(),
          if (sessionToken != null) 'sessionToken': sessionToken,
        },
      );
      final data = response.data;
      if (data == null) return const [];
      final list = (data['suggestions'] as List<dynamic>? ?? []);
      return list.map((e) {
        final m = e as Map<String, dynamic>;
        return PlaceSuggestion(
          placeId: m['placeId'] as String? ?? '',
          description: m['description'] as String? ?? '',
          mainText: m['mainText'] as String? ?? m['description'] as String? ?? '',
          secondaryText: m['secondaryText'] as String? ?? '',
        );
      }).toList();
    } catch (_) {
      return const [];
    }
  }

  Future<OreAddress> resolvePlaceId(String placeId, String mainText, {String? sessionToken}) async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.placeDetails,
      data: {
        'placeId': placeId,
        if (sessionToken != null) 'sessionToken': sessionToken,
      },
    );
    final data = response.data;
    if (data == null || data['lat'] == null || data['lng'] == null) {
      throw const FormatException('Unable to resolve place details');
    }
    return OreAddress(
      label: (data['label'] as String?)?.trim() ?? mainText,
      street: (data['label'] as String?)?.trim() ?? mainText,
      city: 'Ghana',
      lat: (data['lat'] as num).toDouble(),
      lng: (data['lng'] as num).toDouble(),
    );
  }

  // ── Ghana GPS ─────────────────────────────────────────────────────────────

  Future<OreAddress> resolveGhanaGps(String digitalAddress) async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.geoResolve,
      data: {
        'mode': 'ghanagps',
        'digitalAddress': digitalAddress.trim(),
      },
    );
    final data = response.data;
    if (data == null || data['lat'] == null || data['lng'] == null) {
      throw const FormatException('Unable to resolve Ghana GPS address');
    }
    final lat = (data['lat'] as num).toDouble();
    final lng = (data['lng'] as num).toDouble();
    final label = (data['label'] as String?)?.trim() ?? digitalAddress.trim();
    final cleanGps = (data['digitalAddress'] as String?)?.trim() ?? digitalAddress.trim();

    return OreAddress(
      label: label,
      street: label,
      city: 'Accra',
      ghanaPost: cleanGps,
      lat: lat,
      lng: lng,
    );
  }

  // ── what3words ────────────────────────────────────────────────────────────

  Future<OreAddress> resolveWhat3Words(String words) async {
    final clean = words.trim().replaceAll(RegExp(r'^/+'), '');
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.geoResolve,
      data: {
        'mode': 'w3w',
        'words': clean,
      },
    );
    final data = response.data;
    if (data == null || data['lat'] == null || data['lng'] == null) {
      throw const FormatException('Unable to resolve what3words address');
    }
    final lat = (data['lat'] as num).toDouble();
    final lng = (data['lng'] as num).toDouble();
    final label = (data['label'] as String?)?.trim() ?? '///$clean';

    return OreAddress(
      label: '///$clean',
      street: label,
      city: 'Accra',
      what3words: '///$clean',
      lat: lat,
      lng: lng,
    );
  }

  // ── Google text search (fallback) ─────────────────────────────────────────

  Future<OreAddress> resolveGoogleSearch(String query) async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.geoResolve,
      data: {
        'mode': 'google',
        'query': query.trim(),
      },
    );
    final data = response.data;
    if (data == null || data['lat'] == null || data['lng'] == null) {
      throw const FormatException('Unable to resolve location query');
    }
    final lat = (data['lat'] as num).toDouble();
    final lng = (data['lng'] as num).toDouble();
    final label = (data['label'] as String?)?.trim() ?? query.trim();

    return OreAddress(
      label: label,
      street: label,
      city: 'Accra',
      lat: lat,
      lng: lng,
    );
  }
}
