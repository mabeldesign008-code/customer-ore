import 'package:flutter_test/flutter_test.dart';
import 'package:ore_core/ore_core.dart';

import 'package:ore_rider/data/order/rider_order_repository.dart';

void main() {
  test('rejects delivery OTP values that are not four digits', () async {
    final repository = RiderOrderRepository(
      OreApiClient(baseUrl: 'https://example.invalid'),
    );

    await expectLater(
      repository.confirmDeliveryOtp(
        orderId: 'order-id',
        otp: '12345',
        riderLat: 5.56,
        riderLng: -0.18,
      ),
      throwsArgumentError,
    );
  });

  test('parses a successful order action response', () {
    final result = RiderOrderActionResult.fromJson(
      <String, dynamic>{
        'orderId': 'order-id',
        'status': 'DELIVERED',
        'otpRequired': false,
      },
    );

    expect(result.orderId, 'order-id');
    expect(result.status, 'DELIVERED');
    expect(result.otpRequired, isFalse);
  });

  test('parses peakPayPesewas on history, defaulting to zero', () {
    final withPeak = RiderHistoryOrder.fromJson(<String, dynamic>{
      'orderId': 'order-id',
      'ref': 'ORO-CC-FO-20260819-0001',
      'serviceCode': 'FO',
      'status': 'DELIVERED',
      'vendorName': 'Cape Kitchen',
      'dropoff': <String, dynamic>{'label': 'Cape Coast', 'lat': 5.1, 'lng': -1.25},
      'riderFeePesewas': 1800,
      'tipPesewas': 200,
      'peakPayPesewas': 300,
      'completedAt': '2026-08-19T12:00:00.000Z',
    });
    expect(withPeak.peakPayPesewas, 300);
    expect(withPeak.tipPesewas, 200);

    final legacy = RiderHistoryOrder.fromJson(<String, dynamic>{
      'orderId': 'order-id',
      'ref': 'ORO-CC-FO-20260819-0002',
      'serviceCode': 'FO',
      'status': 'DELIVERED',
      'vendorName': 'Cape Kitchen',
      'dropoff': <String, dynamic>{'label': 'Cape Coast', 'lat': 5.1, 'lng': -1.25},
      'riderFeePesewas': 1800,
      'completedAt': '2026-08-19T12:00:00.000Z',
    });
    expect(legacy.peakPayPesewas, 0);
  });
}
