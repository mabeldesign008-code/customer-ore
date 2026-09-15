import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/ui/iconly_compat.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:ore_core/ore_core.dart';

import '../core/ui/toast_x.dart';
import '../data/order/customer_order_repository.dart';
import '../data/tracking/customer_tracking_repository.dart';
import '../providers/customer_auth_provider.dart';
import '../providers/orders_provider.dart';

class OrderTrackingScreen extends ConsumerStatefulWidget {
  const OrderTrackingScreen({super.key, required this.orderId});
  final String orderId;
  @override
  ConsumerState<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends ConsumerState<OrderTrackingScreen> with TickerProviderStateMixin {
  late final AnimationController _riderPulse;
  late final AnimationController _mapCtrl;
  LatLng? _pickup;
  LatLng? _dropoff;
  LatLng? _rider;
  DateTime? _riderAt;
  OreTrackingSocket? _socket;
  StreamSubscription<OreTrackingLocation>? _locationSub;
  StreamSubscription<OreTrackingConnection>? _socketStateSub;
  Timer? _pollTimer;
  OreTrackingConnection _socketState = OreTrackingConnection.disconnected;
  bool _showOtpReveal = false;
  String? _revealedOtp;
  late CustomerTrackingRepository _trackingRepo;

  @override
  void initState() {
    super.initState();
    _riderPulse = AnimationController(vsync: this, duration: const Duration(seconds: 2))..repeat();
    _mapCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 800));
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  Future<void> _bootstrap() async {
    _trackingRepo = CustomerTrackingRepository(ref.read(customerApiClientProvider));
    // Ensure the order is loaded.
    await ref.read(ordersProvider.notifier).refreshOrder(widget.orderId);
    if (!mounted) return;
    _derivePointsFromOrder();
    _connectSocket();
    // Fallback HTTP poll every 10s in case websocket is blocked.
    _pollTimer = Timer.periodic(const Duration(seconds: 10), (_) => _fetchRiderHttp());
  }

  void _derivePointsFromOrder() {
    final order = ref.read(orderByIdProvider(widget.orderId));
    if (order == null) return;
    setState(() {
      _dropoff = LatLng(
        order.address.lat ?? 5.1174,
        order.address.lng ?? -1.2990,
      );
      if (order.pickupLat != null && order.pickupLng != null) {
        _pickup = LatLng(order.pickupLat!, order.pickupLng!);
      }
      if (order.riderLat != null && order.riderLng != null) {
        _rider = LatLng(order.riderLat!, order.riderLng!);
        _riderAt = order.riderPositionAt;
      }
      _showOtpReveal = order.status == OrderStatus.pickedUp ||
          order.status == OrderStatus.arrivedAtDropoff;
    });
  }

  Future<void> _fetchRiderHttp() async {
    try {
      final pos = await _trackingRepo.getRiderPosition(widget.orderId);
      if (pos != null && mounted) {
        setState(() {
          _rider = LatLng(pos.lat, pos.lng);
          _riderAt = pos.timestamp;
        });
      } else {
        // Fallback to full order refresh
        await ref.read(ordersProvider.notifier).refreshOrder(widget.orderId);
        final updated = ref.read(orderByIdProvider(widget.orderId));
        if (mounted && updated?.riderLat != null && updated?.riderLng != null) {
          setState(() {
            _rider = LatLng(updated!.riderLat!, updated.riderLng!);
            _riderAt = updated.riderPositionAt;
          });
        }
      }
    } catch (_) {}
  }

  void _connectSocket() {
    final client = ref.read(customerApiClientProvider);
    final storage = ref.read(customerTokenStorageProvider);
    final socket = OreTrackingSocket(
      baseUrl: client.baseUrl,
      readAccessToken: () async => (await storage.read())?.accessToken,
    );
    _socket = socket;
    _locationSub = socket.locations.listen((loc) {
      if (!mounted) return;
      setState(() {
        _rider = LatLng(loc.lat, loc.lng);
        _riderAt = loc.timestamp;
      });
    });
    _socketStateSub = socket.states.listen((s) {
      if (!mounted) return;
      setState(() => _socketState = s);
    });
    socket.subscribe(widget.orderId);
  }

  Future<void> _revealOtp() async {
    try {
      final repo = ref.read(customerOrderRepositoryProvider);
      final otp = await repo.getDeliveryOtp(widget.orderId);
      if (!mounted) return;
      setState(() => _revealedOtp = otp);
      HapticFeedback.mediumImpact();
    } catch (e) {
      if (!mounted) return;
      context.showToast('Delivery PIN is available once the rider is nearby.', type: ToastType.info);
    }
  }

  @override
  void dispose() {
    _riderPulse.dispose();
    _mapCtrl.dispose();
    _pollTimer?.cancel();
    _socket?.dispose();
    _locationSub?.cancel();
    _socketStateSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final order = ref.watch(orderByIdProvider(widget.orderId));
    ref.listen(orderByIdProvider(widget.orderId), (prev, next) {
      if (next != null) _derivePointsFromOrder();
    });

    if (order == null) {
      return Scaffold(
        body: Center(
          child: ref.watch(ordersProvider).isEmpty
              ? const CircularProgressIndicator(color: AppColors.primary)
              : const Text('Order unavailable'),
        ),
      );
    }

    final pickup = _pickup ?? LatLng(order.pickupLat ?? 5.1065, order.pickupLng ?? -1.2462);
    final dropoff = _dropoff ?? LatLng(5.1174, -1.2990);
    final rider = _rider;
    final mapCenter = rider ?? pickup;

    // Registration for order voice calls while on tracking screen.
    return OreVoicePresence(
      client: ref.read(customerApiClientProvider),
      orderId: widget.orderId,
      child: Scaffold(
        body: Stack(children: [
          // Map
          Positioned(
            top: 0, left: 0, right: 0, bottom: MediaQuery.of(context).size.height * 0.38,
            child: FlutterMap(
              options: MapOptions(initialCenter: mapCenter, initialZoom: 14),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.ore.app',
                ),
                // Route polyline would be ideal; draw a simple dashed approximation for now.
                PolylineLayer(polylines: [
                  Polyline(points: [pickup, dropoff], strokeWidth: 4, color: AppColors.primary.withOpacity(0.7), borderStrokeWidth: 0),
                ]),
                MarkerLayer(markers: [
                  Marker(
                    point: pickup, width: 42, height: 42,
                    child: const Icon(IconlyBold.home, color: AppColors.info, size: 34),
                  ),
                  Marker(
                    point: dropoff, width: 42, height: 42,
                    child: const Icon(IconlyBold.location, color: AppColors.primary, size: 38),
                  ),
                  if (rider != null)
                    Marker(
                      point: rider, width: 56, height: 56,
                      child: AnimatedBuilder(
                        animation: _riderPulse,
                        builder: (c, _) => Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors.success.withOpacity(0.25 * (1 - _riderPulse.value)),
                          ),
                          child: const Center(
                            child: Icon(IconlyBold.buy, color: AppColors.success, size: 32),
                          ),
                        ),
                      ),
                    ),
                ]),
              ],
            ),
          ),

          // Back button
          Positioned(
            top: MediaQuery.of(context).padding.top + 12, left: 12,
            child: AnimatedPress(
              onTap: () => context.pop(),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 10)]),
                child: const Icon(IconlyLight.arrowLeft2),
              ),
            ),
          ),

          // Socket/sync status pill
          Positioned(
            top: MediaQuery.of(context).padding.top + 12, right: 12,
            child: _ConnectionPill(state: _socketState),
          ),

          // Draggable bottom sheet
          DraggableScrollableSheet(
            initialChildSize: 0.42, minChildSize: 0.32, maxChildSize: 0.88,
            builder: (context, scroll) => Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 40, offset: const Offset(0, -10))],
              ),
              child: ListView(
                controller: scroll,
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.all(20),
                children: [
                  Center(child: Container(width: 44, height: 5, decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(3)))),
                  const SizedBox(height: 20),

                  // Status header
                  Row(children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.12), shape: BoxShape.circle),
                      child: Icon(_statusIcon(order.status), color: AppColors.primary, size: 26),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(
                          order.eta.isEmpty ? 'Calculating ETA…' : 'Arriving in ${order.eta}',
                          style: AppTypography.h2(),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          order.status.customerLabel(vendorName: order.vendorName),
                          style: AppTypography.body(AppColors.primary).copyWith(fontWeight: FontWeight.w700),
                        ),
                      ]),
                    ),
                  ]),

                  const SizedBox(height: 24),

                  // Stepper
                  LayoutBuilder(builder: (c, cs) {
                    final p = (order.status.timelineStep / 9).clamp(0.0, 1.0);
                    return Stack(children: [
                      Container(height: 6, decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(3))),
                      AnimatedContainer(duration: const Duration(milliseconds: 600), curve: Curves.easeOutExpo, height: 6, width: cs.maxWidth * p, decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(3))),
                    ]);
                  }),

                  const SizedBox(height: 28),

                  // Rider card
                  if (order.riderName != null) ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(22)),
                      child: Row(children: [
                        const CircleAvatar(radius: 26, backgroundImage: AssetImage('assets/images/profile/default_avatar.png')),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(order.riderName!, style: AppTypography.h3()),
                            const SizedBox(height: 4),
                            Row(children: [
                              const Icon(IconlyBold.star, color: AppColors.accent, size: 14),
                              const SizedBox(width: 4),
                              Text(order.riderRating?.toStringAsFixed(1) ?? '4.9', style: AppTypography.bodySm(AppColors.textSecondary).copyWith(fontWeight: FontWeight.w700)),
                              const SizedBox(width: 10),
                              const Icon(IconlyBold.infoCircle, color: AppColors.textSecondary, size: 14),
                              const SizedBox(width: 4),
                              const Text('Motorbike', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                            ]),
                          ]),
                        ),
                        AnimatedPress(
                          onTap: () => OreVoiceCallPage.open(
                            context,
                            client: ref.read(customerApiClientProvider),
                            orderId: widget.orderId,
                            target: OreVoiceTarget.rider,
                            peerLabel: (order.riderName ?? '').trim().isEmpty ? 'Your rider' : order.riderName!.trim(),
                          ),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 6)]),
                            child: const Icon(IconlyBold.call, color: AppColors.primary),
                          ),
                        ),
                      ]),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Delivery OTP reveal card
                  if (_showOtpReveal)
                    OreCard(
                      color: AppColors.primary.withOpacity(0.06),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          const Icon(IconlyBold.shieldDone, color: AppColors.primary),
                          const SizedBox(width: 10),
                          Expanded(child: Text('Delivery PIN', style: AppTypography.h3())),
                        ]),
                        const SizedBox(height: 6),
                        const Text('Share this 6-digit code with the rider to confirm delivery.', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                        const SizedBox(height: 12),
                        if (_revealedOtp != null)
                          Container(
                            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
                            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
                            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                              for (int i = 0; i < _revealedOtp!.length; i++) ...[
                                Text(_revealedOtp![i], style: AppTypography.h1(AppColors.primary).copyWith(fontSize: 28, letterSpacing: 6)),
                                if (i < _revealedOtp!.length - 1) const SizedBox(width: 8),
                              ],
                            ]).animate().fadeIn().scale(begin: const Offset(0.8, 0.8)),
                          )
                        else
                          OreButton(
                            label: 'Reveal delivery PIN',
                            icon: IconlyBold.unlock,
                            onPressed: _revealOtp,
                          ),
                      ]),
                    ),

                  const SizedBox(height: 100),
                ],
              ),
            ),
          ),
        ]),
      ),
    );
  }

  IconData _statusIcon(OrderStatus s) {
    if (s == OrderStatus.delivered) return Icons.check_circle_rounded;
    if (s == OrderStatus.pickedUp || s == OrderStatus.arrivedAtDropoff) return IconlyBold.buy;
    if (s == OrderStatus.readyForPickup) return Icons.storefront_rounded;
    return IconlyBold.timeCircle;
  }
}

class _ConnectionPill extends StatelessWidget {
  const _ConnectionPill({required this.state});
  final OreTrackingConnection state;

  @override
  Widget build(BuildContext context) {
    final (color, label, icon) = switch (state) {
      OreTrackingConnection.subscribed => (AppColors.success, 'Live', Icons.wifi_rounded),
      OreTrackingConnection.connected || OreTrackingConnection.connecting => (AppColors.warning, 'Connecting', Icons.wifi_find_rounded),
      OreTrackingConnection.disconnected => (AppColors.textMuted, 'Offline', Icons.wifi_off_rounded),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 8)]),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, color: color, size: 14),
        const SizedBox(width: 6),
        Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color)),
      ]),
    );
  }
}
