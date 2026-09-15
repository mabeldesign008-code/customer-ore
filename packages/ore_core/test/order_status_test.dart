import 'package:flutter_test/flutter_test.dart';
import 'package:ore_core/ore_core.dart';

void main() {
  group('OrderStatus.canCustomerCancel', () {
    test('allows cancel until pickup', () {
      expect(OrderStatus.pending.canCustomerCancel, isTrue);
      expect(OrderStatus.accepted.canCustomerCancel, isTrue);
      expect(OrderStatus.preparing.canCustomerCancel, isTrue);
      expect(OrderStatus.readyForPickup.canCustomerCancel, isTrue);
      expect(OrderStatus.riderAssigned.canCustomerCancel, isTrue);
      expect(OrderStatus.arrivedAtPickup.canCustomerCancel, isTrue);
    });

    test('forbids cancel after pickup', () {
      expect(OrderStatus.pickedUp.canCustomerCancel, isFalse);
      expect(OrderStatus.arrivedAtDropoff.canCustomerCancel, isFalse);
      expect(OrderStatus.delivered.canCustomerCancel, isFalse);
      expect(OrderStatus.cancelled.canCustomerCancel, isFalse);
    });
  });

  group('OrderStatus.canRiderRelease', () {
    test('allows release only while assigned and before pickup', () {
      expect(OrderStatus.riderAssigned.canRiderRelease, isTrue);
      expect(OrderStatus.arrivedAtPickup.canRiderRelease, isTrue);
      expect(OrderStatus.pickedUp.canRiderRelease, isFalse);
      expect(OrderStatus.arrivedAtDropoff.canRiderRelease, isFalse);
      expect(OrderStatus.delivered.canRiderRelease, isFalse);
      expect(OrderStatus.readyForPickup.canRiderRelease, isFalse);
    });
  });
}
