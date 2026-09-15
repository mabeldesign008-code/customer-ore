import 'package:flutter_test/flutter_test.dart';
import 'package:ore_rider/data/dispatch/rider_dispatch_repository.dart';
import 'package:ore_rider/widgets/rider_stop_stack.dart';

RiderRouteStop _stop({
  required String id,
  required int sequence,
  required String kind,
  required double lat,
  required double lng,
}) {
  return RiderRouteStop(
    stopId: id,
    orderId: 'order',
    sequence: sequence,
    kind: kind,
    label: id,
    lat: lat,
    lng: lng,
  );
}

void main() {
  test('visibleOf drops (0,0) and sorts by sequence', () {
    final rows = RiderStopStack.visibleOf([
      _stop(id: 'b', sequence: 2, kind: 'DROPOFF', lat: 5.12, lng: -1.26),
      _stop(id: 'bad', sequence: 9, kind: 'PICKUP', lat: 0, lng: 0),
      _stop(id: 'a', sequence: 1, kind: 'PICKUP', lat: 5.10, lng: -1.24),
    ]);

    expect(rows.map((stop) => stop.stopId), ['a', 'b']);
  });

  test('extraNavWaypoints before pickup are the middle stacked cells only', () {
    final extras = RiderStopStack.extraNavWaypoints(
      headingToPickup: true,
      stops: [
        _stop(id: 'p1', sequence: 1, kind: 'PICKUP', lat: 5.10, lng: -1.24),
        _stop(id: 'p2', sequence: 2, kind: 'PICKUP', lat: 5.11, lng: -1.25),
        _stop(id: 'd1', sequence: 3, kind: 'DROPOFF', lat: 5.12, lng: -1.26),
        _stop(id: 'd2', sequence: 4, kind: 'DROPOFF', lat: 5.13, lng: -1.27),
      ],
    );

    expect(extras, hasLength(2));
    expect(extras.first.lat, 5.11);
    expect(extras.last.lat, 5.12);
  });

  test('extraNavWaypoints after pickup are remaining drops except the last', () {
    final extras = RiderStopStack.extraNavWaypoints(
      headingToPickup: false,
      stops: [
        _stop(id: 'p1', sequence: 1, kind: 'PICKUP', lat: 5.10, lng: -1.24),
        _stop(id: 'd1', sequence: 2, kind: 'DROPOFF', lat: 5.12, lng: -1.26),
        _stop(id: 'd2', sequence: 3, kind: 'DROPOFF', lat: 5.13, lng: -1.27),
      ],
    );

    expect(extras, hasLength(1));
    expect(extras.single.lat, 5.12);
  });
}
