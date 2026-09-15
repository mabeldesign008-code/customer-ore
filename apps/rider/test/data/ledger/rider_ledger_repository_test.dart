import 'package:flutter_test/flutter_test.dart';

import 'package:ore_rider/data/ledger/rider_ledger_repository.dart';

void main() {
  test('parses the ledger wallet response in pesewas', () {
    final wallet = RiderWalletSnapshot.fromJson(
      <String, dynamic>{
        'riderId': 'rider-id',
        'userId': 'user-id',
        'pendingPesewas': 18450,
        'clearedPesewas': 62000,
        'lockedPesewas': 0,
        'cashLiabilityPesewas': 8500,
        'withdrawablePesewas': 53500,
        'lifetimeEarnedPesewas': 250000,
        'lifetimeRemittedPesewas': 90000,
        'codTier': 'NEW',
        'codStatus': 'CLEAR',
        'codEligible': true,
        'tierLimitPesewas': 100000,
        'triggerPct': 90,
        'withdrawalDay': null,
        'withdrawnTodayPesewas': 0,
        'freeWithdrawalsLeftToday': 1,
        'withdrawalFeePesewas': 200,
        'minWithdrawalPesewas': 5000,
        'dailyCapPesewas': 200000,
      },
    );

    expect(wallet.withdrawablePesewas, 53500);
    expect(wallet.cashLiabilityPesewas, 8500);
    expect(wallet.codEligible, isTrue);
  });

  test('parses real weekly earnings points', () {
    final statement = RiderEarningsStatement.fromJson(
      <String, dynamic>{
        'wallet': <String, dynamic>{
          'riderId': 'rider-id',
          'userId': 'user-id',
          'pendingPesewas': 0,
          'clearedPesewas': 10000,
          'lockedPesewas': 0,
          'cashLiabilityPesewas': 0,
          'withdrawablePesewas': 10000,
          'lifetimeEarnedPesewas': 10000,
          'lifetimeRemittedPesewas': 0,
          'codTier': 'NEW',
          'codStatus': 'CLEAR',
          'codEligible': true,
          'tierLimitPesewas': 100000,
          'triggerPct': 90,
          'withdrawalDay': null,
          'withdrawnTodayPesewas': 0,
          'freeWithdrawalsLeftToday': 1,
          'withdrawalFeePesewas': 200,
          'minWithdrawalPesewas': 5000,
          'dailyCapPesewas': 200000,
        },
        'todayEarnedPesewas': 1800,
        'weekEarnedPesewas': 5000,
        'tripsToday': 1,
        'weekSeries': <Map<String, dynamic>>[
          {'label': 'Mon', 'amountPesewas': 1800},
        ],
      },
    );

    expect(statement.todayEarnedPesewas, 1800);
    expect(statement.weekSeries.single.amountPesewas, 1800);
  });

  test('parses fare vs tip vs peak on an earnings row', () {
    final row = RiderEarningRow.fromJson(<String, dynamic>{
      'orderId': 'order-id',
      'orderRef': 'ORO-CC-FO-20260819-0001',
      'amountPesewas': 2300,
      'basePesewas': 1800,
      'tipPesewas': 200,
      'peakPayPesewas': 300,
      'createdAt': '2026-08-19T12:00:00.000Z',
    });
    expect(row.amountPesewas, 2300);
    expect(row.basePesewas, 1800);
    expect(row.tipPesewas, 200);
    expect(row.peakPayPesewas, 300);
  });

  test('treats missing peak as zero so old fee-only rows still parse', () {
    final row = RiderEarningRow.fromJson(<String, dynamic>{
      'orderId': 'order-id',
      'orderRef': null,
      'amountPesewas': 1800,
      'createdAt': '2026-08-19T12:00:00.000Z',
    });
    expect(row.peakPayPesewas, 0);
    expect(row.tipPesewas, 0);
    expect(row.basePesewas, 1800);
  });
}
