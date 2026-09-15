import 'package:flutter_test/flutter_test.dart';

import 'package:ore/data/catalog/customer_voucher_repository.dart';
import 'package:ore/data/ledger/customer_loyalty_repository.dart';

void main() {
  test('parses a saved voucher without inventing a second discount engine', () {
    final voucher = CustomerVoucher.fromJson(<String, dynamic>{
      'code': 'JOLLOF10',
      'title': 'Weekday jollof',
      'vendorId': 'vendor-id',
      'promotionId': 'promo-id',
      'active': true,
      'endsAt': '2026-08-26T12:00:00.000Z',
    });
    expect(voucher.code, 'JOLLOF10');
    expect(voucher.promotionId, 'promo-id');
    expect(voucher.active, isTrue);
    expect(voucher.endsAt, DateTime.parse('2026-08-26T12:00:00.000Z'));
  });

  test('parses loyalty points and the 100-point redeem block', () {
    final loyalty = CustomerLoyalty.fromJson(<String, dynamic>{
      'points': 250,
      'lifetimeEarned': 400,
      'lifetimeRedeemed': 150,
      'redeemBlockPoints': 100,
      'redeemBlockPesewas': 100,
    });
    expect(loyalty.points, 250);
    expect(loyalty.lifetimeEarned, 400);
    expect(loyalty.lifetimeRedeemed, 150);
    expect(loyalty.redeemBlockPoints, 100);
    expect(loyalty.redeemBlockPesewas, 100);
  });
}
