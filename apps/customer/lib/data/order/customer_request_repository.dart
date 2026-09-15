import 'package:ore_core/ore_core.dart';

class CustomerRequestRepository {
  const CustomerRequestRepository(this._client);

  final OreApiClient _client;

  Future<Map<String, dynamic>> createParcel({required Map<String, dynamic> payload}) async {
    final response = await _client.post<Map<String, dynamic>>(OreEndpoints.createParcel, data: payload);
    return response.data ?? <String, dynamic>{};
  }

  Future<Map<String, dynamic>> createErrand({required Map<String, dynamic> payload}) async {
    final response = await _client.post<Map<String, dynamic>>(OreEndpoints.createErrand, data: payload);
    return response.data ?? <String, dynamic>{};
  }

  Future<void> decideErrandSubstitution({required String orderId, required bool approve}) async {
    await _client.post<Map<String, dynamic>>(
      OreEndpoints.errandSubstitutionDecision(orderId),
      data: <String, bool>{'approve': approve},
    );
  }
}
