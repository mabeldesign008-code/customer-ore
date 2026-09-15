import 'package:flutter_test/flutter_test.dart';

import 'package:ore_rider/data/dispatch/rider_block_repository.dart';

void main() {
  test('parses a scheduled dash from the backend contract', () {
    final block = RiderBlock.fromJson(<String, dynamic>{
      'id': 'block-id',
      'startsAt': '2026-08-19T14:00:00.000Z',
      'endsAt': '2026-08-19T18:00:00.000Z',
      'status': 'SCHEDULED',
    });
    expect(block.id, 'block-id');
    expect(block.status, 'SCHEDULED');
    expect(block.canCancel, isTrue);
    expect(block.covers(DateTime.parse('2026-08-19T16:00:00.000Z')), isTrue);
    expect(block.covers(DateTime.parse('2026-08-19T18:00:00.000Z')), isFalse);
  });

  test('treats an empty list as empty — no invented slots', () {
    expect(const <RiderBlock>[], isEmpty);
  });
}
