import 'package:ore_core/ore_core.dart';

class CustomerVoucher {
  const CustomerVoucher({
    required this.code,
    required this.title,
    required this.vendorId,
    required this.promotionId,
    required this.active,
    this.endsAt,
  });

  final String code;
  final String title;
  final String vendorId;
  final String promotionId;
  final bool active;
  final DateTime? endsAt;

  factory CustomerVoucher.fromJson(Object? json) {
    if (json is! Map) throw const FormatException('Voucher must be an object');
    final row = Map<String, dynamic>.from(json);
    return CustomerVoucher(
      code: row['code'] as String? ?? '',
      title: row['title'] as String? ?? '',
      vendorId: row['vendorId'] as String? ?? '',
      promotionId: row['promotionId'] as String? ?? '',
      active: row['active'] == true,
      endsAt: row['endsAt'] is String ? DateTime.tryParse(row['endsAt'] as String) : null,
    );
  }
}

class CustomerVoucherRepository {
  const CustomerVoucherRepository(this._client);

  final OreApiClient _client;

  Future<List<CustomerVoucher>> list() async {
    final response = await _client.getFresh<List<dynamic>>(OreEndpoints.customerVouchers);
    return (response.data ?? const <dynamic>[]).map(CustomerVoucher.fromJson).toList(growable: false);
  }

  Future<CustomerVoucher> redeem(String code) async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.redeemVoucher,
      data: <String, String>{'code': code.trim().toUpperCase()},
    );
    return CustomerVoucher.fromJson(response.data);
  }
}
