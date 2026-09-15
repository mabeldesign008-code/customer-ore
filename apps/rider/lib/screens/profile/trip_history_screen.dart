import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ore_core/ore_core.dart';

import '../../core/router/app_router.dart';
import '../../providers/rider_provider.dart';

class RiderTripHistoryScreen extends ConsumerWidget {
  const RiderTripHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trips = ref.watch(tripsProvider);
    final history = trips.history;
    final total = history.fold<double>(0, (p, t) => p + t.payout);

    return Scaffold(
      appBar: AppBar(title: Text('Trip history', style: AppTypography.h2())),
      body: Column(children: [
        Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.08), borderRadius: BorderRadius.circular(16)),
          child: Row(children: [
            _miniStat('${history.length}', 'Trips'),
            Container(width: 1, height: 34, color: AppColors.border, margin: const EdgeInsets.symmetric(horizontal: 14)),
            _miniStat(Formatters.money(total), 'Earned'),
          ]),
        ),
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: history.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (c, i) => AnimatedPress(
              onTap: () => context.push(RiderRoutes.orderDetail.replaceFirst(':id', history[i].id)),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 8)]),
                child: Row(children: [
                  Container(width: 42, height: 42, decoration: BoxDecoration(color: history[i].service.color.withOpacity(0.12), borderRadius: BorderRadius.circular(12)), child: Icon(history[i].service.icon, color: history[i].service.color, size: 20)),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${history[i].id} · ${history[i].service.label}', style: AppTypography.body().copyWith(fontWeight: FontWeight.w700)),
                    Text('${history[i].pickupLabel} → ${history[i].dropoffLabel}', style: AppTypography.caption(), maxLines: 1, overflow: TextOverflow.ellipsis),
                    Text(Formatters.formatDate(history[i].createdAt), style: AppTypography.caption(AppColors.textMuted)),
                  ])),
                  Text(Formatters.money(history[i].payout), style: AppTypography.bodyLg(AppColors.success).copyWith(fontWeight: FontWeight.w800)),
                ]),
              ),
            ).animate().fadeIn(delay: Duration(milliseconds: 40 * i)).slideY(begin: 0.05),
          ),
        ),
      ]),
    );
  }

  Widget _miniStat(String v, String l) => Expanded(child: Column(children: [
    Text(v, style: AppTypography.h2(AppColors.primary).copyWith(fontWeight: FontWeight.w800)),
    Text(l, style: AppTypography.caption()),
  ]));
}
