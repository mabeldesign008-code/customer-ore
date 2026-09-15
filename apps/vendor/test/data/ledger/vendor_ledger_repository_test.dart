import 'package:flutter_test/flutter_test.dart';

import 'package:ore_vendor/data/ledger/vendor_ledger_repository.dart';

void main() {
  test('parses vendor balance and settlement statement in pesewas', () {
    final statement = VendorLedgerStatement.fromJson(<String, dynamic>{
      'vendorId': 'vendor-id',
      'balance': <String, dynamic>{
        'id': 'balance-id',
        'vendorId': 'vendor-id',
        'accruedPesewas': 100000,
        'reservePesewas': 10000,
        'owedPesewas': 0,
        'paidOutPesewas': 50000,
        'bonusPesewas': 0,
        'pendingSettlementPesewas': 20000,
        'availablePesewas': 70000,
      },
      'earnings': <dynamic>[
        <String, dynamic>{
          'id': 'earning-id',
          'orderId': 'order-id',
          'orderRef': 'ORO-1',
          'amountPesewas': 25000,
          'createdAt': '2026-08-16T12:00:00Z',
          'settledAt': null,
        },
      ],
      'settlements': <dynamic>[
        <String, dynamic>{
          'id': 'settlement-id',
          'grossPesewas': 50000,
          'reservePesewas': 5000,
          'payoutPesewas': 45000,
          'status': 'PAID',
          'createdAt': '2026-08-16T12:00:00Z',
          'paidAt': '2026-08-16T12:01:00Z',
        },
      ],
    });

    expect(statement.balance.availablePesewas, 70000);
    expect(statement.earnings.single.amountPesewas, 25000);
    expect(statement.settlements.single.status, 'PAID');
  });
}
