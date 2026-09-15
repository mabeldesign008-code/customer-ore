import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart';

import '../data/dispatch/rider_dispatch_repository.dart';

/// Numbered stop list from Dispatch `batchStops` / `stops`. Empty = nothing.
class RiderStopStack extends StatelessWidget {
  const RiderStopStack({
    super.key,
    required this.stops,
    this.dense = false,
    this.currentStopId,
  });

  final List<RiderRouteStop> stops;
  final bool dense;
  final String? currentStopId;

  static List<RiderRouteStop> visibleOf(Iterable<RiderRouteStop> stops) {
    final rows = stops.where((stop) => stop.hasValidPoint).toList()
      ..sort((a, b) => a.sequence.compareTo(b.sequence));
    return rows;
  }

  /// Intermediate stacked stops for Google `waypoints`. Pickup and final drop
  /// stay on the existing 4.3 URL; this never invents a coordinate.
  static List<({double lat, double lng})> extraNavWaypoints({
    required List<RiderRouteStop> stops,
    required bool headingToPickup,
  }) {
    final rows = visibleOf(stops);
    if (rows.length < 3) return const <({double lat, double lng})>[];
    if (headingToPickup) {
      return rows
          .sublist(1, rows.length - 1)
          .map((stop) => (lat: stop.lat, lng: stop.lng))
          .toList(growable: false);
    }
    final drops = rows.where((stop) => stop.isDropKind).toList(growable: false);
    if (drops.length < 2) return const <({double lat, double lng})>[];
    return drops
        .sublist(0, drops.length - 1)
        .map((stop) => (lat: stop.lat, lng: stop.lng))
        .toList(growable: false);
  }

  @override
  Widget build(BuildContext context) {
    final rows = visibleOf(stops);
    if (rows.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < rows.length; i++) ...[
          _row(rows[i], rows[i].stopId == currentStopId),
          if (i < rows.length - 1)
            Padding(
              padding: EdgeInsets.only(left: dense ? 13 : 15),
              child: Container(width: 2, height: dense ? 10 : 14, color: AppColors.border),
            ),
        ],
      ],
    );
  }

  Widget _row(RiderRouteStop stop, bool current) {
    final color = stop.isDropKind ? AppColors.success : AppColors.primary;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: dense ? 28 : 32,
          height: dense ? 28 : 32,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: current ? color : color.withOpacity(0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            '${stop.sequence}',
            style: AppTypography.caption(current ? Colors.white : color).copyWith(fontWeight: FontWeight.w800),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${stop.kindLabel} · ${stop.label}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: (dense ? AppTypography.bodySm() : AppTypography.body()).copyWith(fontWeight: FontWeight.w700),
              ),
              Text(
                stop.address ?? 'Address on map',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTypography.caption(),
              ),
            ],
          ),
        ),
        if (current) Icon(LucideIcons.navigation, size: 14, color: color),
      ],
    );
  }
}
