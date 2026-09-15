import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart' as gmaps;
import 'package:geolocator/geolocator.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart';

import '../../core/router/app_router.dart';
import '../../data/auth/rider_api_client_provider.dart';
import '../../data/dispatch/rider_dispatch_repository.dart';
import '../../data/maps/rider_turn_by_turn.dart';
import '../../providers/rider_provider.dart';
import '../../widgets/rider_stop_stack.dart';

class RiderDeliveryMapScreen extends ConsumerStatefulWidget {
  final String orderId;
  const RiderDeliveryMapScreen({super.key, required this.orderId});
  @override
  ConsumerState<RiderDeliveryMapScreen> createState() => _RiderDeliveryMapScreenState();
}

class _RiderDeliveryMapScreenState extends ConsumerState<RiderDeliveryMapScreen> with TickerProviderStateMixin {
  final Completer<gmaps.GoogleMapController> _mapController = Completer();
  late AnimationController _riderPulse;
  Timer? _orderStatusTimer;
  List<LatLng>? _roadRoute;

  @override
  void initState() {
    super.initState();
    _riderPulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 1500))..repeat();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final trip = ref.read(tripsProvider).state.currentTrip;
      if (trip != null) {
        _startLocationTracking(trip);
        _loadRoadRoute(trip);
        ref.read(tripsProvider).refreshCurrentOrder().catchError((_) {});
      }
    });
    _orderStatusTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      ref.read(tripsProvider).refreshCurrentOrder().catchError((_) {});
    });
  }

  @override
  void dispose() {
    _orderStatusTimer?.cancel();
    _riderPulse.dispose();
    // GPS is owned by RiderLocationNotifier for the whole online/trip session
    // so locking the screen or leaving this map does not stop Dispatch updates.
    super.dispose();
  }

  Future<void> _startLocationTracking(RiderTrip trip) async {
    try {
      await ref.read(riderLocationProvider).startTracking(trip);
    } catch (error) {
      if (!mounted) return;
      OreToast.show(
        context,
        message: error.toString(),
        type: ToastType.error,
      );
    }
  }

  Future<void> _loadRoadRoute(RiderTrip trip) async {
    try {
      final route = await ref.read(riderDirectionsRepositoryProvider).getDrivingRoute(
            origin: trip.pickupPoint,
            destination: trip.dropoffPoint,
          );
      if (!mounted) return;
      setState(() => _roadRoute = route.points);
    } catch (_) {
      // The map remains usable with the endpoint approximation when the
      // restricted key is not configured or Google returns no route. Native
      // Maps setup and the build-time key are part of the PC handoff.
    }
  }

  @override
  Widget build(BuildContext context) {
    final trips = ref.watch(tripsProvider);
    final riderLoc = ref.watch(riderLocationProvider);
    final trip = trips.currentTrip;

    if (trip == null || trip.id != widget.orderId) {
      return Scaffold(
        appBar: AppBar(title: const Text('Delivery')),
        body: const Center(child: OreEmptyState(icon: LucideIcons.packageX, title: 'No active delivery')),
      );
    }

    final step = trip.riderStep;
    final stacked = RiderStopStack.visibleOf(trip.routeStops);
    final polyline = _roadRoute ?? _polyline(trip, stacked);

    return OreVoicePresence(
      client: ref.read(riderApiClientProvider),
      orderId: widget.orderId,
      child: Scaffold(
      body: Stack(children: [
        gmaps.GoogleMap(
          initialCameraPosition: gmaps.CameraPosition(
            target: _toGoogleLatLng(_midpoint(trip.pickupPoint, trip.dropoffPoint)),
            zoom: 13.5,
          ),
          onMapCreated: (controller) {
            if (!_mapController.isCompleted) _mapController.complete(controller);
          },
          myLocationEnabled: true,
          myLocationButtonEnabled: false,
          compassEnabled: true,
          mapToolbarEnabled: false,
          markers: {
            if (stacked.length > 1)
              ...stacked.map((stop) => gmaps.Marker(
                    markerId: gmaps.MarkerId(stop.stopId),
                    position: gmaps.LatLng(stop.lat, stop.lng),
                    icon: gmaps.BitmapDescriptor.defaultMarkerWithHue(
                      stop.isDropKind ? gmaps.BitmapDescriptor.hueGreen : gmaps.BitmapDescriptor.hueAzure,
                    ),
                    infoWindow: gmaps.InfoWindow(title: '${stop.sequence}. ${stop.kindLabel}', snippet: stop.label),
                  ))
            else ...[
              _googleMarker(trip.pickupPoint, gmaps.BitmapDescriptor.hueAzure, 'Pickup'),
              _googleMarker(trip.dropoffPoint, gmaps.BitmapDescriptor.hueGreen, 'Dropoff'),
            ],
            if (RiderTurnByTurn.hasUsablePoint(riderLoc.point.latitude, riderLoc.point.longitude))
              gmaps.Marker(
                markerId: const gmaps.MarkerId('rider'),
                position: _toGoogleLatLng(riderLoc.point),
                icon: gmaps.BitmapDescriptor.defaultMarkerWithHue(
                  gmaps.BitmapDescriptor.hueRed,
                ),
                infoWindow: const gmaps.InfoWindow(title: 'Rider'),
              ),
          },
          polylines: {
            gmaps.Polyline(
              polylineId: const gmaps.PolylineId('delivery-route'),
              points: polyline.map(_toGoogleLatLng).toList(),
              color: AppColors.primary,
              width: 5,
            ),
          },
        ),
        // Back button
        Positioned(
          top: MediaQuery.of(context).padding.top + 12,
          left: 12,
          child: SafeArea(
            child: Container(
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10)]),
              child: IconButton(tooltip: 'Go back', 
                icon: const Icon(LucideIcons.arrowLeft),
                onPressed: () => context.pop(),
              ),
            ),
          ),
        ),
        // Right-side quick controls
        Positioned(
          top: MediaQuery.of(context).padding.top + 12,
          right: 12,
          child: SafeArea(child: Column(children: [
            _circleBtn(LucideIcons.locateFixed, () {
              _moveToRider(riderLoc.point);
            }),
            const SizedBox(height: 8),
            _circleBtn(LucideIcons.phone, () => _callCustomer(trip)),
            const SizedBox(height: 8),
            _circleBtn(LucideIcons.messageCircle, () => context.push(RiderRoutes.chat.replaceFirst(':id', trip.id))),
            const SizedBox(height: 8),
            _circleBtn(LucideIcons.circleAlert, () => context.push(RiderRoutes.sos), color: AppColors.danger),
          ])),
        ),
        // Bottom sheet
        _BottomSheet(
          trip: trip,
          step: step,
          stacked: stacked,
          onAdvance: () => _handleAdvance(trip),
          onCancel: trip.status.canRiderRelease ? () => _showCancelSheet() : null,
          onNavigate: () => _openTurnByTurn(trip),
        ),
      ]),
    ),
    );
  }

  Future<void> _handleAdvance(RiderTrip trip) async {
    try {
      if (trip.errand != null) {
        final errand = trip.errand!;
        if (trip.status == OrderStatus.riderAssigned) {
          final position = await _determinePosition();
          await ref.read(riderDispatchRepositoryProvider).confirmErrandArrival(
                orderId: trip.id,
                riderLat: position.latitude,
                riderLng: position.longitude,
              );
          await ref.read(tripsProvider).refreshCurrentOrder();
          return;
        }
        if (trip.status == OrderStatus.arrivedAtPickup && !errand.isShopping && !errand.isPurchased) {
          await ref.read(riderOrderRepositoryProvider).startErrandShopping(trip.id);
          await ref.read(tripsProvider).refreshCurrentOrder();
        }
        if (mounted) context.push(RiderRoutes.errandShopping.replaceFirst(':id', trip.id));
        return;
      }

      // Laundry collection is a separate leg: after collecting garments from
      // the customer, the Rider confirms handoff at the Laundry Vendor rather
      // than attempting customer delivery proof.
      if (_isLaundryCollectionLeg(trip) &&
          (trip.status == OrderStatus.pickedUp || trip.status == OrderStatus.arrivedAtDropoff)) {
        final position = await _determinePosition();
        await ref.read(riderDispatchRepositoryProvider).confirmLaundryHandoff(
              orderId: trip.id,
              riderLat: position.latitude,
              riderLng: position.longitude,
            );
        ref.read(riderLocationProvider).stop();
        ref.read(tripsProvider).cancelCurrent();
        if (ref.read(onlineProvider).isOnline) {
          try {
            await ref.read(riderLocationProvider).startIdleTracking();
          } catch (_) {
            // The Rider remains available; Home can retry idle tracking.
          }
        }
        if (mounted) {
          OreToast.show(context, message: 'Laundry handed to the Vendor. You are available for the next offer.', type: ToastType.success);
          context.pop();
        }
        return;
      }

      if (trip.status == OrderStatus.pickedUp ||
          trip.status == OrderStatus.arrivedAtDropoff) {
        if (!mounted) return;
        context.pushReplacement(
          RiderRoutes.deliveryProof.replaceFirst(':id', trip.id),
        );
        return;
      }

      if (trip.status == OrderStatus.arrivedAtPickup) {
        final position = await _determinePosition();
        await ref.read(riderOrderRepositoryProvider).confirmPickup(
              orderId: trip.id,
              riderLat: position.latitude,
              riderLng: position.longitude,
            );
      }

      final previousStatus = trip.status;
      await ref.read(tripsProvider).refreshCurrentOrder();
      if (!mounted) return;
      final current = ref.read(tripsProvider).currentTrip;
      if (current?.status == previousStatus) {
        OreToast.show(
          context,
          message: 'Waiting for Dispatch to confirm your location/status.',
          type: ToastType.info,
        );
      }
      Haptics.medium();
    } on DioException catch (error) {
      if (!mounted) return;
      final body = error.response?.data;
      final message = body is Map && body['error'] is Map
          ? (body['error'] as Map)['message']?.toString()
          : null;
      OreToast.show(
        context,
        message: message ?? 'Unable to update the delivery. Please try again.',
        type: ToastType.error,
      );
    } catch (error) {
      if (!mounted) return;
      OreToast.show(
        context,
        message: error.toString(),
        type: ToastType.error,
      );
    }
  }

  bool _isLaundryCollectionLeg(RiderTrip trip) => trip.operationalFlags.contains('LAUNDRY_COLLECTION');

  Future<Position> _determinePosition() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw StateError('Location services are disabled');
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw StateError('Location permission is required for this action');
    }
    return Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );
  }

  gmaps.Marker _googleMarker(LatLng point, double hue, String title) {
    return gmaps.Marker(
      markerId: gmaps.MarkerId(title.toLowerCase()),
      position: _toGoogleLatLng(point),
      icon: gmaps.BitmapDescriptor.defaultMarkerWithHue(hue),
      infoWindow: gmaps.InfoWindow(title: title),
    );
  }

  gmaps.LatLng _toGoogleLatLng(LatLng point) {
    return gmaps.LatLng(point.latitude, point.longitude);
  }

  Future<void> _moveToRider(LatLng point) async {
    if (!_mapController.isCompleted) return;
    final controller = await _mapController.future;
    await controller.animateCamera(
      gmaps.CameraUpdate.newLatLngZoom(_toGoogleLatLng(point), 15),
    );
  }

  Widget _circleBtn(IconData i, VoidCallback onTap, {Color? color}) =>
      Container(
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10)]),
        child: IconButton(tooltip: 'Action', onPressed: onTap, icon: Icon(i, color: color ?? AppColors.textPrimary)),
      );

  List<LatLng> _polyline(RiderTrip trip, [List<RiderRouteStop> stacked = const []]) {
    final fromStops = [
      for (final stop in stacked)
        if (stop.hasValidPoint) LatLng(stop.lat, stop.lng),
    ];
    if (fromStops.length >= 2) return fromStops;
    final p = trip.pickupPoint;
    final d = trip.dropoffPoint;
    return [p, LatLng(p.latitude, d.longitude), d];
  }

  LatLng _midpoint(LatLng a, LatLng b) => LatLng((a.latitude + b.latitude) / 2, (a.longitude + b.longitude) / 2);

  Future<void> _openTurnByTurn(RiderTrip trip) async {
    final opened = await RiderTurnByTurn.open(
      pickupLat: trip.pickupPoint.latitude,
      pickupLng: trip.pickupPoint.longitude,
      dropLat: trip.dropoffPoint.latitude,
      dropLng: trip.dropoffPoint.longitude,
      headingToPickup: trip.riderStep <= 2,
      extraWaypoints: RiderStopStack.extraNavWaypoints(
        stops: trip.routeStops,
        headingToPickup: trip.riderStep <= 2,
      ),
    );
    if (!opened && mounted) {
      OreToast.show(
        context,
        message: 'Could not open Maps. Install Google Maps or Apple Maps, or check the stop coordinates.',
        type: ToastType.error,
      );
    }
  }

  Future<void> _callCustomer(RiderTrip trip) {
    return OreVoiceCallPage.open(
      context,
      client: ref.read(riderApiClientProvider),
      orderId: trip.id,
      target: OreVoiceTarget.customer,
      peerLabel: trip.customerName.trim().isEmpty ? 'Customer' : trip.customerName,
      fallbackTel: trip.customerPhone,
    );
  }

  Future<void> _showCancelSheet() async {
    final trip = ref.read(tripsProvider).currentTrip;
    if (trip == null || trip.id != widget.orderId) return;
    if (!trip.status.canRiderRelease) {
      if (!mounted) return;
      OreToast.show(
        context,
        message: 'This trip cannot be released after pickup. Use SOS if you are in danger, or contact Ore support.',
        type: ToastType.info,
      );
      return;
    }

    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      isDismissible: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (sheetContext) {
        var releasing = false;
        return StatefulBuilder(
          builder: (sheetContext, setSheetState) => Padding(
            padding: const EdgeInsets.all(20),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Release this trip?', style: AppTypography.h2()),
              const SizedBox(height: 8),
              Text(
                'The order returns to dispatch for another rider. You can only do this before pickup.',
                style: AppTypography.body(),
              ),
              const SizedBox(height: 20),
              Row(children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: releasing ? null : () => Navigator.pop(sheetContext),
                    child: const Text('Keep going'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
                    onPressed: releasing
                        ? null
                        : () async {
                            setSheetState(() => releasing = true);
                            try {
                              await ref.read(tripsProvider).releaseCurrent();
                              ref.read(riderLocationProvider).stop();
                              if (ref.read(onlineProvider).isOnline) {
                                try {
                                  await ref.read(riderLocationProvider).startIdleTracking();
                                } catch (_) {
                                  // Availability stays server-authoritative.
                                }
                              }
                              if (!sheetContext.mounted) return;
                              Navigator.pop(sheetContext);
                              if (!mounted) return;
                              OreToast.show(
                                context,
                                message: 'Trip returned to dispatch.',
                                type: ToastType.success,
                              );
                              context.pop();
                            } on DioException catch (error) {
                              setSheetState(() => releasing = false);
                              if (!sheetContext.mounted && !mounted) return;
                              final body = error.response?.data;
                              final message = body is Map && body['error'] is Map
                                  ? (body['error'] as Map)['message']?.toString()
                                  : null;
                              OreToast.show(
                                mounted ? context : sheetContext,
                                message: message ?? 'Unable to release this trip. Please try again.',
                                type: ToastType.error,
                              );
                            } catch (error) {
                              setSheetState(() => releasing = false);
                              if (!mounted) return;
                              OreToast.show(
                                context,
                                message: error.toString(),
                                type: ToastType.error,
                              );
                            }
                          },
                    child: Text(releasing ? 'Releasing…' : 'Release trip'),
                  ),
                ),
              ]),
            ]),
          ),
        );
      },
    );
  }
}

class _BottomSheet extends StatelessWidget {
  final RiderTrip trip;
  final int step;
  final List<RiderRouteStop> stacked;
  final Future<void> Function() onAdvance;
  final VoidCallback? onCancel;
  final VoidCallback onNavigate;
  const _BottomSheet({
    required this.trip,
    required this.step,
    required this.stacked,
    required this.onAdvance,
    required this.onCancel,
    required this.onNavigate,
  });

  String _ctaLabel() {
    if (trip.errand != null) {
      if (trip.status == OrderStatus.riderAssigned) return 'I\'m at shop';
      if (trip.errand!.isShopping) return 'Manage shopping';
      if (trip.errand!.isPurchased) return 'Finish Errand';
      return 'Start shopping';
    }
    final laundryCollection = trip.operationalFlags.contains('LAUNDRY_COLLECTION');
    switch (trip.status) {
      case OrderStatus.riderAssigned: return laundryCollection ? 'I\'m at collection' : 'I\'m at pickup';
      case OrderStatus.arrivedAtPickup: return trip.service.hasVendor ? 'Order picked up' : 'Parcel picked up';
      case OrderStatus.pickedUp: return laundryCollection ? 'Confirm Vendor handoff' : 'I\'m at drop-off';
      case OrderStatus.arrivedAtDropoff:
        return laundryCollection
            ? 'Confirm Vendor handoff'
            : trip.hasCod ? 'Collected ₵${trip.codAmount!.toStringAsFixed(0)} & delivered' : 'Complete delivery';
      default: return 'Next';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: 0, right: 0, bottom: 0,
      child: Container(
        padding: EdgeInsets.fromLTRB(16, 18, 16, MediaQuery.of(context).padding.bottom + 14),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 20, offset: Offset(0, -4))],
        ),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Drag handle
          Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(4)))).animate(onPlay: (c) => c.repeat()).shimmer(duration: 2000.ms),
          const SizedBox(height: 14),
          // Step timeline
          _Timeline(currentStep: step),
          const SizedBox(height: 14),
          if (stacked.length > 1) ...[
            RiderStopStack(
              stops: stacked,
              dense: true,
              currentStopId: step <= 2
                  ? stacked.where((stop) => stop.isPickupKind).firstOrNull?.stopId
                  : stacked.where((stop) => stop.isDropKind).firstOrNull?.stopId,
            ),
            const SizedBox(height: 10),
          ],
          // Current target address
          Material(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            child: InkWell(
              onTap: onNavigate,
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(children: [
                  Icon(
                    step <= 2 ? LucideIcons.mapPin : LucideIcons.flag,
                    color: step <= 2 ? AppColors.primary : AppColors.success,
                  ),
                  const SizedBox(width: 10),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(
                      step <= 2
                          ? (trip.errand != null
                              ? (trip.errand!.isShopping ? 'Shopping at shop' : 'Heading to Errand shop')
                              : (trip.operationalFlags.contains('LAUNDRY_COLLECTION') ? 'Heading to customer collection' : 'Heading to pickup'))
                          : (trip.operationalFlags.contains('LAUNDRY_COLLECTION') ? 'Heading to Laundry Vendor handoff' : 'Heading to drop-off'),
                      style: AppTypography.caption().copyWith(fontWeight: FontWeight.w700),
                    ),
                    Text(
                      step <= 2 ? '${trip.pickupLabel} · ${trip.pickupAddress}' : '${trip.dropoffLabel} · ${trip.dropoffAddress}',
                      style: AppTypography.body().copyWith(fontWeight: FontWeight.w700),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      'Open turn-by-turn · in-app map stays the overview',
                      style: AppTypography.caption(AppColors.textMuted),
                    ),
                  ])),
                  Icon(LucideIcons.navigation, color: AppColors.primary),
                ]),
              ),
            ),
          ),
          const SizedBox(height: 10),
          // Info row: payout + COD
          Row(children: [
            _chip(LucideIcons.banknote, Formatters.money(trip.payout), AppColors.success, 'Payout'),
            const SizedBox(width: 8),
            _chip(LucideIcons.route, '${trip.totalDistanceKm.toStringAsFixed(1)} km', AppColors.info, 'Distance'),
            if (trip.hasCod) ...[
              const SizedBox(width: 8),
              _chip(LucideIcons.wallet, 'COD ₵${trip.codAmount!.toStringAsFixed(0)}', AppColors.warning, 'Collect'),
            ],
          ]),
          if (trip.peakPayPesewas > 0) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(color: AppColors.warning.withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
              child: Text('Peak +${Formatters.money(trip.peakPayPesewas / 100)}', style: AppTypography.caption(AppColors.warning).copyWith(fontWeight: FontWeight.w800)),
            ),
          ],
          if (trip.leaveAtDoor || (trip.dropNote != null && trip.dropNote!.isNotEmpty)) ...[
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(color: AppColors.info.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
              child: Text(
                [
                  if (trip.leaveAtDoor) 'Leave at door',
                  if (trip.dropNote != null && trip.dropNote!.isNotEmpty) trip.dropNote!,
                ].join(' · '),
                style: AppTypography.caption(AppColors.info).copyWith(fontWeight: FontWeight.w700),
              ),
            ),
          ],
          const SizedBox(height: 14),
          Row(children: [
            IconButton.filledTonal(
              onPressed: onCancel,
              tooltip: onCancel == null ? 'Release is only available before pickup' : 'Release trip',
              style: IconButton.styleFrom(backgroundColor: AppColors.danger.withOpacity(0.1)),
              icon: Icon(LucideIcons.x, color: onCancel == null ? AppColors.textMuted : AppColors.danger),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: OreButton(
                label: _ctaLabel(),
                icon: LucideIcons.arrowRight,
                onPressed: () {
                  onAdvance();
                },
              ),
            ),
          ]),
        ]),
      ).animate().slideY(begin: 1, duration: Motion.medium, curve: Motion.spring),
    );
  }

  Widget _chip(IconData i, String t, Color c, String label) => Expanded(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(color: c.withOpacity(0.08), borderRadius: BorderRadius.circular(12)),
          child: Row(children: [
            Icon(i, size: 14, color: c),
            const SizedBox(width: 6),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(label, style: AppTypography.caption(c)),
              Text(t, style: AppTypography.body(c).copyWith(fontWeight: FontWeight.w800), overflow: TextOverflow.ellipsis),
            ])),
          ]),
        ),
      );
}

class _Timeline extends StatelessWidget {
  final int currentStep;
  const _Timeline({required this.currentStep});
  @override
  Widget build(BuildContext context) {
    final labels = ['Heading to pickup', 'At pickup', 'On the way', 'At dropoff', 'Delivered'];
    return Row(children: [
      for (int i = 0; i < 5; i++) ...[
        Column(children: [
          AnimatedContainer(
            duration: Motion.fast,
            width: 26, height: 26,
            decoration: BoxDecoration(
              color: i + 1 <= currentStep ? AppColors.success : (i + 1 == currentStep ? AppColors.primary : AppColors.border),
              shape: BoxShape.circle,
            ),
            child: Center(child: i + 1 < currentStep
              ? const Icon(LucideIcons.check, size: 14, color: Colors.white)
              : Text('${i + 1}', style: AppTypography.caption(i + 1 <= currentStep ? Colors.white : AppColors.textMuted).copyWith(fontWeight: FontWeight.w800, fontSize: 11))),
          ),
          const SizedBox(height: 4),
          SizedBox(width: 54, child: Text(labels[i], style: AppTypography.caption(i + 1 <= currentStep ? AppColors.textPrimary : AppColors.textMuted), textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis)),
        ]),
        if (i < 4) Expanded(
          child: Container(
            height: 3,
            margin: const EdgeInsets.only(bottom: 24),
            decoration: BoxDecoration(
              color: i + 1 < currentStep ? AppColors.success : AppColors.border,
              borderRadius: BorderRadius.circular(3),
            ),
          ),
        ),
      ],
    ]);
  }
}
