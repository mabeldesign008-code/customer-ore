import 'package:ore_core/ore_core.dart';

class CustomerCreditLog {
  const CustomerCreditLog({required this.amountPesewas, required this.ref, required this.kind, required this.reason, required this.createdAt});

  final int amountPesewas;
  final String ref;
  final String kind;
  final String reason;
  final DateTime createdAt;

  factory CustomerCreditLog.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) throw const FormatException('Customer credit log must be an object');
    return CustomerCreditLog(
      amountPesewas: (json['amountPesewas'] as num?)?.toInt() ?? 0,
      ref: json['ref'] as String? ?? '',
      kind: json['kind'] as String? ?? 'manual',
      reason: json['reason'] as String? ?? '',
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}

class CustomerCreditStatement {
  const CustomerCreditStatement({required this.balancePesewas, required this.lifetimeCreditedPesewas, required this.lifetimeUsedPesewas, required this.logs});

  final int balancePesewas;
  final int lifetimeCreditedPesewas;
  final int lifetimeUsedPesewas;
  final List<CustomerCreditLog> logs;

  factory CustomerCreditStatement.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) throw const FormatException('Customer credit response must be an object');
    final balance = json['balance'];
    final log = json['log'];
    if (balance is! Map) throw const FormatException('Customer credit balance is missing');
    final balanceJson = Map<String, dynamic>.from(balance);
    return CustomerCreditStatement(
      balancePesewas: (balanceJson['creditPesewas'] as num?)?.toInt() ?? 0,
      lifetimeCreditedPesewas: (balanceJson['lifetimeCreditedPesewas'] as num?)?.toInt() ?? 0,
      lifetimeUsedPesewas: (balanceJson['lifetimeUsedPesewas'] as num?)?.toInt() ?? 0,
      logs: log is List ? log.whereType<Map>().map((row) => CustomerCreditLog.fromJson(Map<String, dynamic>.from(row))).toList(growable: false) : const <CustomerCreditLog>[],
    );
  }
}

class CustomerWalletTopUp {
  const CustomerWalletTopUp({
    required this.reference,
    required this.amountPesewas,
    required this.status,
    this.paystackUrl,
    this.mode,
    this.paidAt,
  });

  final String reference;
  final int amountPesewas;
  final String status;
  final String? paystackUrl;
  final String? mode;
  final DateTime? paidAt;

  factory CustomerWalletTopUp.fromJson(Object? json) {
    if (json is! Map) throw const FormatException('Wallet top-up response must be an object');
    final row = Map<String, dynamic>.from(json);
    return CustomerWalletTopUp(
      reference: row['reference']?.toString() ?? '',
      amountPesewas: (row['amountPesewas'] as num?)?.toInt() ?? 0,
      status: row['status']?.toString() ?? 'INITIATED',
      paystackUrl: row['paystackUrl']?.toString(),
      mode: row['mode']?.toString(),
      paidAt: DateTime.tryParse(row['paidAt']?.toString() ?? ''),
    );
  }
}

class CustomerCreditRepository {
  const CustomerCreditRepository(this._client);

  final OreApiClient _client;

  Future<CustomerCreditStatement> getStatement() async {
    final response = await _client.getFresh<Map<String, dynamic>>(OreEndpoints.customerCredit);
    return CustomerCreditStatement.fromJson(response.data);
  }

  Future<CustomerWalletTopUp> initializeTopUp({required int amountPesewas}) async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.customerWalletTopUp,
      data: <String, dynamic>{'amountPesewas': amountPesewas},
    );
    return CustomerWalletTopUp.fromJson(response.data);
  }

  Future<CustomerWalletTopUp> getTopUp(String reference) async {
    final response = await _client.getFresh<Map<String, dynamic>>(
      OreEndpoints.customerWalletTopUpByRef(reference),
    );
    return CustomerWalletTopUp.fromJson(response.data);
  }
}
