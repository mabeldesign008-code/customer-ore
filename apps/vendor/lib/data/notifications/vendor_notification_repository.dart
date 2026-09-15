import 'package:ore_core/ore_core.dart';

class VendorNotification {
  const VendorNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    required this.read,
    required this.createdAt,
  });

  final String id;
  final String title;
  final String body;
  final String type;
  final bool read;
  final DateTime createdAt;

  factory VendorNotification.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) throw const FormatException('Vendor notification must be an object');
    return VendorNotification(
      id: _requiredString(json['id'], 'notification.id'),
      title: _requiredString(json['title'], 'notification.title'),
      body: _requiredString(json['body'], 'notification.body'),
      type: _requiredString(json['type'], 'notification.type'),
      read: json['read'] is bool ? json['read'] as bool : false,
      createdAt: _requiredDateTime(json['createdAt'], 'notification.createdAt'),
    );
  }
}

class VendorNotificationRepository {
  const VendorNotificationRepository(this._client);

  final OreApiClient _client;

  Future<List<VendorNotification>> getFeed() async {
    final response = await _client.getFresh<List<dynamic>>(OreEndpoints.notificationsMe);
    return (response.data ?? const <dynamic>[]).map(VendorNotification.fromJson).toList();
  }

  Future<VendorNotification> markRead(String id) async {
    final response = await _client.post<Map<String, dynamic>>(OreEndpoints.notificationRead(id));
    return VendorNotification.fromJson(response.data);
  }
}

String _requiredString(Object? value, String field) {
  if (value is! String || value.isEmpty) throw FormatException('Missing or invalid $field');
  return value;
}

DateTime _requiredDateTime(Object? value, String field) {
  if (value is String) {
    final parsed = DateTime.tryParse(value);
    if (parsed != null) return parsed;
  }
  throw FormatException('Missing or invalid $field');
}
