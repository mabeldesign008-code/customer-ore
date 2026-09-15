import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ore_core/ore_core.dart';
import '../core/ui/customer_image.dart';

import '../providers/customer_catalog_provider.dart';

class LaundryVendorsScreen extends ConsumerWidget {
  const LaundryVendorsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final vendorsAsync = ref.watch(customerVendorsProvider(ServiceType.laundry));
    final vendors = vendorsAsync.value ?? const <OreVendor>[];
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 16, 8),
            child: Row(children: [
              IconButton(tooltip: 'Action', 
                onPressed: () => context.pop(),
                icon: const Icon(Icons.arrow_back_ios_new_rounded),
              ),
              Expanded(child: Text('Laundry', style: AppTypography.h3())),
            ]),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(customerVendorsProvider(ServiceType.laundry));
                try {
                  await ref.read(customerVendorsProvider(ServiceType.laundry).future);
                } finally {
                  HapticFeedback.lightImpact();
                }
              },
              color: AppColors.laundry,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(
                  parent: BouncingScrollPhysics(),
                ),
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                children: [
          // Hero
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [AppColors.laundry, AppColors.laundry.withOpacity(0.7)]),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Laundry & Dry Cleaning', style: AppTypography.h2(Colors.white).copyWith(fontSize: 20)),
                const SizedBox(height: 6),
                Text('Pickup, clean, deliver back to you', style: AppTypography.bodySm(Colors.white70)),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                  child: Text('Free pickup', style: AppTypography.caption(AppColors.laundry).copyWith(fontWeight: FontWeight.w800)),
                ),
              ])),
              const Icon(Icons.checkroom_rounded, color: Colors.white, size: 60),
            ]),
          ).animate().fadeIn().slideY(begin: 0.1, curve: Motion.spring),
          const SizedBox(height: 24),
          Text('Available services', style: AppTypography.h2()),
          const SizedBox(height: 12),
          if (vendorsAsync.isLoading)
            const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator(semanticsLabel: 'Loading')))
          else if (vendorsAsync.hasError)
            OreEmptyState(
              icon: Icons.wifi_off_rounded,
              title: 'Laundry Vendors unavailable',
              subtitle: 'Check your location and connection, then retry.',
              ctaLabel: 'Retry',
              onCta: () => ref.invalidate(customerVendorsProvider(ServiceType.laundry)),
            )
          else
            for (int i = 0; i < vendors.length; i++)
              _LaundryVendorCard(vendor: vendors[i], index: i),
                ],
              ),
            ),
          ),
        ]),
      ),
    );
  }
}

class _LaundryVendorCard extends StatelessWidget {
  const _LaundryVendorCard({required this.vendor, required this.index});
  final OreVendor vendor;
  final int index;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: OreCard(
        onTap: () => context.push('/vendor/${vendor.id}'),
        padding: EdgeInsets.zero,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            child: CustomerImage(vendor.coverUrl ?? '', height: 140, width: double.infinity, fit: BoxFit.cover, errorBuilder: (_,__,___) =>
              Container(height: 140, color: AppColors.laundry, child: const Center(child: Icon(Icons.checkroom_rounded, color: Colors.white, size: 40))),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(vendor.name, style: AppTypography.h3()),
                  const SizedBox(height: 4),
                  Row(children: [
                    const Icon(Icons.star_rounded, size: 14, color: AppColors.accent),
                    const SizedBox(width: 4),
                    Text(vendor.rating.toStringAsFixed(1), style: AppTypography.bodySm().copyWith(fontWeight: FontWeight.w700)),
                    Text(' · ${vendor.reviewCount}+ reviews', style: AppTypography.bodySm()),
                  ]),
                  const SizedBox(height: 4),
                  Row(children: [
                    Icon(Icons.schedule_rounded, size: 12, color: AppColors.textMuted),
                    const SizedBox(width: 4),
                    Text(vendor.etaLabel, style: AppTypography.caption()),
                  ]),
                ]),
              ),
              Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
            ]),
          ),
        ]),
      ).animate(delay: (index * 80).ms).fadeIn().slideY(begin: 0.1),
    );
  }
}
