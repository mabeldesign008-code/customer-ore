import 'package:ore_core/ore_core.dart';

class CustomerNotificationRepository {
  const CustomerNotificationRepository(this._client);

  final OreApiClient _client;

  Future<List<Map<String, dynamic>>> getFeed() async {
    final response = await _client.getFresh<List<dynamic>>(OreEndpoints.notificationsMe);
    return (response.data ?? const <dynamic>[]).whereType<Map>().map((row) => Map<String, dynamic>.from(row)).toList(growable: false);
  }

  Future<void> markRead(String id) async {
    await _client.post<Map<String, dynamic>>(OreEndpoints.notificationRead(id));
  }

  Future<void> registerDeviceToken({required String token, required String platform}) async {
    await _client.post<Map<String, dynamic>>(
      OreEndpoints.notificationsDeviceToken,
      data: <String, String>{'token': token, 'platform': platform},
    );
  }
}
