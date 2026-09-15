import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart';

import '../../core/router/app_router.dart';
import '../../data/auth/rider_api_client_provider.dart';
import '../../providers/rider_provider.dart';
import 'rider_performance_card.dart';

class RiderProfileScreen extends ConsumerWidget {
  const RiderProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(riderAuthProvider);
    final rider = auth.state.rider;
    final earnings = ref.watch(riderEarningsStatementProvider).value;
    final walletBalance = earnings == null
        ? '…'
        : Formatters.money(earnings.wallet.withdrawablePesewas / 100);
    final performance = ref.watch(riderPerformanceProvider).value;

    return Scaffold(
      body: ListView(padding: EdgeInsets.zero, children: [
        // Header
        Container(
          padding: EdgeInsets.fromLTRB(20, MediaQuery.of(context).padding.top + 20, 20, 30),
          decoration: const BoxDecoration(gradient: LinearGradient(colors: [AppColors.primary, AppColors.primaryDark])),
          child: Column(children: [
            Row(children: [
              CircleAvatar(radius: 36, backgroundColor: Colors.white24, child: Text(rider?.name.substring(0, 1) ?? 'K', style: AppTypography.h1(Colors.white).copyWith(fontSize: 28))),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(rider?.name ?? 'Rider', style: AppTypography.h2(Colors.white)),
                Text(rider?.phone ?? '', style: AppTypography.bodySm(Colors.white70)),
                const SizedBox(height: 6),
                Row(children: [
                  const Icon(LucideIcons.star, size: 14, color: AppColors.accent),
                  Text(' ${rider?.rating.toStringAsFixed(1) ?? '0.0'}  ·  ${rider?.totalTrips ?? 0} trips', style: AppTypography.bodySm(Colors.white)),
                ]),
              ])),
              IconButton(tooltip: 'Action', 
                onPressed: () => OreSupportModal.show(
                  context,
                  title: 'Profile update support',
                  onOpenChat: () => context.push(RiderRoutes.supportChat),
                ),
                icon: const Icon(LucideIcons.pencil, color: Colors.white),
              ),
            ]),
            const SizedBox(height: 20),
            // Wallet mini
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(16)),
              child: Row(children: [
                const Icon(LucideIcons.wallet, color: Colors.white),
                const SizedBox(width: 10),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Wallet balance', style: AppTypography.caption(Colors.white70)),
                  Text(walletBalance, style: AppTypography.h3(Colors.white).copyWith(fontWeight: FontWeight.w800)),
                ])),
                ElevatedButton(
                  onPressed: () => context.push(RiderRoutes.wallet),
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: AppColors.primary, minimumSize: const Size(80, 36), elevation: 0),
                  child: const Text('Withdraw'),
                ),
              ]),
            ),
            if (rider != null) ...[
              const SizedBox(height: 10),
              Row(children: [
                Expanded(child: _metric('Reliability', rider.reliabilityScore.toStringAsFixed(2))),
                const SizedBox(width: 8),
                Expanded(child: _metric('Declines', '${rider.declineCount}')),
                const SizedBox(width: 8),
                Expanded(child: _metric('COD tier', rider.codTier ?? 'NEW')),
              ]),
            ],
          ]),
        ),
        if (performance != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: PerformanceCard(performance: performance),
          ),
        // Shortcut grid
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            GridView.count(
              crossAxisCount: 3,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              childAspectRatio: 1,
              children: [
                _shortcut(LucideIcons.wallet, 'Wallet', () => context.push(RiderRoutes.wallet)),
                _shortcut(LucideIcons.history, 'Trips', () => context.push(RiderRoutes.trips)),
                _shortcut(LucideIcons.fileCheck, 'Documents', () => context.push(RiderRoutes.documents)),
                _shortcut(LucideIcons.bike, 'Vehicle', () => context.push(RiderRoutes.vehicle)),
                _shortcut(LucideIcons.calendar, 'Schedule', () => context.push(RiderRoutes.schedule)),
                _shortcut(LucideIcons.bell, 'Alerts', () => context.push(RiderRoutes.notifications)),
              ],
            ),
            const SizedBox(height: 20),
            _tile(
              LucideIcons.user,
              'Personal information',
              () => OreSupportModal.show(context, title: 'Personal information support'),
            ),
            _tile(
              LucideIcons.mapPin,
              'Service area',
              () => OreSupportModal.show(context, title: 'Service area support'),
            ),
            _tile(LucideIcons.bellRing, 'Notifications', () => context.push(RiderRoutes.notifications)),
            _tile(
              LucideIcons.shieldCheck,
              'Safety & privacy',
              () => OreSupportModal.show(context, title: 'Safety & privacy support'),
            ),
            _tile(LucideIcons.headset, 'Help & support', () => context.push(RiderRoutes.support)),
            _tile(LucideIcons.circleAlert, 'SOS emergency', () => context.push(RiderRoutes.sos), color: AppColors.danger),
            _tile(LucideIcons.logOut, 'Log out', () async {
              try {
                await ref.read(riderAuthProvider).logout();
                if (context.mounted) context.go(RiderRoutes.login);
              } catch (_) {
                if (!context.mounted) return;
                OreToast.show(
                  context,
                  message: 'Unable to log out securely. Please try again.',
                  type: ToastType.error,
                );
              }
            }, color: AppColors.danger),
            const SizedBox(height: 40),
            Center(child: Text('Ore Rider · v1.0.0', style: AppTypography.caption())),
          ]),
        ),
      ]),
    );
  }

  Widget _metric(String label, String value) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
    decoration: BoxDecoration(color: Colors.white.withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: AppTypography.caption(Colors.white70), maxLines: 1, overflow: TextOverflow.ellipsis),
      const SizedBox(height: 2),
      Text(value, style: AppTypography.bodySm(Colors.white).copyWith(fontWeight: FontWeight.w800)),
    ]),
  );

  Widget _shortcut(IconData i, String l, VoidCallback onTap) => AnimatedPress(
    onTap: onTap,
    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      Container(width: 50, height: 50, decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(14)), child: Icon(i, color: AppColors.primary)),
      const SizedBox(height: 6),
      Text(l, style: AppTypography.caption(), textAlign: TextAlign.center),
    ]),
  );

  Widget _tile(IconData i, String l, VoidCallback onTap, {Color? color}) => AnimatedPress(
    onTap: onTap,
    child: Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
      child: Row(children: [
        Icon(i, color: color ?? AppColors.textSecondary),
        const SizedBox(width: 12),
        Expanded(child: Text(l, style: AppTypography.body().copyWith(fontWeight: FontWeight.w600, color: color))),
        const Icon(LucideIcons.chevronRight, color: AppColors.textMuted, size: 18),
      ]),
    ),
  );
}
