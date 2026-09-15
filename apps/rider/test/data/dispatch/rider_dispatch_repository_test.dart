import 'package:flutter_test/flutter_test.dart';
import 'package:ore_core/ore_core.dart';

import 'package:ore_rider/data/dispatch/rider_dispatch_repository.dart';

void main() {
  group('RiderDispatchOffer', () {
    test('parses an offer using the backend contract', () {
      final offer = RiderDispatchOffer.fromJson(
        <String, dynamic>{
          'id': 'offer-id',
          'orderId': 'order-id',
          'vendorId': 'vendor-id',
          'vendorName': 'Vendor',
          'vendorLat': 5.56,
          'vendorLng': -0.18,
          'dropLat': 5.57,
          'dropLng': -0.19,
          'dropAddress': 'Cape Coast',
          'expiresAt': '2026-08-16T12:00:00.000Z',
          'riderFeePesewas': 1800,
          'pickupDistanceKm': 1.2,
          'deliveryDistanceKm': 2.3,
          'totalRouteKm': 3.5,
          'codExposurePesewas': 8500,
          'serviceCode': 'food',
          'acceptanceWindowSec': 45,
        },
      );

      expect(offer.id, 'offer-id');
      expect(offer.orderId, 'order-id');
      expect(offer.riderFeePesewas, 1800);
      expect(offer.peakPayPesewas, 0);
      expect(offer.leaveAtDoor, isFalse);
      expect(offer.dropNote, isNull);
      expect(offer.codExposurePesewas, 8500);
      expect(offer.batchStops, isEmpty);
    });

    test('parses leave-at-door and drop notes on an offer', () {
      final offer = RiderDispatchOffer.fromJson(
        <String, dynamic>{
          'id': 'offer-id',
          'orderId': 'order-id',
          'vendorId': 'vendor-id',
          'vendorName': 'Vendor',
          'vendorLat': 5.56,
          'vendorLng': -0.18,
          'dropLat': 5.57,
          'dropLng': -0.19,
          'dropAddress': 'Cape Coast',
          'expiresAt': '2026-08-16T12:00:00.000Z',
          'riderFeePesewas': 1800,
          'pickupDistanceKm': 1.2,
          'deliveryDistanceKm': 2.3,
          'totalRouteKm': 3.5,
          'codExposurePesewas': 0,
          'serviceCode': 'FOOD',
          'acceptanceWindowSec': 45,
          'leaveAtDoor': true,
          'dropNote': 'Blue gate, leave on stool',
          'scheduledFor': '2026-08-20T18:30:00.000Z',
        },
      );

      expect(offer.leaveAtDoor, isTrue);
      expect(offer.dropNote, 'Blue gate, leave on stool');
      expect(offer.signatureRequired, isTrue);
      expect(offer.scheduledFor, DateTime.parse('2026-08-20T18:30:00.000Z'));
    });

    test('parses peakPayPesewas on an offer', () {
      final offer = RiderDispatchOffer.fromJson(
        <String, dynamic>{
          'id': 'offer-id',
          'orderId': 'order-id',
          'vendorId': 'vendor-id',
          'vendorName': 'Vendor',
          'vendorLat': 5.56,
          'vendorLng': -0.18,
          'dropLat': 5.57,
          'dropLng': -0.19,
          'dropAddress': 'Cape Coast',
          'expiresAt': '2026-08-16T12:00:00.000Z',
          'riderFeePesewas': 1800,
          'tipPesewas': 200,
          'peakPayPesewas': 300,
          'pickupDistanceKm': 1.2,
          'deliveryDistanceKm': 2.3,
          'totalRouteKm': 3.5,
          'codExposurePesewas': 0,
          'serviceCode': 'FOOD',
          'acceptanceWindowSec': 45,
        },
      );

      expect(offer.tipPesewas, 200);
      expect(offer.peakPayPesewas, 300);
    });

    test('parses stacked batchStops without inventing extras', () {
      final offer = RiderDispatchOffer.fromJson(
        <String, dynamic>{
          'id': 'offer-id',
          'orderId': 'order-id',
          'vendorId': 'vendor-id',
          'vendorName': 'Vendor',
          'vendorLat': 5.56,
          'vendorLng': -0.18,
          'dropLat': 5.57,
          'dropLng': -0.19,
          'dropAddress': 'Cape Coast',
          'expiresAt': '2026-08-16T12:00:00.000Z',
          'riderFeePesewas': 1800,
          'pickupDistanceKm': 1.2,
          'deliveryDistanceKm': 2.3,
          'totalRouteKm': 3.5,
          'codExposurePesewas': 0,
          'serviceCode': 'FOOD',
          'acceptanceWindowSec': 45,
          'pickupCount': 2,
          'dropCount': 2,
          'batchStops': <Map<String, dynamic>>[
            <String, dynamic>{
              'stopId': 'b:pickup:0',
              'orderId': 'order-a',
              'sequence': 1,
              'kind': 'PICKUP',
              'label': 'Chop Bar',
              'address': 'Kotokuraba',
              'lat': 5.1053,
              'lng': -1.2466,
            },
            <String, dynamic>{
              'stopId': 'b:pickup:1',
              'orderId': 'order-b',
              'sequence': 2,
              'kind': 'PICKUP',
              'label': 'Market stall',
              'lat': 5.11,
              'lng': -1.25,
            },
            <String, dynamic>{
              'stopId': 'b:dropoff:0',
              'orderId': 'order-a',
              'sequence': 3,
              'kind': 'DROPOFF',
              'label': 'Customer drop-off',
              'lat': 5.12,
              'lng': -1.26,
            },
          ],
        },
      );

      expect(offer.batchStops, hasLength(3));
      expect(offer.batchStops.first.isPickupKind, isTrue);
      expect(offer.batchStops.last.isDropKind, isTrue);
      expect(offer.batchStops[1].hasValidPoint, isTrue);
    });
  });

  group('RiderActiveTask', () {
    test('parses the current order returned by dispatch', () {
      final task = RiderActiveTask.fromJson(
        <String, dynamic>{
          'offerId': null,
          'currentOrder': <String, dynamic>{
            'orderId': 'order-id',
            'status': 'RIDER_ASSIGNED',
            'vendorId': 'vendor-id',
            'vendorName': 'Vendor',
            'vendorLat': 5.56,
            'vendorLng': -0.18,
            'dropLat': 5.57,
            'dropLng': -0.19,
            'dropAddress': 'Cape Coast',
            'paymentMethod': 'COD',
            'codAmountPesewas': 5000,
            'riderFeePesewas': 1800,
            'serviceCode': 'FOOD',
          },
        },
      );

      expect(task.currentOrder?.orderId, 'order-id');
      expect(task.currentOrder?.status, 'RIDER_ASSIGNED');
      expect(task.currentOrder?.codAmountPesewas, 5000);
      expect(task.currentOrder?.peakPayPesewas, 0);
    });

    test('parses peakPayPesewas on the current order', () {
      final task = RiderActiveTask.fromJson(
        <String, dynamic>{
          'offerId': null,
          'currentOrder': <String, dynamic>{
            'orderId': 'order-id',
            'status': 'RIDER_ASSIGNED',
            'vendorId': 'vendor-id',
            'vendorName': 'Vendor',
            'vendorLat': 5.56,
            'vendorLng': -0.18,
            'dropLat': 5.57,
            'dropLng': -0.19,
            'dropAddress': 'Cape Coast',
            'paymentMethod': 'PREPAID',
            'codAmountPesewas': 0,
            'riderFeePesewas': 1800,
            'tipPesewas': 200,
            'peakPayPesewas': 300,
            'serviceCode': 'FOOD',
          },
        },
      );

      expect(task.currentOrder?.peakPayPesewas, 300);
    });
  });

  group('RiderPeakPay', () {
    test('parses a zero window as hidden', () {
      final peak = RiderPeakPay.fromJson(<String, dynamic>{
        'amountPesewas': 0,
        'title': null,
        'endsAt': null,
      });
      expect(peak.amountPesewas, 0);
      expect(peak.title, isNull);
      expect(peak.endsAt, isNull);
    });

    test('parses an active funded window', () {
      final peak = RiderPeakPay.fromJson(<String, dynamic>{
        'amountPesewas': 300,
        'title': 'Lunch rush',
        'endsAt': '2026-08-19T14:00:00.000Z',
      });
      expect(peak.amountPesewas, 300);
      expect(peak.title, 'Lunch rush');
      expect(peak.endsAt, DateTime.parse('2026-08-19T14:00:00.000Z'));
    });
  });

  group('RiderDispatchProfile', () {
    test('parses a newly registered offline rider', () {
      final profile = RiderDispatchProfile.fromJson(
        <String, dynamic>{
          'id': 'dispatch-rider-id',
          'userId': 'user-id',
          'name': 'Ama Rider',
          'phone': '233241234567',
          'vehicle': 'MOTORBIKE',
          'status': 'OFFLINE',
          'verified': false,
          'lat': 5.56,
          'lng': -0.18,
        },
      );

      expect(profile.id, 'dispatch-rider-id');
      expect(profile.status, 'OFFLINE');
      expect(profile.verified, isFalse);
      expect(profile.vehicle, 'MOTORBIKE');
    });

    test('accepts the CAR vehicle supported by the backend contract', () {
      final profile = RiderDispatchProfile.fromJson(
        <String, dynamic>{
          'id': 'rider-id',
          'userId': 'user-id',
          'name': 'Ama Rider',
          'phone': '233241234567',
          'vehicle': 'CAR',
          'status': 'OFFLINE',
          'verified': false,
        },
      );

      expect(profile.vehicle, 'CAR');
    });
  });

  group('RiderDispatchRepository', () {
    test('rejects a motorbike profile update without a plate', () async {
      final repository = RiderDispatchRepository(
        OreApiClient(baseUrl: 'https://example.invalid'),
      );

      await expectLater(
        repository.updateProfile(vehicle: 'MOTORBIKE'),
        throwsArgumentError,
      );
    });

    test('rejects unsupported vehicle before making a request', () async {
      final repository = RiderDispatchRepository(
        OreApiClient(baseUrl: 'https://example.invalid'),
      );

      await expectLater(
        repository.registerRider(
          name: 'Ama Rider',
          phone: '+233241234567',
          vehicle: 'SCOOTER',
        ),
        throwsArgumentError,
      );
    });

    test('rejects non-E.164 phone before making a request', () async {
      final repository = RiderDispatchRepository(
        OreApiClient(baseUrl: 'https://example.invalid'),
      );

      await expectLater(
        repository.registerRider(
          name: 'Ama Rider',
          phone: '0241234567',
        ),
        throwsArgumentError,
      );
    });
  });
}
