import 'package:ore_core/ore_core.dart';

class CustomerDispute {
  const CustomerDispute({
    required this.id,
    required this.orderId,
    required this.reason,
    required this.description,
    required this.status,
    required this.createdAt,
    this.decisionPesewas = 0,
    this.refundedPesewas = 0,
    this.refundMethod,
    this.note,
  });

  final String id;
  final String orderId;
  final String reason;
  final String description;
  final String status;
  final DateTime createdAt;
  final int decisionPesewas;
  final int refundedPesewas;
  final String? refundMethod;
  final String? note;

  factory CustomerDispute.fromJson(Object? json) {
    if (json is! Map) {
      throw const FormatException('Dispute response must be an object');
    }
    final row = Map<String, dynamic>.from(json);
    return CustomerDispute(
      id: row['id']?.toString() ?? '',
      orderId: row['orderId']?.toString() ?? '',
      reason: row['reason']?.toString() ?? 'OTHER',
      description: row['description']?.toString() ?? '',
      status: row['status']?.toString() ?? 'OPEN',
      createdAt: DateTime.tryParse(row['createdAt']?.toString() ?? '') ?? DateTime.now(),
      decisionPesewas: (row['decisionPesewas'] as num?)?.toInt() ?? 0,
      refundedPesewas: (row['refundedPesewas'] as num?)?.toInt() ?? 0,
      refundMethod: row['refundMethod']?.toString(),
      note: row['note']?.toString(),
    );
  }
}

class CustomerDisputeRepository {
  const CustomerDisputeRepository(this._client);

  final OreApiClient _client;

  Future<List<CustomerDispute>> getMine() async {
    final response = await _client.getFresh<List<dynamic>>(
      OreEndpoints.customerDisputes,
    );
    return (response.data ?? const <dynamic>[])
        .map(CustomerDispute.fromJson)
        .toList(growable: false);
  }

  Future<void> open({
    required String orderId,
    required String reason,
    required String description,
  }) async {
    await _client.post<Map<String, dynamic>>(
      OreEndpoints.openCustomerDispute,
      data: <String, dynamic>{
        'orderId': orderId,
        'reason': reason,
        'description': description,
      },
    );
  }
}
