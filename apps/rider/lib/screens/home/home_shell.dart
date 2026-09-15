import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart';

import '../../core/router/app_router.dart';
import '../../providers/rider_provider.dart';

/// Bottom-nav shell shared by the 4 primary rider tabs.
class RiderHomeShell extends ConsumerStatefulWidget {
  final Widget child;
  const RiderHomeShell({super.key, required this.child});

  @override
  ConsumerState<RiderHomeShell> createState() => _RiderHomeShellState();
}

class _RiderHomeShellState extends ConsumerState<RiderHomeShell> {
  int _indexFor(String loc) {
    if (loc.startsWith(RiderRoutes.orders)) return 1;
    if (loc.startsWith(RiderRoutes.earnings)) return 2;
    if (loc.startsWith(RiderRoutes.profile)) return 3;
    return 0;
  }

  void _onTap(int i) {
    HapticFeedback.selectionClick();
    switch (i) {
      case 0: context.go(RiderRoutes.home); break;
      case 1: context.go(RiderRoutes.orders); break;
      case 2: context.go(RiderRoutes.earnings); break;
      case 3: context.go(RiderRoutes.profile); break;
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(tripsProvider, (previous, next) {
      final trip = next.currentTrip;
      if (trip == null) return;
      unawaited(() async {
        try {
          await ref.read(riderLocationProvider).startTracking(trip);
        } catch (_) {
          // Permission or GPS off — Home already surfaces locationWarning.
        }
      }());
    });
    final loc = GoRouterState.of(context).matchedLocation;
    final i = _indexFor(loc);
    final trips = ref.watch(tripsProvider);
    final online = ref.watch(onlineProvider).isOnline;

    return Scaffold(
      body: Stack(
        children: [
          widget.child,
          // Online chip (pinned top)
          Positioned(
            top: MediaQuery.of(context).padding.top + 12,
            right: 16,
            child: _OnlineChip(online: online),
          ),
          // Incoming-order offer overlays from Home
          if (i == 0 && trips.incomingOffers.any((offer) => !offer.isExpired))
            Positioned(
              left: 0, right: 0, bottom: 90,
              child: _IncomingOverlay(),
            ),
          // Active trip mini-banner (persistent on all tabs)
          if (trips.currentTrip != null)
            Positioned(
              left: 12, right: 12,
              bottom: MediaQuery.of(context).padding.bottom + 78,
              child: _ActiveTripBanner(trip: trips.currentTrip!),
            ),
        ],
      ),
      bottomNavigationBar: Container(
        padding: EdgeInsets.only(left: 8, right: 8, top: 8, bottom: MediaQuery.of(context).padding.bottom + 6),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 18, offset: const Offset(0, -4))],
        ),
        child: Row(children: [
          _NavItem(icon: LucideIcons.home, label: 'Home', active: i == 0, onTap: () => _onTap(0)),
          _NavItem(icon: LucideIcons.clipboardList, label: 'Orders', active: i == 1, onTap: () => _onTap(1)),
          _NavItem(icon: LucideIcons.wallet, label: 'Earnings', active: i == 2, onTap: () => _onTap(2)),
          _NavItem(icon: LucideIcons.user, label: 'Profile', active: i == 3, onTap: () => _onTap(3)),
        ]),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;
  const _NavItem({required this.icon, required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: AnimatedPress(
        onTap: onTap,
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          AnimatedContainer(
            duration: Motion.fast,
            curve: Motion.spring,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: active ? AppColors.primary.withOpacity(0.12) : Colors.transparent,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, size: 22, color: active ? AppColors.primary : AppColors.textMuted),
          ),
          const SizedBox(height: 4),
          Text(label, style: AppTypography.caption(active ? AppColors.primary : AppColors.textMuted).copyWith(fontWeight: FontWeight.w700, fontSize: 10)),
        ]),
      ),
    );
  }
}

class _OnlineChip extends StatelessWidget {
  final bool online;
  const _OnlineChip({required this.online});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: online ? AppColors.success : AppColors.textMuted,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 8)],
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 8, height: 8, decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Text(online ? 'Online' : 'Offline', style: AppTypography.caption(Colors.white).copyWith(fontWeight: FontWeight.w700)),
      ]),
    ).animate(onPlay: (c) => c.repeat(), autoPlay: online).shimmer(duration: 1800.ms, color: Colors.white.withOpacity(0.4));
  }
}

class _ActiveTripBanner extends ConsumerWidget {
  final dynamic trip;
  const _ActiveTripBanner({required this.trip});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return AnimatedPress(
      onTap: () => context.push(RiderRoutes.delivery.replaceFirst(':id', trip.id)),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.25), blurRadius: 16)],
          border: Border.all(color: AppColors.primary.withOpacity(0.2)),
        ),
        child: Row(children: [
          Container(
            width: 42, height: 42,
            decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
            child: Icon(trip.service.icon, color: AppColors.primary, size: 22), // Material icon from ServiceType
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(trip.status.riderLabel(), style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w800)),
            Text(
              trip.routeStops.length > 1
                  ? '${trip.routeStops.length} stacked stops'
                  : '${trip.pickupLabel} → ${trip.dropoffLabel}',
              style: AppTypography.caption(),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ])),
          const Icon(LucideIcons.chevronRight, color: AppColors.textMuted),
        ]),
      ),
    ).animate().slideY(begin: 1, duration: Motion.medium, curve: Motion.spring);
  }
}

class _IncomingOverlay extends ConsumerStatefulWidget {
  @override
  ConsumerState<_IncomingOverlay> createState() => _IncomingOverlayState();
}

class _IncomingOverlayState extends ConsumerState<_IncomingOverlay> with SingleTickerProviderStateMixin {
  late final AnimationController _pulse;
  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100))..repeat();
  }

  @override
  void dispose() { _pulse.dispose(); super.dispose(); }

  Future<void> _showComparison(List<RiderTrip> offers) async {
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (sheetContext) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.all(16),
          children: [
            Text('Compare delivery offers', style: AppTypography.h2()),
            const SizedBox(height: 6),
            Text('Offers can expire or be accepted by another Rider while you compare them.', style: AppTypography.bodySm()),
            const SizedBox(height: 12),
            ...offers.map((candidate) => Card(
                  child: ListTile(
                    title: Text('${candidate.pickupLabel} → ${candidate.dropoffLabel}'),
                    subtitle: Text(
                      [
                        '${candidate.totalDistanceKm.toStringAsFixed(1)} km',
                        candidate.vendorReadiness ?? 'readiness unavailable',
                        if (candidate.routeStops.length > 1) '${candidate.routeStops.length} stops' else if (candidate.pickupCount > 1) '${candidate.pickupCount} pickups',
                      ].join(' · '),
                    ),
                    trailing: Text('₵${candidate.payout.toStringAsFixed(2)}', style: AppTypography.bodyLg(AppColors.success).copyWith(fontWeight: FontWeight.w800)),
                    onTap: () async {
                      Navigator.of(sheetContext).pop();
                      try {
                        await ref.read(tripsProvider).accept(candidate);
                        if (mounted) context.push(RiderRoutes.delivery.replaceFirst(':id', candidate.id));
                      } catch (_) {
                        if (mounted) OreToast.show(context, message: 'This offer is no longer available.', type: ToastType.error);
                      }
                    },
                  ),
                )),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final offers = ref
        .watch(tripsProvider)
        .incomingOffers
        .where((candidate) => !candidate.isExpired)
        .toList();
    if (offers.isEmpty) return const SizedBox.shrink();
    final offer = offers.first;
    final remaining = offer.remainingAcceptance;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14),
      child: AnimatedBuilder(
        animation: _pulse,
        builder: (c, child) => Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.4 * _pulse.value), blurRadius: 30)],
          ),
          child: child,
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(LucideIcons.bellRing, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('New delivery offer', style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w800)),
                Text(offer.service.label, style: AppTypography.caption(offer.service.color)),
              ])),
              TweenAnimationBuilder<double>(
                key: ValueKey('${offer.dispatchOfferId ?? offer.id}-${offer.expiresAt?.toIso8601String() ?? remaining.inSeconds}'),
                tween: Tween(begin: remaining.inMilliseconds / 1000, end: 0),
                duration: remaining,
                onEnd: () {
                  if (mounted) setState(() {});
                },
                builder: (c, v, _) => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: v < 10 ? AppColors.danger : AppColors.warning,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text('${v.ceil()}s', style: AppTypography.caption(Colors.white).copyWith(fontSize: 12, fontWeight: FontWeight.w800)),
                ),
              ),
            ]),
            const SizedBox(height: 12),
            Row(children: [
              Icon(LucideIcons.mapPin, size: 16, color: AppColors.textMuted),
              const SizedBox(width: 6),
              Expanded(child: Text('${offer.pickupLabel} → ${offer.dropoffLabel}', style: AppTypography.body(), maxLines: 1, overflow: TextOverflow.ellipsis)),
            ]),
            if (offers.length > 1) ...[
              const SizedBox(height: 6),
              TextButton.icon(
                onPressed: () => _showComparison(offers),
                icon: const Icon(LucideIcons.list, size: 16),
                label: Text('Compare ${offers.length} offers'),
              ),
            ],
            const SizedBox(height: 6),
            Row(children: [
              Icon(LucideIcons.route, size: 16, color: AppColors.textMuted),
              const SizedBox(width: 6),
              Text('${offer.totalDistanceKm.toStringAsFixed(1)} km', style: AppTypography.caption()),
              const SizedBox(width: 16),
              Icon(LucideIcons.banknote, size: 16, color: AppColors.success),
              const SizedBox(width: 6),
              Text('₵${offer.payout.toStringAsFixed(2)}', style: AppTypography.bodyLg(AppColors.success).copyWith(fontWeight: FontWeight.w800)),
              if (offer.peakPayPesewas > 0) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: AppColors.warning.withOpacity(0.15), borderRadius: BorderRadius.circular(6)),
                  child: Text('Peak +${Formatters.money(offer.peakPayPesewas / 100)}', style: AppTypography.caption(AppColors.warning).copyWith(fontWeight: FontWeight.w800)),
                ),
              ],
              if (offer.hasCod) ...[
                const SizedBox(width: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: AppColors.warning.withOpacity(0.15), borderRadius: BorderRadius.circular(6)),
                  child: Text('COD ₵${offer.codAmount!.toStringAsFixed(0)}', style: AppTypography.caption(AppColors.warning).copyWith(fontWeight: FontWeight.w800)),
                ),
              ],
            ]),
            const SizedBox(height: 14),
            Row(children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () async {
                    try {
                      await ref.read(tripsProvider).reject(offer);
                    } catch (_) {
                      if (!mounted) return;
                      OreToast.show(
                        context,
                        message: 'Unable to decline this offer. Please try again.',
                        type: ToastType.error,
                      );
                    }
                  },
                  style: OutlinedButton.styleFrom(foregroundColor: AppColors.danger, side: const BorderSide(color: AppColors.danger), minimumSize: const Size(double.infinity, 48), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                  child: const Text('Decline'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () async {
                    try {
                      await ref.read(tripsProvider).accept(offer);
                      HapticFeedback.mediumImpact();
                      if (mounted) {
                        context.push(RiderRoutes.delivery.replaceFirst(':id', offer.id));
                      }
                    } catch (_) {
                      if (!mounted) return;
                      OreToast.show(
                        context,
                        message: 'Unable to accept this offer. Please try again.',
                        type: ToastType.error,
                      );
                    }
                  },
                  icon: const Icon(LucideIcons.check, size: 18),
                  label: const Text('Accept'),
                  style: ElevatedButton.styleFrom(minimumSize: const Size(double.infinity, 48), backgroundColor: AppColors.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                ),
              ),
            ]),
          ]),
        ),
      ),
    ).animate().slideY(begin: 1, duration: Motion.medium, curve: Motion.spring);
  }
}
