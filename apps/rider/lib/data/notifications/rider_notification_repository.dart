import 'package:ore_core/ore_core.dart';

class RiderNotification {
  const RiderNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    required this.read,
    required this.createdAt,
    this.data,
  });

  final String id;
  final String title;
  final String body;
  final String type;
  final bool read;
  final DateTime createdAt;
  final Map<String, dynamic>? data;

  factory RiderNotification.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Notification must be a JSON object');
    }
    final data = json['dataJson'];
    return RiderNotification(
      id: _requiredString(json['id'], 'notification.id'),
      title: _requiredString(json['title'], 'notification.title'),
      body: _requiredString(json['body'], 'notification.body'),
      type: _requiredString(json['type'], 'notification.type'),
      read: json['read'] is bool ? json['read'] as bool : false,
      createdAt: _requiredDateTime(json['createdAt'], 'notification.createdAt'),
      data: data is Map ? Map<String, dynamic>.from(data) : null,
    );
  }
}

class RiderNotificationRepository {
  const RiderNotificationRepository(this._client);

  final OreApiClient _client;

  Future<List<RiderNotification>> getFeed() async {
    final response = await _client.getFresh<List<dynamic>>(
      OreEndpoints.notificationsMe,
    );
    return (response.data ?? const <dynamic>[])
        .map(RiderNotification.fromJson)
        .toList();
  }

  Future<RiderNotification> markRead(String id) async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.notificationRead(id),
    );
    return RiderNotification.fromJson(response.data);
  }
}

String _requiredString(Object? value, String field) {
  if (value is! String || value.isEmpty) throw FormatException('Missing $field');
  return value;
}

DateTime _requiredDateTime(Object? value, String field) {
  if (value is String) {
    final parsed = DateTime.tryParse(value);
    if (parsed != null) return parsed;
  }
  throw FormatException('Missing or invalid $field');
}
