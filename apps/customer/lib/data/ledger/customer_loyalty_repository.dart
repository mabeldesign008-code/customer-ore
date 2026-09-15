import 'package:ore_core/ore_core.dart';

class CustomerLoyalty {
  const CustomerLoyalty({
    required this.points,
    required this.lifetimeEarned,
    required this.lifetimeRedeemed,
    required this.redeemBlockPoints,
    required this.redeemBlockPesewas,
  });

  final int points;
  final int lifetimeEarned;
  final int lifetimeRedeemed;
  final int redeemBlockPoints;
  final int redeemBlockPesewas;

  factory CustomerLoyalty.fromJson(Object? json) {
    if (json is! Map) throw const FormatException('Loyalty must be an object');
    final row = Map<String, dynamic>.from(json);
    return CustomerLoyalty(
      points: (row['points'] as num?)?.toInt() ?? 0,
      lifetimeEarned: (row['lifetimeEarned'] as num?)?.toInt() ?? 0,
      lifetimeRedeemed: (row['lifetimeRedeemed'] as num?)?.toInt() ?? 0,
      redeemBlockPoints: (row['redeemBlockPoints'] as num?)?.toInt() ?? 100,
      redeemBlockPesewas: (row['redeemBlockPesewas'] as num?)?.toInt() ?? 100,
    );
  }
}

class CustomerLoyaltyRepository {
  const CustomerLoyaltyRepository(this._client);

  final OreApiClient _client;

  Future<CustomerLoyalty> get() async {
    final response = await _client.getFresh<Map<String, dynamic>>(OreEndpoints.customerLoyalty);
    return CustomerLoyalty.fromJson(response.data);
  }

  Future<CustomerLoyalty> redeem(int points) async {
    await _client.post<Map<String, dynamic>>(
      OreEndpoints.redeemLoyalty,
      data: <String, int>{'points': points},
    );
    return get();
  }
}
