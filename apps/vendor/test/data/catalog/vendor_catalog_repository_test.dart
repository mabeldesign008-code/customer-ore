import 'package:flutter_test/flutter_test.dart';

import 'package:ore_vendor/data/catalog/vendor_catalog_repository.dart';

void main() {
  test('parses the authenticated vendor snapshot contract', () {
    final snapshot = VendorSnapshot.fromJson(<String, dynamic>{
      'vendor': <String, dynamic>{
        'id': 'vendor-id',
        'name': 'Cape Kitchen',
        'vendorType': 'FOOD',
        'approved': true,
        'publicId': 'ORV-2026-0001',
        'lat': 5.56,
        'lng': -0.18,
        'deliveryRadiusKm': 8,
        'acceptsCod': true,
        'accepting': true,
        'openNow': true,
        'plan': 'STANDARD',
      },
      'menu': <dynamic>[
        <String, dynamic>{
          'id': 'item-id',
          'vendorId': 'vendor-id',
          'name': 'Jollof',
          'category': 'Mains',
          'pricePesewas': 2500,
          'prepTimeMin': 15,
          'available': true,
        },
      ],
    });

    expect(snapshot.vendor.name, 'Cape Kitchen');
    expect(snapshot.menu.single.pricePesewas, 2500);
    expect(snapshot.menu.single.available, isTrue);
  });

  test('parses an optional promotion voucher code', () {
    final promotion = VendorPromotionRecord.fromJson(<String, dynamic>{
      'id': 'promo-id',
      'title': 'Weekday jollof',
      'discountType': 'PERCENT',
      'discountValue': 10,
      'minimumSubtotalPesewas': 5000,
      'startsAt': '2026-08-19T00:00:00.000Z',
      'endsAt': '2026-08-26T23:59:59.000Z',
      'active': true,
      'code': 'JOLLOF10',
    });
    expect(promotion.code, 'JOLLOF10');
    expect(promotion.discountValue, 10);
  });
}
