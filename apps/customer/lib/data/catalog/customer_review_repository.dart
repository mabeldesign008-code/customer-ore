import 'package:ore_core/ore_core.dart';

class CustomerReviewRepository {
  const CustomerReviewRepository(this._client);

  final OreApiClient _client;

  Future<void> submit({
    required String orderId,
    required int rating,
    String? comment,
  }) async {
    await _client.post<Map<String, dynamic>>(
      OreEndpoints.createReview,
      data: <String, dynamic>{
        'orderId': orderId,
        'rating': rating,
        'comment': comment,
      },
    );
  }
}
