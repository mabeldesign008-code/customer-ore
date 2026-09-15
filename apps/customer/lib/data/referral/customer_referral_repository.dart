import 'package:ore_core/ore_core.dart';

import '../auth/customer_auth_repository.dart';

class CustomerReferralStats {
  const CustomerReferralStats({
    required this.code,
    required this.pending,
    required this.credited,
    required this.earnedPesewas,
  });

  final String code;
  final int pending;
  final int credited;
  final int earnedPesewas;

  factory CustomerReferralStats.fromJson(Object? json) {
    if (json is! Map) {
      throw const FormatException('Referral stats response must be an object');
    }
    final row = Map<String, dynamic>.from(json);
    final code = row['code'];
    final codeRow = code is Map ? Map<String, dynamic>.from(code) : <String, dynamic>{};
    final value = code is String ? code : codeRow['code'];
    if (value is! String || value.trim().isEmpty) {
      throw const FormatException('Referral code is missing');
    }
    return CustomerReferralStats(
      code: value,
      pending: (row['pending'] as num?)?.toInt() ?? 0,
      credited: (row['credited'] as num?)?.toInt() ?? 0,
      earnedPesewas: (row['earnedPesewas'] as num?)?.toInt() ?? 0,
    );
  }
}

class CustomerReferral {
  const CustomerReferral({
    required this.id,
    required this.code,
    required this.status,
    required this.refereePhone,
    required this.createdAt,
    this.creditedAt,
  });

  final String id;
  final String code;
  final String status;
  final String refereePhone;
  final DateTime createdAt;
  final DateTime? creditedAt;

  factory CustomerReferral.fromJson(Object? json) {
    if (json is! Map) {
      throw const FormatException('Referral response must be an object');
    }
    final row = Map<String, dynamic>.from(json);
    return CustomerReferral(
      id: row['id']?.toString() ?? '',
      code: row['code']?.toString() ?? '',
      status: row['status']?.toString() ?? 'PENDING',
      refereePhone: row['refereePhone']?.toString() ?? '',
      createdAt: DateTime.tryParse(row['createdAt']?.toString() ?? '') ?? DateTime.now(),
      creditedAt: DateTime.tryParse(row['creditedAt']?.toString() ?? ''),
    );
  }
}

class CustomerReferralRepository {
  const CustomerReferralRepository(this._client);

  final OreApiClient _client;

  Future<CustomerReferralStats> getStats() async {
    final response = await _client.getFresh<Map<String, dynamic>>(
      OreEndpoints.customerReferral,
    );
    return CustomerReferralStats.fromJson(response.data);
  }

  Future<List<CustomerReferral>> getMine() async {
    final response = await _client.getFresh<List<dynamic>>(
      OreEndpoints.customerReferrals,
    );
    return (response.data ?? const <dynamic>[])
        .map(CustomerReferral.fromJson)
        .toList(growable: false);
  }

  Future<void> claim({required String code, required String phone}) async {
    await _client.post<Map<String, dynamic>>(
      OreEndpoints.claimReferral,
      data: <String, dynamic>{'code': code.trim().toUpperCase(), 'phone': normalizeCustomerPhone(phone)},
    );
  }
}
