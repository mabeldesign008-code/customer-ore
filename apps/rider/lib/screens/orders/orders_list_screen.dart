import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart';

import '../../core/router/app_router.dart';
import '../../providers/rider_provider.dart';

class RiderOrdersListScreen extends ConsumerWidget {
  const RiderOrdersListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trips = ref.watch(tripsProvider);
    final current = trips.currentTrip;
    final history = trips.history;

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Text('Orders', style: AppTypography.h2()),
          bottom: const TabBar(
            labelColor: AppColors.primary,
            indicatorColor: AppColors.primary,
            tabs: [
              Tab(text: 'Active'),
              Tab(text: 'History'),
            ],
          ),
        ),
        body: TabBarView(children: [
          current == null
              ? Center(
                  child: OreEmptyState(
                    icon: LucideIcons.bike,
                    title: 'No active delivery',
                    subtitle: 'Go online to start accepting orders',
                    ctaLabel: 'Go online',
                    onCta: () async {
                      try {
                        await ref.read(onlineProvider).goOnline();
                        ref.read(tripsProvider).setPollingEnabled(true);
                      } catch (_) {
                        if (!context.mounted) return;
                        OreToast.show(
                          context,
                          message: 'Unable to go online. Please try again.',
                          type: ToastType.error,
                        );
                      }
                    },
                  ),
                )
              : ListView(padding: const EdgeInsets.all(16), children: [
                  _OrderCard(trip: current, active: true)
                      .animate()
                      .fadeIn(duration: Motion.medium)
                      .slideY(begin: 0.1),
                ]),
          history.isEmpty
              ? const Center(child: OreEmptyState(icon: LucideIcons.history, title: 'No past trips yet'))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: history.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (c, i) => _OrderCard(trip: history[i])
                      .animate()
                      .fadeIn(duration: Motion.medium, delay: Duration(milliseconds: 40 * i))
                      .slideY(begin: 0.08),
                ),
        ]),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final dynamic trip;
  final bool active;
  const _OrderCard({required this.trip, this.active = false});

  @override
  Widget build(BuildContext context) {
    return AnimatedPress(
      onTap: () => context.push(RiderRoutes.orderDetail.replaceFirst(':id', trip.id)),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: active ? Border.all(color: AppColors.primary.withOpacity(0.3), width: 1.5) : null,
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10)],
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: trip.service.color.withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
              child: Icon(trip.service.icon, color: trip.service.color, size: 18),
            ),
            const SizedBox(width: 10),
            Expanded(child: Text('${trip.id} · ${trip.service.label}', style: AppTypography.body().copyWith(fontWeight: FontWeight.w700))),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: (active ? AppColors.primary : AppColors.success).withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                active ? trip.status.riderLabel() : 'Completed',
                style: AppTypography.caption(active ? AppColors.primary : AppColors.success).copyWith(fontWeight: FontWeight.w800),
              ),
            ),
          ]),
          const SizedBox(height: 12),
          _stopRow(LucideIcons.mapPin, trip.pickupLabel, trip.pickupAddress),
          const SizedBox(height: 6),
          _stopRow(LucideIcons.flag, trip.dropoffLabel, trip.dropoffAddress, color: AppColors.success),
          const SizedBox(height: 12),
          Row(children: [
            Icon(LucideIcons.route, size: 14, color: AppColors.textMuted),
            const SizedBox(width: 4),
            Text('${trip.totalDistanceKm.toStringAsFixed(1)} km', style: AppTypography.caption()),
            const SizedBox(width: 12),
            Icon(LucideIcons.banknote, size: 14, color: AppColors.success),
            const SizedBox(width: 4),
            Text(Formatters.money(trip.payout), style: AppTypography.caption(AppColors.success).copyWith(fontWeight: FontWeight.w800)),
            const Spacer(),
            Text(Formatters.timeAgo(trip.createdAt), style: AppTypography.caption()),
          ]),
        ]),
      ),
    );
  }

  Widget _stopRow(IconData i, String title, String sub, {Color color = AppColors.primary}) {
    return Row(children: [
      Icon(i, size: 16, color: color),
      const SizedBox(width: 8),
      Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: AppTypography.body().copyWith(fontWeight: FontWeight.w600)),
          Text(sub, style: AppTypography.bodySm(), maxLines: 1, overflow: TextOverflow.ellipsis),
        ]),
      ),
    ]);
  }
}
