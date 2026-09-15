import 'package:ore_core/ore_core.dart';

class RiderIncidentRepository {
  const RiderIncidentRepository(this._client);

  final OreApiClient _client;

  Future<String> create({
    required String type,
    String? orderId,
    String? note,
    double? lat,
    double? lng,
  }) async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.riderIncidents,
      data: <String, dynamic>{
        'type': type,
        if (orderId != null) 'orderId': orderId,
        if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
        if (lat != null) 'lat': lat,
        if (lng != null) 'lng': lng,
      },
    );
    final id = response.data?['id'];
    if (id is! String || id.isEmpty) throw const FormatException('Incident response did not contain an id');
    return id;
  }
}
