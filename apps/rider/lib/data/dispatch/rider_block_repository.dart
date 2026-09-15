import 'package:ore_core/ore_core.dart';

class RiderBlock {
  const RiderBlock({
    required this.id,
    required this.startsAt,
    required this.endsAt,
    required this.status,
  });

  final String id;
  final DateTime startsAt;
  final DateTime endsAt;
  final String status;

  bool get isScheduled => status == 'SCHEDULED';
  bool get isActive => status == 'ACTIVE';
  bool get canCancel => isScheduled;

  bool covers(DateTime now) =>
      !startsAt.isAfter(now) && endsAt.isAfter(now);

  factory RiderBlock.fromJson(Object? json) {
    if (json is! Map) {
      throw const FormatException('Scheduled dash must be a JSON object');
    }
    final row = Map<String, dynamic>.from(json);
    final startsAt = DateTime.tryParse(row['startsAt']?.toString() ?? '');
    final endsAt = DateTime.tryParse(row['endsAt']?.toString() ?? '');
    if (startsAt == null || endsAt == null) {
      throw const FormatException('Scheduled dash times are invalid');
    }
    final status = row['status'];
    if (status is! String || status.isEmpty) {
      throw const FormatException('Scheduled dash status is missing');
    }
    final id = row['id'];
    if (id is! String || id.isEmpty) {
      throw const FormatException('Scheduled dash id is missing');
    }
    return RiderBlock(id: id, startsAt: startsAt, endsAt: endsAt, status: status);
  }
}

class RiderBlockRepository {
  const RiderBlockRepository(this._client);

  final OreApiClient _client;

  Future<List<RiderBlock>> list() async {
    final response = await _client.getFresh<List<dynamic>>(OreEndpoints.riderBlocks);
    return (response.data ?? const <dynamic>[]).map(RiderBlock.fromJson).toList(growable: false);
  }

  Future<RiderBlock> create({required DateTime startsAt, required DateTime endsAt}) async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.riderBlocks,
      data: <String, String>{
        'startsAt': startsAt.toUtc().toIso8601String(),
        'endsAt': endsAt.toUtc().toIso8601String(),
      },
    );
    return RiderBlock.fromJson(response.data);
  }

  Future<RiderBlock> cancel(String id) async {
    final response = await _client.delete<Map<String, dynamic>>(OreEndpoints.riderBlock(id));
    return RiderBlock.fromJson(response.data);
  }
}
