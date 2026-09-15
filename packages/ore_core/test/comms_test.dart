import 'package:flutter_test/flutter_test.dart';
import 'package:ore_core/ore_core.dart';

void main() {
  group('OreCommsThread.tryParse', () {
    test('parses a live thread DTO', () {
      final thread = OreCommsThread.tryParse(<String, dynamic>{
        'threadId': 'thread-1',
        'orderId': 'order-1',
        'customerId': 'cust-1',
        'vendorId': 'vend-1',
        'riderId': 'rider-1',
        'createdAt': '2026-08-19T12:00:00.000Z',
        'updatedAt': '2026-08-19T12:05:00.000Z',
      });

      expect(thread, isNotNull);
      expect(thread!.threadId, 'thread-1');
      expect(thread.kind, OreCommsThreadKind.order);
      expect(thread.orderId, 'order-1');
      expect(thread.riderId, 'rider-1');
    });

    test('parses a support thread without inventing an order id', () {
      final thread = OreCommsThread.tryParse(<String, dynamic>{
        'threadId': 'thread-s',
        'kind': 'support',
        'orderId': null,
        'ownerUserId': 'user-1',
        'ownerRole': 'customer',
        'customerId': null,
        'vendorId': null,
        'riderId': null,
        'createdAt': '2026-08-19T12:00:00.000Z',
        'updatedAt': '2026-08-19T12:00:00.000Z',
      });

      expect(thread, isNotNull);
      expect(thread!.isSupport, isTrue);
      expect(thread.orderId, isNull);
      expect(thread.ownerUserId, 'user-1');
    });

    test('rejects an order thread that has no order id', () {
      expect(
        OreCommsThread.tryParse(<String, dynamic>{
          'threadId': 'thread-1',
          'kind': 'order',
          'createdAt': '2026-08-19T12:00:00.000Z',
          'updatedAt': '2026-08-19T12:00:00.000Z',
        }),
        isNull,
      );
    });

    test('treats a missing rider as unassigned, not a fake id', () {
      final thread = OreCommsThread.tryParse(<String, dynamic>{
        'threadId': 'thread-1',
        'orderId': 'order-1',
        'customerId': 'cust-1',
        'vendorId': 'PARCEL',
        'riderId': null,
        'createdAt': '2026-08-19T12:00:00.000Z',
        'updatedAt': '2026-08-19T12:00:00.000Z',
      });

      expect(thread, isNotNull);
      expect(thread!.vendorId, 'PARCEL');
      expect(thread.riderId, isNull);
    });

    test('rejects a payload without ids', () {
      expect(OreCommsThread.tryParse(<String, dynamic>{'orderId': 'x'}), isNull);
      expect(OreCommsThread.tryParse(null), isNull);
    });
  });

  group('OreCommsMessage.tryParse', () {
    test('parses a persisted message', () {
      final message = OreCommsMessage.tryParse(<String, dynamic>{
        'id': 'msg-1',
        'threadId': 'thread-1',
        'senderUserId': 'cust-1',
        'senderRole': 'customer',
        'body': 'I am at the gate',
        'createdAt': '2026-08-19T12:01:00.000Z',
      });

      expect(message, isNotNull);
      expect(message!.body, 'I am at the gate');
      expect(message.roleLabel, 'Customer');
    });

    test('labels support staff as Ore Support, not a named agent', () {
      final message = OreCommsMessage.tryParse(<String, dynamic>{
        'id': 'msg-2',
        'threadId': 'thread-s',
        'senderUserId': 'ops-1',
        'senderRole': 'support',
        'body': 'We have your refund request',
        'createdAt': '2026-08-19T12:02:00.000Z',
      });
      expect(message!.roleLabel, 'Ore Support');
    });

    test('rejects empty or malformed bodies', () {
      expect(
        OreCommsMessage.tryParse(<String, dynamic>{
          'id': 'msg-1',
          'threadId': 'thread-1',
          'senderUserId': 'cust-1',
          'senderRole': 'customer',
          'body': '',
          'createdAt': '2026-08-19T12:01:00.000Z',
        }),
        isNull,
      );
      expect(OreCommsMessage.tryParse(<String, dynamic>{'id': 'x'}), isNull);
    });
  });

  group('OreVoiceSession.tryParse', () {
    test('parses a log fallback without inventing a token', () {
      final session = OreVoiceSession.tryParse(<String, dynamic>{'provider': 'log', 'target': 'rider'});
      expect(session, isNotNull);
      expect(session!.provider, OreVoiceProvider.log);
      expect(session.isTwilio, isFalse);
      expect(session.token, isNull);
    });

    test('parses a Twilio session', () {
      final session = OreVoiceSession.tryParse(<String, dynamic>{
        'provider': 'twilio',
        'target': 'customer',
        'identity': 'ore_rider-1',
        'toIdentity': 'ore_cust-1',
        'token': 'jwt-here',
        'expiresAt': '2026-08-19T12:15:00.000Z',
        'ttlSec': 900,
      });
      expect(session!.isTwilio, isTrue);
      expect(session.toIdentity, 'ore_cust-1');
    });
  });
}
