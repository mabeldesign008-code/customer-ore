import 'package:ore_core/ore_core.dart';

class VendorWithdrawalRecord {
  const VendorWithdrawalRecord({required this.id, required this.amountPesewas, required this.status, required this.createdAt, this.transferReference, this.processedAt});

  final String id;
  final int amountPesewas;
  final String status;
  final DateTime createdAt;
  final String? transferReference;
  final DateTime? processedAt;

  factory VendorWithdrawalRecord.fromJson(Object? json) {
    if (json is! Map || json['id'] is! String || json['amountPesewas'] is! num || json['status'] is! String || json['createdAt'] is! String) throw const FormatException('Vendor withdrawal fields are invalid');
    final createdAt = DateTime.tryParse(json['createdAt'] as String);
    if (createdAt == null) throw const FormatException('Vendor withdrawal date is invalid');
    return VendorWithdrawalRecord(id: json['id'] as String, amountPesewas: (json['amountPesewas'] as num).toInt(), status: json['status'] as String, createdAt: createdAt, transferReference: json['transferReference'] as String?, processedAt: json['processedAt'] is String ? DateTime.tryParse(json['processedAt'] as String) : null);
  }
}

class VendorBalanceSnapshot {
  const VendorBalanceSnapshot({
    required this.vendorId,
    required this.accruedPesewas,
    required this.reservePesewas,
    required this.owedPesewas,
    required this.paidOutPesewas,
    required this.bonusPesewas,
    this.pendingSettlementPesewas = 0,
    this.availablePesewas = 0,
  });

  final String vendorId;
  final int accruedPesewas;
  final int reservePesewas;
  final int owedPesewas;
  final int paidOutPesewas;
  final int bonusPesewas;
  final int pendingSettlementPesewas;
  final int availablePesewas;

  factory VendorBalanceSnapshot.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Vendor balance must be an object');
    }
    return VendorBalanceSnapshot(
      vendorId: _requiredString(json['vendorId'], 'balance.vendorId'),
      accruedPesewas: _requiredInt(json['accruedPesewas'], 'balance.accruedPesewas'),
      reservePesewas: _requiredInt(json['reservePesewas'], 'balance.reservePesewas'),
      owedPesewas: _requiredInt(json['owedPesewas'], 'balance.owedPesewas'),
      paidOutPesewas: _requiredInt(json['paidOutPesewas'], 'balance.paidOutPesewas'),
      bonusPesewas: _requiredInt(json['bonusPesewas'], 'balance.bonusPesewas'),
      pendingSettlementPesewas: _optionalInt(json['pendingSettlementPesewas']) ?? 0,
      availablePesewas: _optionalInt(json['availablePesewas']) ?? 0,
    );
  }
}

class VendorEarningRecord {
  const VendorEarningRecord({
    required this.id,
    required this.orderId,
    required this.amountPesewas,
    required this.createdAt,
    this.orderRef,
    this.settledAt,
  });

  final String id;
  final String orderId;
  final String? orderRef;
  final int amountPesewas;
  final DateTime createdAt;
  final DateTime? settledAt;

  factory VendorEarningRecord.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) throw const FormatException('Vendor earning must be an object');
    return VendorEarningRecord(
      id: _requiredString(json['id'], 'earning.id'),
      orderId: _requiredString(json['orderId'], 'earning.orderId'),
      orderRef: json['orderRef'] as String?,
      amountPesewas: _requiredInt(json['amountPesewas'], 'earning.amountPesewas'),
      createdAt: _requiredDateTime(json['createdAt'], 'earning.createdAt'),
      settledAt: _optionalDateTime(json['settledAt']),
    );
  }
}

class VendorSettlementRecord {
  const VendorSettlementRecord({
    required this.id,
    required this.grossPesewas,
    required this.reservePesewas,
    required this.payoutPesewas,
    required this.status,
    required this.createdAt,
    this.paidAt,
  });

  final String id;
  final int grossPesewas;
  final int reservePesewas;
  final int payoutPesewas;
  final String status;
  final DateTime createdAt;
  final DateTime? paidAt;

  factory VendorSettlementRecord.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) throw const FormatException('Vendor settlement must be an object');
    return VendorSettlementRecord(
      id: _requiredString(json['id'], 'settlement.id'),
      grossPesewas: _requiredInt(json['grossPesewas'], 'settlement.grossPesewas'),
      reservePesewas: _requiredInt(json['reservePesewas'], 'settlement.reservePesewas'),
      payoutPesewas: _requiredInt(json['payoutPesewas'], 'settlement.payoutPesewas'),
      status: _requiredString(json['status'], 'settlement.status'),
      createdAt: _requiredDateTime(json['createdAt'], 'settlement.createdAt'),
      paidAt: _optionalDateTime(json['paidAt']),
    );
  }
}

class VendorLedgerStatement {
  const VendorLedgerStatement({
    required this.vendorId,
    required this.balance,
    required this.earnings,
    required this.settlements,
  });

  final String vendorId;
  final VendorBalanceSnapshot balance;
  final List<VendorEarningRecord> earnings;
  final List<VendorSettlementRecord> settlements;

  factory VendorLedgerStatement.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) throw const FormatException('Vendor statement must be an object');
    final earningsJson = json['earnings'];
    final settlementsJson = json['settlements'];
    if (earningsJson is! List || settlementsJson is! List) {
      throw const FormatException('Vendor statement lists are invalid');
    }
    return VendorLedgerStatement(
      vendorId: _requiredString(json['vendorId'], 'statement.vendorId'),
      balance: VendorBalanceSnapshot.fromJson(json['balance']),
      earnings: earningsJson.map(VendorEarningRecord.fromJson).toList(),
      settlements: settlementsJson.map(VendorSettlementRecord.fromJson).toList(),
    );
  }
}

class VendorLedgerRepository {
  const VendorLedgerRepository(this._client);

  final OreApiClient _client;

  Future<List<VendorWithdrawalRecord>> getWithdrawals() async {
    final response = await _client.getFresh<List<dynamic>>(OreEndpoints.vendorWithdrawals);
    return (response.data ?? const <dynamic>[]).map(VendorWithdrawalRecord.fromJson).toList();
  }

  Future<VendorWithdrawalRecord> requestWithdrawal(int amountPesewas) async {
    final response = await _client.post<Map<String, dynamic>>(OreEndpoints.vendorWithdrawals, data: <String, dynamic>{'amountPesewas': amountPesewas});
    return VendorWithdrawalRecord.fromJson(response.data);
  }

  Future<VendorBalanceSnapshot> getBalance() async {
    final response = await _client.getFresh<Map<String, dynamic>>(
      OreEndpoints.vendorWallet,
    );
    return VendorBalanceSnapshot.fromJson(response.data);
  }

  Future<VendorLedgerStatement> getStatement({DateTime? from, DateTime? to}) async {
    final response = await _client.getFresh<Map<String, dynamic>>(
      OreEndpoints.vendorWalletStatement,
      query: <String, dynamic>{
        if (from != null) 'from': from.toUtc().toIso8601String(),
        if (to != null) 'to': to.toUtc().toIso8601String(),
      },
    );
    return VendorLedgerStatement.fromJson(response.data);
  }
}

String _requiredString(Object? value, String field) {
  if (value is! String || value.isEmpty) throw FormatException('Missing or invalid $field');
  return value;
}

int _requiredInt(Object? value, String field) {
  if (value is num) return value.toInt();
  throw FormatException('Missing or invalid $field');
}

int? _optionalInt(Object? value) => value is num ? value.toInt() : null;

DateTime _requiredDateTime(Object? value, String field) {
  if (value is String) {
    final parsed = DateTime.tryParse(value);
    if (parsed != null) return parsed;
  }
  throw FormatException('Missing or invalid $field');
}

DateTime? _optionalDateTime(Object? value) {
  if (value == null) return null;
  if (value is String) return DateTime.tryParse(value);
  throw const FormatException('Optional ledger timestamp must be a string or null');
}
