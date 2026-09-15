import 'package:flutter_test/flutter_test.dart';

import 'package:ore_vendor/data/order/vendor_order_repository.dart';

void main() {
  test('parses a real OrderStatusDto vendor projection', () {
    final order = VendorOrder.fromJson(<String, dynamic>{
      'orderId': 'order-id',
      'ref': 'ORO-CC-FO-20260816-0001',
      'serviceCode': 'FO',
      'vendorType': 'FOOD',
      'status': 'CONFIRMED',
      'checkoutId': 'checkout-id',
      'vendorId': 'vendor-id',
      'vendorName': 'Cape Kitchen',
      'customer': <String, dynamic>{'id': 'customer-id', 'name': 'Customer', 'phone': '+233241234567'},
      'paymentMethod': 'PREPAID',
      'totalPesewas': 8500,
      'prepTimeMin': 15,
      'etaMinutes': 20,
      'items': <dynamic>[
        <String, dynamic>{
          'id': 'order-item-id',
          'itemId': 'menu-item-id',
          'name': 'Jollof',
          'qty': 2,
          'unitPricePesewas': 2500,
          'prepTimeMin': 15,
          'modifiers': <String>[],
        },
      ],
      'timeline': <dynamic>[
        <String, dynamic>{'from': '', 'to': 'CONFIRMED', 'at': '2026-08-16T12:00:00Z'},
      ],
      'otpRequired': false,
    });

    expect(order.ref, 'ORO-CC-FO-20260816-0001');
    expect(order.items.single.qty, 2);
    expect(order.totalPesewas, 8500);
    expect(order.peakPayPesewas, 0);
  });

  test('parses peakPayPesewas as rider-only funded pay', () {
    final order = VendorOrder.fromJson(<String, dynamic>{
      'orderId': 'order-id',
      'ref': 'ORO-CC-FO-20260816-0001',
      'serviceCode': 'FO',
      'vendorType': 'FOOD',
      'status': 'CONFIRMED',
      'checkoutId': 'checkout-id',
      'vendorId': 'vendor-id',
      'vendorName': 'Cape Kitchen',
      'customer': <String, dynamic>{'id': 'customer-id', 'name': 'Customer', 'phone': '+233241234567'},
      'paymentMethod': 'PREPAID',
      'totalPesewas': 8500,
      'prepTimeMin': 15,
      'tipPesewas': 200,
      'peakPayPesewas': 300,
      'items': <dynamic>[
        <String, dynamic>{
          'id': 'order-item-id',
          'itemId': 'menu-item-id',
          'name': 'Jollof',
          'qty': 2,
          'unitPricePesewas': 2500,
          'prepTimeMin': 15,
          'modifiers': <String>[],
        },
      ],
      'timeline': <dynamic>[
        <String, dynamic>{'from': '', 'to': 'CONFIRMED', 'at': '2026-08-16T12:00:00Z'},
      ],
      'otpRequired': false,
    });

    expect(order.tipPesewas, 200);
    expect(order.peakPayPesewas, 300);
    expect(order.totalPesewas, 8500);
  });

  test('parses leave-at-door, drop note and scheduled slot', () {
    final order = VendorOrder.fromJson(<String, dynamic>{
      'orderId': 'order-id',
      'ref': 'ORO-CC-FO-20260816-0001',
      'serviceCode': 'FO',
      'vendorType': 'FOOD',
      'status': 'CONFIRMED',
      'checkoutId': 'checkout-id',
      'vendorId': 'vendor-id',
      'vendorName': 'Cape Kitchen',
      'customer': <String, dynamic>{'id': 'customer-id', 'name': 'Customer', 'phone': '+233241234567'},
      'paymentMethod': 'PREPAID',
      'totalPesewas': 8500,
      'prepTimeMin': 15,
      'leaveAtDoor': true,
      'dropNote': 'Blue gate',
      'scheduledFor': '2026-08-20T18:30:00.000Z',
      'items': <dynamic>[
        <String, dynamic>{
          'id': 'order-item-id',
          'itemId': 'menu-item-id',
          'name': 'Jollof',
          'qty': 2,
          'unitPricePesewas': 2500,
          'prepTimeMin': 15,
          'modifiers': <String>[],
        },
      ],
      'timeline': <dynamic>[
        <String, dynamic>{'from': '', 'to': 'CONFIRMED', 'at': '2026-08-16T12:00:00Z'},
      ],
      'otpRequired': false,
    });

    expect(order.leaveAtDoor, isTrue);
    expect(order.dropNote, 'Blue gate');
    expect(order.scheduledFor, DateTime.parse('2026-08-20T18:30:00.000Z'));
  });
}
