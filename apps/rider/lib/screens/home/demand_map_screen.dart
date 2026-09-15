import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart' as gmaps;
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../data/dispatch/rider_demand_repository.dart';
import '../../providers/rider_provider.dart';

/// In-app demand map. Circles come only from `GET /api/dispatch/riders/me/demand-zones`.
/// Empty API = empty map. No invented heat.
class RiderDemandMapScreen extends ConsumerStatefulWidget {
  const RiderDemandMapScreen({super.key});

  @override
  ConsumerState<RiderDemandMapScreen> createState() => _RiderDemandMapScreenState();
}

class _RiderDemandMapScreenState extends ConsumerState<RiderDemandMapScreen> {
  final Completer<gmaps.GoogleMapController> _mapController = Completer();
  String? _selectedZoneId;
  bool _fitted = false;

  static const gmaps.LatLng _capeCoast = gmaps.LatLng(5.1053, -1.2466);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(ref.read(riderPositioningProvider).refresh());
    });
  }

  @override
  Widget build(BuildContext context) {
    final positioning = ref.watch(riderPositioningProvider);
    final riderLoc = ref.watch(riderLocationProvider);
    final zones = (positioning.data?.zones ?? const <RiderDemandZone>[])
        .where((zone) => !zone.isStale && zone.hasValidCenter)
        .toList(growable: false);
    final selected = _selectedOf(zones);
    final riderPoint = _validRiderPoint(riderLoc.point.latitude, riderLoc.point.longitude);

    return Scaffold(
      body: Stack(children: [
        gmaps.GoogleMap(
          initialCameraPosition: gmaps.CameraPosition(
            target: zones.isNotEmpty
                ? gmaps.LatLng(zones.first.centerLat, zones.first.centerLng)
                : (riderPoint ?? _capeCoast),
            zoom: 13,
          ),
          onMapCreated: (controller) {
            if (!_mapController.isCompleted) _mapController.complete(controller);
            unawaited(_fit(zones, riderPoint));
          },
          myLocationEnabled: riderPoint != null,
          myLocationButtonEnabled: false,
          compassEnabled: true,
          mapToolbarEnabled: false,
          circles: {
            for (final zone in zones)
              gmaps.Circle(
                circleId: gmaps.CircleId(zone.zoneId),
                center: gmaps.LatLng(zone.centerLat, zone.centerLng),
                radius: zone.radiusMeters,
                fillColor: _levelColor(zone.demandLevel).withOpacity(zone.zoneId == selected?.zoneId ? 0.38 : 0.22),
                strokeColor: _levelColor(zone.demandLevel),
                strokeWidth: zone.zoneId == selected?.zoneId ? 3 : 2,
                consumeTapEvents: true,
                onTap: () => setState(() => _selectedZoneId = zone.zoneId),
              ),
          },
          markers: {
            for (final zone in zones)
              gmaps.Marker(
                markerId: gmaps.MarkerId(zone.zoneId),
                position: gmaps.LatLng(zone.centerLat, zone.centerLng),
                icon: gmaps.BitmapDescriptor.defaultMarkerWithHue(_levelHue(zone.demandLevel)),
                infoWindow: gmaps.InfoWindow(title: zone.zoneName, snippet: zone.demandLevel),
                onTap: () => setState(() => _selectedZoneId = zone.zoneId),
              ),
          },
        ),
        Positioned(
          top: MediaQuery.of(context).padding.top + 12,
          left: 12,
          child: _roundBtn(LucideIcons.arrowLeft, () => Navigator.of(context).maybePop()),
        ),
        Positioned(
          top: MediaQuery.of(context).padding.top + 12,
          right: 12,
          child: Column(children: [
            _roundBtn(
              LucideIcons.refreshCw,
              positioning.loading ? null : () => unawaited(positioning.refresh()),
            ),
            if (riderPoint != null) ...[
              const SizedBox(height: 8),
              _roundBtn(LucideIcons.locateFixed, () => _moveTo(riderPoint)),
            ],
          ]),
        ),
        Positioned(
          left: 12,
          right: 12,
          bottom: MediaQuery.of(context).padding.bottom + 12,
          child: _sheet(positioning, zones, selected),
        ),
      ]),
    );
  }

  RiderDemandZone? _selectedOf(List<RiderDemandZone> zones) {
    if (zones.isEmpty) return null;
    return zones.cast<RiderDemandZone?>().firstWhere(
          (zone) => zone!.zoneId == _selectedZoneId,
          orElse: () => zones.first,
        );
  }

  Widget _sheet(RiderPositioningNotifier positioning, List<RiderDemandZone> zones, RiderDemandZone? selected) {
    if (positioning.loading && zones.isEmpty) {
      return _card(child: const Row(children: [
        SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
        SizedBox(width: 12),
        Expanded(child: Text('Checking nearby demand areas…')),
      ]));
    }
    if (zones.isEmpty) {
      return _card(
        child: Row(children: [
          const Icon(LucideIcons.mapPinOff, color: AppColors.textMuted),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              positioning.error ?? 'No reliable demand area is available yet. Go online with GPS so Dispatch can score nearby cells.',
              style: AppTypography.bodySm(),
            ),
          ),
        ]),
      );
    }
    final zone = selected!;
    return _card(
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(zone.demandLevel == 'HIGH' ? LucideIcons.flame : LucideIcons.mapPin, color: _levelColor(zone.demandLevel)),
          const SizedBox(width: 8),
          Expanded(child: Text(zone.zoneName, style: AppTypography.h3())),
          Text(zone.demandLevel, style: AppTypography.caption(_levelColor(zone.demandLevel)).copyWith(fontWeight: FontWeight.w800)),
        ]),
        const SizedBox(height: 6),
        Text(
          '${zone.distanceFromRiderKm.toStringAsFixed(1)} km · ${zone.expectedWaitMin}–${zone.expectedWaitMax} min wait · ${zone.expectedOrdersNext30Min} expected / 30 min',
          style: AppTypography.bodySm(),
        ),
        const SizedBox(height: 4),
        Text(zone.reason, style: AppTypography.caption()),
        const SizedBox(height: 6),
        Text(
          'Updated ${Formatters.timeAgo(zone.freshAt)} · ${zone.confidence.toLowerCase()} confidence. Circles are scored cells, not a promise of an order.',
          style: AppTypography.caption(AppColors.textMuted),
        ),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () => _navigate(zone),
              icon: const Icon(LucideIcons.navigation, size: 16),
              label: const Text('Navigate'),
            ),
          ),
          if (zones.length > 1) ...[
            const SizedBox(width: 8),
            Expanded(
              child: TextButton(
                onPressed: () => _pickZone(zones, zone),
                child: Text('${zones.length} areas'),
              ),
            ),
          ],
        ]),
      ]),
    );
  }

  Future<void> _pickZone(List<RiderDemandZone> zones, RiderDemandZone current) async {
    final picked = await showModalBottomSheet<RiderDemandZone>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (sheet) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
          children: [
            Text('Demand areas', style: AppTypography.h3()),
            const SizedBox(height: 8),
            ...zones.map((zone) => ListTile(
                  selected: zone.zoneId == current.zoneId,
                  leading: Icon(
                    zone.demandLevel == 'HIGH' ? LucideIcons.flame : LucideIcons.mapPin,
                    color: _levelColor(zone.demandLevel),
                  ),
                  title: Text(zone.zoneName),
                  subtitle: Text('${zone.distanceFromRiderKm.toStringAsFixed(1)} km · ${zone.demandLevel}'),
                  onTap: () => Navigator.pop(sheet, zone),
                )),
          ],
        ),
      ),
    );
    if (picked == null || !mounted) return;
    setState(() => _selectedZoneId = picked.zoneId);
    await _moveTo(gmaps.LatLng(picked.centerLat, picked.centerLng));
  }

  Widget _card({required Widget child}) => Material(
        color: Colors.white,
        elevation: 8,
        shadowColor: Colors.black26,
        borderRadius: BorderRadius.circular(20),
        child: Padding(padding: const EdgeInsets.all(16), child: child),
      );

  Widget _roundBtn(IconData icon, VoidCallback? onTap) => Material(
        color: Colors.white,
        elevation: 4,
        borderRadius: BorderRadius.circular(14),
        child: IconButton(tooltip: 'Action', onPressed: onTap, icon: Icon(icon)),
      );

  Future<void> _fit(List<RiderDemandZone> zones, gmaps.LatLng? rider) async {
    if (_fitted || !_mapController.isCompleted) return;
    final points = <gmaps.LatLng>[
      if (rider != null) rider,
      ...zones.map((zone) => gmaps.LatLng(zone.centerLat, zone.centerLng)),
    ];
    if (points.isEmpty) return;
    _fitted = true;
    final controller = await _mapController.future;
    if (points.length == 1) {
      await controller.animateCamera(gmaps.CameraUpdate.newLatLngZoom(points.first, 14));
      return;
    }
    var south = points.first.latitude;
    var north = points.first.latitude;
    var west = points.first.longitude;
    var east = points.first.longitude;
    for (final point in points) {
      if (point.latitude < south) south = point.latitude;
      if (point.latitude > north) north = point.latitude;
      if (point.longitude < west) west = point.longitude;
      if (point.longitude > east) east = point.longitude;
    }
    await controller.animateCamera(
      gmaps.CameraUpdate.newLatLngBounds(
        gmaps.LatLngBounds(southwest: gmaps.LatLng(south, west), northeast: gmaps.LatLng(north, east)),
        72,
      ),
    );
  }

  Future<void> _moveTo(gmaps.LatLng point) async {
    if (!_mapController.isCompleted) return;
    final controller = await _mapController.future;
    await controller.animateCamera(gmaps.CameraUpdate.newLatLngZoom(point, 14.5));
  }

  Future<void> _navigate(RiderDemandZone zone) async {
    final uri = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=${zone.centerLat},${zone.centerLng}');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
      return;
    }
    if (!mounted) return;
    OreToast.show(context, message: 'Could not open Maps for this demand area.', type: ToastType.error);
  }

  gmaps.LatLng? _validRiderPoint(double lat, double lng) {
    if (lat.abs() <= 0.0001 && lng.abs() <= 0.0001) return null;
    return gmaps.LatLng(lat, lng);
  }
}

Color _levelColor(String level) {
  switch (level) {
    case 'HIGH':
      return AppColors.warning;
    case 'MEDIUM':
      return AppColors.info;
    default:
      return AppColors.textMuted;
  }
}

double _levelHue(String level) {
  switch (level) {
    case 'HIGH':
      return gmaps.BitmapDescriptor.hueOrange;
    case 'MEDIUM':
      return gmaps.BitmapDescriptor.hueAzure;
    default:
      return gmaps.BitmapDescriptor.hueViolet;
  }
}
