import 'package:ore_core/ore_core.dart';

/// Ledger wallet view returned by the current rider wallet endpoint.
class RiderWalletSnapshot {
  const RiderWalletSnapshot({
    required this.riderId,
    required this.userId,
    required this.pendingPesewas,
    required this.clearedPesewas,
    required this.lockedPesewas,
    required this.cashLiabilityPesewas,
    required this.withdrawablePesewas,
    required this.lifetimeEarnedPesewas,
    required this.lifetimeRemittedPesewas,
    required this.codTier,
    required this.codStatus,
    required this.codEligible,
    required this.tierLimitPesewas,
    required this.triggerPct,
    required this.freeWithdrawalsLeftToday,
    required this.withdrawalFeePesewas,
    required this.minWithdrawalPesewas,
    required this.dailyCapPesewas,
    this.withdrawalDay,
    this.withdrawnTodayPesewas = 0,
  });

  final String riderId;
  final String userId;
  final int pendingPesewas;
  final int clearedPesewas;
  final int lockedPesewas;
  final int cashLiabilityPesewas;
  final int withdrawablePesewas;
  final int lifetimeEarnedPesewas;
  final int lifetimeRemittedPesewas;
  final String codTier;
  final String codStatus;
  final bool codEligible;
  final int tierLimitPesewas;
  final int triggerPct;
  final String? withdrawalDay;
  final int withdrawnTodayPesewas;
  final int freeWithdrawalsLeftToday;
  final int withdrawalFeePesewas;
  final int minWithdrawalPesewas;
  final int dailyCapPesewas;

  factory RiderWalletSnapshot.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Rider wallet must be a JSON object');
    }
    return RiderWalletSnapshot(
      riderId: _requiredString(json['riderId'], 'riderId'),
      userId: _requiredString(json['userId'], 'userId'),
      pendingPesewas: _requiredInt(json['pendingPesewas'], 'pendingPesewas'),
      clearedPesewas: _requiredInt(json['clearedPesewas'], 'clearedPesewas'),
      lockedPesewas: _requiredInt(json['lockedPesewas'], 'lockedPesewas'),
      cashLiabilityPesewas: _requiredInt(json['cashLiabilityPesewas'], 'cashLiabilityPesewas'),
      withdrawablePesewas: _requiredInt(json['withdrawablePesewas'], 'withdrawablePesewas'),
      lifetimeEarnedPesewas: _requiredInt(json['lifetimeEarnedPesewas'], 'lifetimeEarnedPesewas'),
      lifetimeRemittedPesewas: _requiredInt(json['lifetimeRemittedPesewas'], 'lifetimeRemittedPesewas'),
      codTier: _requiredString(json['codTier'], 'codTier'),
      codStatus: _requiredString(json['codStatus'], 'codStatus'),
      codEligible: _requiredBool(json['codEligible'], 'codEligible'),
      tierLimitPesewas: _requiredInt(json['tierLimitPesewas'], 'tierLimitPesewas'),
      triggerPct: _requiredInt(json['triggerPct'], 'triggerPct'),
      withdrawalDay: json['withdrawalDay'] as String?,
      withdrawnTodayPesewas: _requiredInt(json['withdrawnTodayPesewas'], 'withdrawnTodayPesewas'),
      freeWithdrawalsLeftToday: _requiredInt(json['freeWithdrawalsLeftToday'], 'freeWithdrawalsLeftToday'),
      withdrawalFeePesewas: _requiredInt(json['withdrawalFeePesewas'], 'withdrawalFeePesewas'),
      minWithdrawalPesewas: _requiredInt(json['minWithdrawalPesewas'], 'minWithdrawalPesewas'),
      dailyCapPesewas: _requiredInt(json['dailyCapPesewas'], 'dailyCapPesewas'),
    );
  }
}

class RiderEarningsPoint {
  const RiderEarningsPoint({required this.label, required this.amountPesewas});

  final String label;
  final int amountPesewas;

  factory RiderEarningsPoint.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Earnings point must be a JSON object');
    }
    return RiderEarningsPoint(
      label: _requiredString(json['label'], 'weekSeries.label'),
      amountPesewas: _requiredInt(json['amountPesewas'], 'weekSeries.amountPesewas'),
    );
  }
}

class RiderEarningRow {
  const RiderEarningRow({
    required this.orderId,
    required this.orderRef,
    required this.amountPesewas,
    required this.createdAt,
    this.basePesewas,
    this.tipPesewas = 0,
    this.peakPayPesewas = 0,
  });

  final String orderId;
  final String? orderRef;
  final int amountPesewas;
  final int? basePesewas;
  final int tipPesewas;
  final int peakPayPesewas;
  final DateTime createdAt;

  factory RiderEarningRow.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Earnings row must be a JSON object');
    }
    final amount = _requiredInt(json['amountPesewas'], 'earnings.amountPesewas');
    final tip = json['tipPesewas'] is num ? (json['tipPesewas'] as num).toInt() : 0;
    final peak = json['peakPayPesewas'] is num ? (json['peakPayPesewas'] as num).toInt() : 0;
    return RiderEarningRow(
      orderId: _requiredString(json['orderId'], 'earnings.orderId'),
      orderRef: json['orderRef'] as String?,
      amountPesewas: amount,
      basePesewas: json['basePesewas'] is num ? (json['basePesewas'] as num).toInt() : amount - tip - peak,
      tipPesewas: tip,
      peakPayPesewas: peak,
      createdAt: _requiredDateTime(json['createdAt'], 'earnings.createdAt'),
    );
  }
}

class RiderEarningsStatement {
  const RiderEarningsStatement({
    required this.wallet,
    required this.todayEarnedPesewas,
    required this.weekEarnedPesewas,
    required this.tripsToday,
    required this.weekSeries,
    this.earnings = const <RiderEarningRow>[],
  });

  final RiderWalletSnapshot wallet;
  final int todayEarnedPesewas;
  final int weekEarnedPesewas;
  final int tripsToday;
  final List<RiderEarningsPoint> weekSeries;
  final List<RiderEarningRow> earnings;

  factory RiderEarningsStatement.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Earnings statement must be a JSON object');
    }
    final series = json['weekSeries'];
    if (series is! List) {
      throw const FormatException('Earnings weekSeries must be a list');
    }
    final earnings = json['earnings'];
    return RiderEarningsStatement(
      wallet: RiderWalletSnapshot.fromJson(json['wallet']),
      todayEarnedPesewas: _requiredInt(json['todayEarnedPesewas'], 'todayEarnedPesewas'),
      weekEarnedPesewas: _requiredInt(json['weekEarnedPesewas'], 'weekEarnedPesewas'),
      tripsToday: _requiredInt(json['tripsToday'], 'tripsToday'),
      weekSeries: series.map(RiderEarningsPoint.fromJson).toList(),
      earnings: earnings is List ? earnings.map(RiderEarningRow.fromJson).toList(growable: false) : const <RiderEarningRow>[],
    );
  }
}

class RiderLedgerRepository {
  const RiderLedgerRepository(this._client);

  final OreApiClient _client;

  Future<RiderWalletSnapshot> getWallet() async {
    final response = await _client.getFresh<Map<String, dynamic>>(
      OreEndpoints.riderWallet,
    );
    return RiderWalletSnapshot.fromJson(response.data);
  }

  Future<RiderEarningsStatement> getStatement() async {
    final response = await _client.getFresh<Map<String, dynamic>>(
      OreEndpoints.riderWalletStatement,
    );
    return RiderEarningsStatement.fromJson(response.data);
  }

  Future<RiderWithdrawalResult> requestWithdrawal({
    required int amountPesewas,
    required String destination,
  }) async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.riderWithdrawals,
      data: <String, dynamic>{
        'amountPesewas': amountPesewas,
        'destination': destination,
      },
    );
    return RiderWithdrawalResult.fromJson(response.data);
  }

  Future<RiderWalletSnapshot> remitCod(int amountPesewas) async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.riderRemit,
      data: <String, int>{'amountPesewas': amountPesewas},
    );
    return RiderWalletSnapshot.fromJson(response.data);
  }

  Future<List<RiderWithdrawalRecord>> listWithdrawals() async {
    final response = await _client.getFresh<List<dynamic>>(
      OreEndpoints.riderWithdrawals,
    );
    return (response.data ?? const <dynamic>[])
        .map(RiderWithdrawalRecord.fromJson)
        .toList();
  }
}

class RiderWithdrawalRecord {
  const RiderWithdrawalRecord({
    required this.id,
    required this.amountPesewas,
    required this.feePesewas,
    required this.destination,
    required this.status,
    required this.createdAt,
    this.processedAt,
  });

  final String id;
  final int amountPesewas;
  final int feePesewas;
  final String destination;
  final String status;
  final DateTime createdAt;
  final DateTime? processedAt;

  factory RiderWithdrawalRecord.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Withdrawal record must be a JSON object');
    }
    return RiderWithdrawalRecord(
      id: _requiredString(json['id'], 'withdrawal.id'),
      amountPesewas: _requiredInt(json['amountPesewas'], 'withdrawal.amountPesewas'),
      feePesewas: _requiredInt(json['feePesewas'], 'withdrawal.feePesewas'),
      destination: _requiredString(json['destination'], 'withdrawal.destination'),
      status: _requiredString(json['status'], 'withdrawal.status'),
      createdAt: _requiredDateTime(json['createdAt'], 'withdrawal.createdAt'),
      processedAt: _optionalDateTime(json['processedAt']),
    );
  }
}

class RiderWithdrawalResult {
  const RiderWithdrawalResult({
    required this.id,
    required this.amountPesewas,
    required this.status,
  });

  final String id;
  final int amountPesewas;
  final String status;

  factory RiderWithdrawalResult.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Withdrawal must be a JSON object');
    }
    return RiderWithdrawalResult(
      id: _requiredString(json['id'], 'withdrawal.id'),
      amountPesewas: _requiredInt(json['amountPesewas'], 'withdrawal.amountPesewas'),
      status: _requiredString(json['status'], 'withdrawal.status'),
    );
  }
}

String _requiredString(Object? value, String field) {
  if (value is! String || value.isEmpty) {
    throw FormatException('Missing or invalid wallet $field');
  }
  return value;
}

int _requiredInt(Object? value, String field) {
  if (value is num) return value.toInt();
  throw FormatException('Missing or invalid wallet $field');
}

bool _requiredBool(Object? value, String field) {
  if (value is bool) return value;
  throw FormatException('Missing or invalid wallet $field');
}

DateTime _requiredDateTime(Object? value, String field) {
  if (value is String) {
    final parsed = DateTime.tryParse(value);
    if (parsed != null) return parsed;
  }
  throw FormatException('Missing or invalid wallet $field');
}

DateTime? _optionalDateTime(Object? value) {
  if (value == null) return null;
  if (value is String) return DateTime.tryParse(value);
  throw const FormatException('Optional withdrawal timestamp must be a string or null');
}
