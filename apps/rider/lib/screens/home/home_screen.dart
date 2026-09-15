import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../data/auth/rider_api_client_provider.dart';
import '../../data/dispatch/rider_demand_repository.dart';
import '../../data/dispatch/rider_dispatch_repository.dart';
import '../../data/dispatch/rider_block_repository.dart';
import '../../data/notifications/rider_notification_service.dart';
import '../../providers/rider_provider.dart';
import '../../core/router/app_router.dart';

class RiderHomeScreen extends ConsumerStatefulWidget {
  const RiderHomeScreen({super.key});
  @override
  ConsumerState<RiderHomeScreen> createState() => _RiderHomeScreenState();
}

class _RiderHomeScreenState extends ConsumerState<RiderHomeScreen> {
  StreamSubscription<RiderNotificationEvent>? _notificationSubscription;

  @override
  void initState() {
    super.initState();
    _notificationSubscription = ref
        .read(riderNotificationServiceProvider)
        .events
        .listen(_handleNotification);
    Future<void>.microtask(() async {
      await ref.read(tripsProvider).restoreActiveTask();
      await ref.read(tripsProvider).loadHistory();
      try {
        final profile = await ref.read(riderDispatchRepositoryProvider).getProfile();
        ref.read(riderAuthProvider).setDispatchProfile(profile);
        ref.read(onlineProvider).hydrate(profile);
        if (profile.status.toUpperCase() != 'OFFLINE') {
          ref.read(tripsProvider).setPollingEnabled(true);
        }
      } catch (_) {
        // A rider may not have a dispatch profile until onboarding approval.
      }
      await ref.read(riderNotificationServiceProvider).initialize();
    });
  }

  void _handleNotification(RiderNotificationEvent event) {
    if (!mounted) return;
    ref.invalidate(riderNotificationsProvider);
    if (event.orderId != null) {
      context.push(RiderRoutes.orderDetail.replaceFirst(':id', event.orderId!));
    } else if (event.offerId != null) {
      ref.read(tripsProvider).setPollingEnabled(true);
    }
    if (event.title != null || event.body != null) {
      OreToast.show(
        context,
        message: [event.title, event.body].whereType<String>().join(': '),
        type: ToastType.info,
      );
    }
  }

  @override
  void dispose() {
    _notificationSubscription?.cancel();
    super.dispose();
  }

  Future<void> _goOnline() async {
    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (sheet) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Go online?', style: AppTypography.h2()),
          const SizedBox(height: 8),
          Text(
            'Ore will keep using your GPS with the screen off so Dispatch can send nearby offers and follow an active trip. Android shows a persistent “Ore Rider location” notification. This uses more battery. Tracking stops when you go offline or force-close the app. It does not continue after a force-close.',
            style: AppTypography.body(),
          ),
          const SizedBox(height: 16),
          Row(children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => Navigator.pop(sheet, false),
                child: const Text('Not now'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: OreButton(
                label: 'Go online',
                onPressed: () => Navigator.pop(sheet, true),
              ),
            ),
          ]),
        ]),
      ),
    );
    if (confirmed != true) return;
    try {
      await ref.read(onlineProvider).goOnline();
      ref.read(tripsProvider).setPollingEnabled(true);
      ref.invalidate(riderPeakPayProvider);
      ref.invalidate(riderBlocksProvider);
    } on DioException catch (error) {
      _showDispatchError(error);
    } catch (_) {
      if (!mounted) return;
      OreToast.show(
        context,
        message: 'Unable to go online. Please try again.',
        type: ToastType.error,
      );
    }
  }

  Future<void> _extendSession() async {
    try {
      await ref.read(onlineProvider).extendSession(minutes: 60);
      if (mounted) OreToast.show(context, message: 'Online session extended by 1 hour.', type: ToastType.success);
    } on DioException catch (error) {
      _showDispatchError(error);
    } catch (_) {
      if (mounted) OreToast.show(context, message: 'Unable to extend your session.', type: ToastType.error);
    }
  }

  Future<void> _pause() async {
    try {
      await ref.read(onlineProvider).pause(minutes: 30);
      ref.read(tripsProvider).setPollingEnabled(false);
      if (mounted) Navigator.of(context).pop();
    } on DioException catch (error) {
      _showDispatchError(error);
    } catch (_) {
      if (mounted) OreToast.show(context, message: 'Unable to pause your session.', type: ToastType.error);
    }
  }

  Future<void> _resume() async {
    try {
      await ref.read(onlineProvider).resume();
      ref.read(tripsProvider).setPollingEnabled(true);
    } on DioException catch (error) {
      _showDispatchError(error);
    } catch (_) {
      if (mounted) OreToast.show(context, message: 'Unable to resume your session.', type: ToastType.error);
    }
  }

  Future<void> _goOffline(String reason) async {
    try {
      await ref.read(onlineProvider).goOffline(reason: reason);
      ref.read(tripsProvider).setPollingEnabled(false);
      if (mounted) Navigator.of(context).pop();
    } on DioException catch (error) {
      _showDispatchError(error);
    } catch (_) {
      if (!mounted) return;
      OreToast.show(
        context,
        message: 'Unable to go offline. Please try again.',
        type: ToastType.error,
      );
    }
  }

  void _showDispatchError(DioException error) {
    if (!mounted) return;
    final body = error.response?.data;
    final message = body is Map && body['error'] is Map
        ? (body['error'] as Map)['message']?.toString()
        : null;
    OreToast.show(
      context,
      message: message ?? 'Dispatch could not update your availability.',
      type: ToastType.error,
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(riderAuthProvider);
    final online = ref.watch(onlineProvider);
    final positioning = ref.watch(riderPositioningProvider);
    final peakPay = ref.watch(riderPeakPayProvider).value;
    final earnings = ref.watch(riderEarningsStatementProvider).value;
    final trips = ref.watch(tripsProvider);
    final rider = auth.state.rider;
    final now = DateTime.now();
    final upcomingBlocks = (ref.watch(riderBlocksProvider).value ?? const <RiderBlock>[])
        .where((block) => block.endsAt.isAfter(now) && (block.isScheduled || block.isActive))
        .toList()
      ..sort((a, b) => a.startsAt.compareTo(b.startsAt));
    final nextBlock = upcomingBlocks.isEmpty ? null : upcomingBlocks.first;
    final todayEarnings = earnings == null
        ? '…'
        : Formatters.money(earnings.todayEarnedPesewas / 100);
    final weekEarnings = earnings == null
        ? '…'
        : Formatters.money(earnings.weekEarnedPesewas / 100);
    final walletBalance = earnings == null
        ? '…'
        : Formatters.money(earnings.wallet.withdrawablePesewas / 100);
    final tripsToday = earnings == null ? '…' : '${earnings.tripsToday}';

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: 220,
            backgroundColor: AppColors.primary,
            automaticallyImplyLeading: false,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(colors: [AppColors.primary, AppColors.primaryDark]),
                ),
                padding: const EdgeInsets.fromLTRB(20, 70, 20, 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      GestureDetector(
                        onTap: () => context.push(RiderRoutes.profile),
                        child: CircleAvatar(radius: 24, backgroundColor: Colors.white24, child: Text(rider?.name.substring(0, 1) ?? 'K', style: AppTypography.h3(Colors.white))),
                      ),
                      const SizedBox(width: 12),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('Hi, ${rider?.name.split(' ').first ?? 'Rider'}', style: AppTypography.h2(Colors.white)),
                        Row(children: [
                          const Icon(LucideIcons.star, size: 14, color: AppColors.warning),
                          const SizedBox(width: 4),
                          Text('${rider?.rating.toStringAsFixed(1) ?? '0.0'} · ${rider?.totalTrips ?? 0} trips', style: AppTypography.bodySm(Colors.white70)),
                        ]),
                      ])),
                      IconButton(tooltip: 'Headset', 
                        icon: const Icon(LucideIcons.headset, color: Colors.white),
                        onPressed: () => context.push(RiderRoutes.support),
                      ),
                      IconButton(tooltip: 'Circle Alert', 
                        icon: const Icon(LucideIcons.circleAlert, color: Colors.white),
                        onPressed: () => context.push(RiderRoutes.sos),
                      ),
                    ]),
                    const SizedBox(height: 24),
                    // Go-online / offline big toggle
                    _OnlineToggleCard(
                      online: online.isOnline,
                      sessionEndsAt: online.sessionEndsAt,
                      onExtend: online.isOnline ? _extendSession : null,
                      onToggle: () {
                        HapticFeedback.mediumImpact();
                        if (online.isOnline) {
                          _showOfflineSheet();
                        } else {
                          _goOnline();
                        }
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                // Today stats
                Row(children: [
                  _stat('Today earnings', todayEarnings, LucideIcons.wallet, AppColors.success, onTap: () => context.push(RiderRoutes.earnings)),
                  const SizedBox(width: 12),
                  _stat('Trips today', tripsToday, LucideIcons.bike, AppColors.info, onTap: () => context.push(RiderRoutes.orders)),
                ]),
                const SizedBox(height: 12),
                Row(children: [
                  _stat('This week', weekEarnings, LucideIcons.trendingUp, AppColors.primary, onTap: () => context.push(RiderRoutes.earnings)),
                  const SizedBox(width: 12),
                  _stat('Wallet', walletBalance, LucideIcons.landmark, AppColors.warning, onTap: () => context.push(RiderRoutes.wallet)),
                ]),
                const SizedBox(height: 24),
                // Quick actions
                Text('Quick actions', style: AppTypography.h3()),
                const SizedBox(height: 12),
                GridView.count(
                  crossAxisCount: 4,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  children: [
                    _quickAction(LucideIcons.map, 'Demand', () => context.push(RiderRoutes.demand)),
                    _quickAction(LucideIcons.clipboardList, 'Orders', () => context.go(RiderRoutes.orders)),
                    _quickAction(LucideIcons.wallet, 'Wallet', () => context.push(RiderRoutes.wallet)),
                    _quickAction(LucideIcons.history, 'Trips', () => context.push(RiderRoutes.trips)),
                    _quickAction(LucideIcons.calendar, 'Schedule', () => context.push(RiderRoutes.schedule)),
                    _quickAction(LucideIcons.headset, 'Support', () => context.push(RiderRoutes.support)),
                    _quickAction(LucideIcons.circleAlert, 'SOS', () => context.push(RiderRoutes.sos)),
                    _quickAction(LucideIcons.user, 'Profile', () => context.go(RiderRoutes.profile)),
                  ],
                ),
                const SizedBox(height: 24),
                // When online and idle, show explainable positioning guidance
                // above the existing order-waiting card.
                if (peakPay != null && peakPay.amountPesewas > 0) ...[
                  _PeakPayBanner(peak: peakPay),
                  const SizedBox(height: 12),
                ],
                if (nextBlock != null) ...[
                  _ScheduledDashBanner(block: nextBlock),
                  const SizedBox(height: 12),
                ],
                if (online.isOnline && trips.currentTrip == null) ...[
                  _DemandPositioningCard(positioning: positioning, warning: online.locationWarning),
                  const SizedBox(height: 12),
                  _LookingForOrdersCard(),
                ] else if (online.isPaused)
                  _PausedCard(onResume: _resume, until: online.pausedUntil)
                else if (!online.isOnline)
                  _OfflineCard(onGoOnline: _goOnline),
                const SizedBox(height: 20),
                // Recent trips
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Text('Recent trips', style: AppTypography.h3()),
                  TextButton(onPressed: () => context.push(RiderRoutes.trips), child: const Text('See all')),
                ]),
                const SizedBox(height: 8),
                ...trips.history.take(3).map((t) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: _TripTile(trip: t),
                    )),
                const SizedBox(height: 100),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _stat(String label, String value, IconData i, Color c, {required VoidCallback onTap}) => Expanded(
        child: AnimatedPress(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10)]),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Icon(i, size: 18, color: c),
              const SizedBox(height: 10),
              Text(value, style: AppTypography.h2().copyWith(fontSize: 22)),
              Text(label, style: AppTypography.bodySm()),
            ]),
          ),
        ),
      ).animate().fadeIn(duration: Motion.medium).slideY(begin: 0.2);

  Widget _quickAction(IconData i, String l, VoidCallback onTap) => AnimatedPress(
        onTap: onTap,
        child: Column(children: [
          Container(width: 50, height: 50, decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(14)), child: Icon(i, color: AppColors.primary)),
          const SizedBox(height: 6),
          Text(l, style: AppTypography.caption(), textAlign: TextAlign.center),
        ]),
      );

  void _showOfflineSheet() {
    String reason = 'Taking a break';
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (c) => StatefulBuilder(builder: (c, setS) => Padding(
            padding: const EdgeInsets.all(20),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Go offline?', style: AppTypography.h2()),
              const SizedBox(height: 8),
              Text('You won\'t receive new delivery offers.', style: AppTypography.body()),
              const SizedBox(height: 16),
              Wrap(spacing: 8, runSpacing: 8, children: [
                for (final r in ['Taking a break', 'Bike issue', 'End of shift', 'Low battery'])
                  ChoiceChip(
                    label: Text(r),
                    selected: reason == r,
                    selectedColor: AppColors.primary.withOpacity(0.15),
                    onSelected: (_) => setS(() => reason = r),
                  ),
              ]),
              const SizedBox(height: 20),
              Row(children: [
                Expanded(child: OutlinedButton(
                  onPressed: _pause,
                  child: const Text('Pause 30 min'),
                )),
                const SizedBox(width: 10),
                Expanded(child: OreButton(
                  label: 'Go offline',
                  onPressed: () => _goOffline(reason),
                  variant: OreButtonVariant.danger,
                )),
              ]),
              SizedBox(height: MediaQuery.of(c).viewInsets.bottom),
            ]),
          )),
    );
  }
}

class _OnlineToggleCard extends StatelessWidget {
  final bool online;
  final DateTime? sessionEndsAt;
  final VoidCallback? onExtend;
  final VoidCallback onToggle;
  const _OnlineToggleCard({required this.online, this.sessionEndsAt, this.onExtend, required this.onToggle});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: online ? AppColors.success : Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(children: [
        Container(
          width: 54, height: 54,
          decoration: BoxDecoration(color: online ? Colors.white24 : AppColors.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(16)),
          child: Icon(online ? LucideIcons.power : LucideIcons.powerOff, color: online ? Colors.white : AppColors.primary, size: 28),
        ),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(online ? 'You\'re online' : 'You\'re offline', style: AppTypography.h3(online ? Colors.white : Colors.black)),
          Text(
            online
                ? (sessionEndsAt == null ? 'You\'re receiving offers' : 'Online until ${MaterialLocalizations.of(context).formatTimeOfDay(TimeOfDay.fromDateTime(sessionEndsAt!.toLocal()))}')
                : 'Tap to start accepting orders',
            style: AppTypography.bodySm(online ? Colors.white70 : AppColors.textSecondary),
          ),
        ])),
        if (online && onExtend != null)
          IconButton(
            tooltip: 'Extend session',
            onPressed: onExtend,
            icon: const Icon(LucideIcons.clock, color: Colors.white),
          ),
        Switch(
          value: online,
          onChanged: (_) => onToggle(),
          activeColor: Colors.white,
          activeTrackColor: Colors.white24,
          inactiveTrackColor: AppColors.border,
        ),
      ]),
    ).animate().fadeIn(duration: Motion.medium).scale();
  }
}

class _ScheduledDashBanner extends StatelessWidget {
  const _ScheduledDashBanner({required this.block});

  final RiderBlock block;

  @override
  Widget build(BuildContext context) {
    final local = MaterialLocalizations.of(context);
    final start = block.startsAt.toLocal();
    final end = block.endsAt.toLocal();
    final covering = block.covers(DateTime.now());
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => context.push(RiderRoutes.schedule),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.info.withOpacity(0.08),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.info.withOpacity(0.25)),
          ),
          child: Row(children: [
            Icon(LucideIcons.calendar, color: covering ? AppColors.success : AppColors.info),
            const SizedBox(width: 10),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(covering ? 'Scheduled dash' : 'Upcoming dash', style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w800)),
                Text(
                  '${local.formatTimeOfDay(TimeOfDay.fromDateTime(start))} – ${local.formatTimeOfDay(TimeOfDay.fromDateTime(end))}'
                  '${covering ? (onlineHint(covering)) : ''}',
                  style: AppTypography.caption(),
                ),
              ]),
            ),
            const Icon(LucideIcons.chevronRight, color: AppColors.textMuted),
          ]),
        ),
      ),
    );
  }

  String onlineHint(bool covering) => covering ? ' · go online to start receiving offers' : '';
}

class _PeakPayBanner extends StatelessWidget {
  const _PeakPayBanner({required this.peak});

  final RiderPeakPay peak;

  @override
  Widget build(BuildContext context) {
    final ends = peak.endsAt;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.warning.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.warning.withOpacity(0.25)),
      ),
      child: Row(children: [
        const Icon(LucideIcons.zap, color: AppColors.warning),
        const SizedBox(width: 10),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(peak.title ?? 'Peak pay', style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w800)),
            Text(
              [
                'Peak +${Formatters.money(peak.amountPesewas / 100)} on qualifying offers',
                if (ends != null) 'until ${MaterialLocalizations.of(context).formatTimeOfDay(TimeOfDay.fromDateTime(ends.toLocal()))}',
              ].join(' · '),
              style: AppTypography.caption(),
            ),
          ]),
        ),
      ]),
    );
  }
}

class _DemandPositioningCard extends StatelessWidget {
  const _DemandPositioningCard({required this.positioning, this.warning});

  final RiderPositioningNotifier positioning;
  final String? warning;

  @override
  Widget build(BuildContext context) {
    final best = positioning.bestZone;
    if (positioning.loading && best == null) {
      return _box(
        child: const Row(children: [
          SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
          SizedBox(width: 12),
          Expanded(child: Text('Checking nearby demand areas…')),
        ]),
      );
    }
    if (best == null) {
      return _box(
        child: Row(children: [
          const Icon(LucideIcons.mapPinOff, color: AppColors.textMuted),
          const SizedBox(width: 10),
          Expanded(child: Text(warning ?? positioning.error ?? 'No reliable positioning area is available yet.', style: AppTypography.bodySm())),
          IconButton(
            tooltip: 'Open demand map',
            onPressed: () => context.push(RiderRoutes.demand),
            icon: const Icon(LucideIcons.map, size: 18),
          ),
          IconButton(
            tooltip: 'Refresh',
            onPressed: positioning.loading ? null : positioning.refresh,
            icon: const Icon(LucideIcons.refreshCw, size: 18),
          ),
        ]),
      );
    }

    return _box(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(LucideIcons.flame, color: AppColors.warning, size: 20),
          const SizedBox(width: 8),
          Expanded(child: Text('Best area now', style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w800))),
          Text(best.demandLevel, style: AppTypography.caption(AppColors.warning).copyWith(fontWeight: FontWeight.w800)),
        ]),
        const SizedBox(height: 10),
        Text(best.zoneName, style: AppTypography.h3()),
        const SizedBox(height: 4),
        Text('${best.distanceFromRiderKm.toStringAsFixed(1)} km away · ${best.expectedWaitMin}–${best.expectedWaitMax} min estimated wait', style: AppTypography.bodySm()),
        const SizedBox(height: 6),
        Text(best.reason, style: AppTypography.caption()),
        if (best.serviceTypes.isNotEmpty) ...[
          const SizedBox(height: 8),
          Wrap(spacing: 6, children: best.serviceTypes.map((type) => Chip(label: Text(type), visualDensity: VisualDensity.compact)).toList()),
        ],
        const SizedBox(height: 6),
        Text('Updated ${Formatters.timeAgo(best.freshAt)} · ${best.confidence.toLowerCase()} confidence', style: AppTypography.caption(AppColors.textMuted)),
        const SizedBox(height: 8),
        Row(children: [
          Expanded(child: Text('Hotspots guide positioning; they do not guarantee an order.', style: AppTypography.caption(AppColors.textMuted))),
          TextButton.icon(
            onPressed: () => context.push(RiderRoutes.demand),
            icon: const Icon(LucideIcons.map, size: 16),
            label: const Text('Map'),
          ),
          TextButton.icon(
            onPressed: () => _navigate(context, best),
            icon: const Icon(LucideIcons.navigation, size: 16),
            label: const Text('Go'),
          ),
        ]),
        if ((positioning.data?.zones.length ?? 0) > 1) ...[
          const Divider(height: 18),
          Text('Alternatives', style: AppTypography.caption(AppColors.textMuted).copyWith(fontWeight: FontWeight.w800)),
          ...positioning.data!.zones.skip(1).take(2).map((zone) => ListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                leading: Icon(zone.demandLevel == 'HIGH' ? LucideIcons.flame : LucideIcons.mapPin, size: 18, color: zone.demandLevel == 'HIGH' ? AppColors.warning : AppColors.info),
                title: Text(zone.zoneName, style: AppTypography.bodySm().copyWith(fontWeight: FontWeight.w700)),
                subtitle: Text('${zone.distanceFromRiderKm.toStringAsFixed(1)} km · ${zone.expectedWaitMin}–${zone.expectedWaitMax} min wait'),
                trailing: Text(zone.demandLevel, style: AppTypography.caption()),
                onTap: () => _navigate(context, zone),
              )),
        ],
      ]),
    );
  }

  Widget _box({required Widget child}) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.warning.withOpacity(0.25)),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 8)],
        ),
        child: child,
      );

  Future<void> _navigate(BuildContext context, RiderDemandZone zone) async {
    final uri = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=${zone.centerLat},${zone.centerLng}');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}

class _LookingForOrdersCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [AppColors.primary.withOpacity(0.1), AppColors.accent.withOpacity(0.05)]),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.primary.withOpacity(0.15)),
      ),
      child: Row(children: [
        const SizedBox(
          width: 42, height: 42,
          child: CircularProgressIndicator(strokeWidth: 2.5, color: AppColors.primary),
        ),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Looking for orders nearby…', style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w800)),
          Text('Stay online and we\'ll send offers', style: AppTypography.caption()),
        ])),
      ]),
    );
  }
}

class _OfflineCard extends StatelessWidget {
  final VoidCallback onGoOnline;
  const _OfflineCard({required this.onGoOnline});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Icon(LucideIcons.bike, size: 36, color: AppColors.textMuted),
        const SizedBox(height: 10),
        Text('Ready to ride?', style: AppTypography.h3()),
        const SizedBox(height: 6),
        Text('Go online to receive nearby offers. Location stays on with the screen locked and uses extra battery until you go offline.', style: AppTypography.body()),
        const SizedBox(height: 14),
        OreButton(label: 'Go online', onPressed: onGoOnline),
      ]),
    );
  }
}

class _PausedCard extends StatelessWidget {
  const _PausedCard({required this.onResume, this.until});

  final VoidCallback onResume;
  final DateTime? until;

  @override
  Widget build(BuildContext context) {
    final untilText = until == null ? '' : ' until ${MaterialLocalizations.of(context).formatTimeOfDay(TimeOfDay.fromDateTime(until!.toLocal()))}';
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: AppColors.warning.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
      child: Row(children: [
        const Icon(LucideIcons.pause, size: 36, color: AppColors.warning),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Session paused', style: AppTypography.h3()),
          Text('You will not receive new offers$untilText.', style: AppTypography.bodySm()),
        ])),
        TextButton(onPressed: onResume, child: const Text('Resume')),
      ]),
    );
  }
}

class _TripTile extends StatelessWidget {
  final dynamic trip;
  const _TripTile({required this.trip});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 8)]),
      child: Row(children: [
        Container(
          width: 42, height: 42,
          decoration: BoxDecoration(color: trip.service.color.withOpacity(0.12), borderRadius: BorderRadius.circular(12)),
          child: Icon(trip.service.icon, color: trip.service.color, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(trip.id + ' · ' + trip.service.label, style: AppTypography.body().copyWith(fontWeight: FontWeight.w700)),
          Text('${trip.pickupLabel} → ${trip.dropoffLabel}', style: AppTypography.caption(), maxLines: 1, overflow: TextOverflow.ellipsis),
          Text(Formatters.timeAgo(trip.createdAt), style: AppTypography.caption(AppColors.textMuted)),
        ])),
        Text('₵${trip.payout.toStringAsFixed(2)}', style: AppTypography.bodyLg(AppColors.success).copyWith(fontWeight: FontWeight.w800)),
      ]),
    );
  }
}
