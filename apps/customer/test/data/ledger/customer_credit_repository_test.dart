import 'package:flutter_test/flutter_test.dart';
import 'package:ore/data/ledger/customer_credit_repository.dart';

void main() {
  test('parses a wallet top-up initialize response', () {
    final topUp = CustomerWalletTopUp.fromJson(<String, dynamic>{
      'reference': 'ore-cc-WT-1-abc',
      'paystackUrl': 'https://checkout.paystack.com/abc',
      'mode': 'live',
      'amountPesewas': 2000,
      'status': 'INITIATED',
    });

    expect(topUp.reference, 'ore-cc-WT-1-abc');
    expect(topUp.paystackUrl, 'https://checkout.paystack.com/abc');
    expect(topUp.mode, 'live');
    expect(topUp.amountPesewas, 2000);
    expect(topUp.status, 'INITIATED');
  });

  test('parses a mock top-up with no Paystack URL', () {
    final topUp = CustomerWalletTopUp.fromJson(<String, dynamic>{
      'reference': 'ore-cc-WT-2-def',
      'paystackUrl': null,
      'mode': 'mock',
      'amountPesewas': 1000,
      'status': 'INITIATED',
    });

    expect(topUp.paystackUrl, isNull);
    expect(topUp.mode, 'mock');
    expect(topUp.status, 'INITIATED');
  });

  test('parses a confirmed top-up status without inventing success locally', () {
    final topUp = CustomerWalletTopUp.fromJson(<String, dynamic>{
      'reference': 'ore-cc-WT-3-ghi',
      'status': 'SUCCESS',
      'amountPesewas': 5000,
      'paidAt': '2026-08-19T12:00:00.000Z',
    });

    expect(topUp.status, 'SUCCESS');
    expect(topUp.amountPesewas, 5000);
    expect(topUp.paidAt?.toUtc().toIso8601String(), '2026-08-19T12:00:00.000Z');
  });
}
