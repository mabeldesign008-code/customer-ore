import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:go_router/go_router.dart';
import 'package:skeletonizer/skeletonizer.dart';
import 'package:ore_core/ore_core.dart';

import '../core/ui/customer_image.dart';
import '../core/ui/toast_x.dart';
import '../providers/customer_favorite_provider.dart';

class FavouritesScreen extends ConsumerStatefulWidget {
  const FavouritesScreen({super.key});

  @override
  ConsumerState<FavouritesScreen> createState() => _FavouritesScreenState();
}

class _FavouritesScreenState extends ConsumerState<FavouritesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(customerFavoritesProvider).ready;
    });
  }

  Future<void> _refresh() async {
    HapticFeedback.selectionClick();
    await ref.read(customerFavoritesProvider).reload();
    HapticFeedback.lightImpact();
  }

  @override
  Widget build(BuildContext context) {
    final favorites = ref.watch(customerFavoritesProvider);
    final vendors = favorites.vendors;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 16, 8),
              child: Row(
                children: [
                  IconButton(tooltip: 'Action', onPressed: () => context.pop(), icon: const Icon(Icons.arrow_back_ios_new_rounded)),
                  Expanded(child: Text('Favourites', style: AppTypography.h3())),
                ],
              ),
            ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: _refresh,
                color: AppColors.primary,
                child: Skeletonizer(
                  enabled: favorites.loading,
                  child: favorites.loading
                      ? ListView.builder(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: 4,
                          itemBuilder: (_, __) => _skeleton(),
                        )
                      : vendors.isEmpty
                          ? ListView(
                              physics: const AlwaysScrollableScrollPhysics(),
                              children: const [
                                SizedBox(height: 80),
                                OreEmptyState(
                                  icon: Icons.heart_broken_rounded,
                                  title: 'No favourites yet',
                                  subtitle: 'Tap the heart on any live Vendor to save it here.',
                                ),
                              ],
                            )
                          : ListView.builder(
                              physics: const AlwaysScrollableScrollPhysics(),
                              padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                              itemCount: vendors.length,
                              itemBuilder: (_, index) => _vendorCard(vendors[index], index),
                            ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _vendorCard(OreVendor vendor, int index) {
    return Slidable(
      key: ValueKey(vendor.id),
      endActionPane: ActionPane(
        extentRatio: 0.28,
        motion: const StretchMotion(),
        dismissible: DismissiblePane(onDismissed: () => _remove(vendor)),
        children: [
          SlidableAction(
            onPressed: (_) => _remove(vendor),
            backgroundColor: AppColors.danger,
            foregroundColor: Colors.white,
            icon: Icons.delete_outline_rounded,
            label: 'Remove',
            borderRadius: BorderRadius.circular(14),
          ),
        ],
      ),
      child: OreCard(
        margin: const EdgeInsets.only(bottom: 12),
        padding: EdgeInsets.zero,
        onTap: () => context.push('/vendor/${vendor.id}'),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.horizontal(left: Radius.circular(20)),
              child: CustomerImage(
                vendor.coverUrl ?? vendor.logoUrl ?? '',
                width: 92,
                height: 92,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  width: 92,
                  height: 92,
                  color: vendor.serviceType.color.withOpacity(0.12),
                  child: Icon(vendor.serviceType.icon, color: vendor.serviceType.color),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(vendor.name, style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    Text('${vendor.serviceType.label} · ${vendor.etaLabel}', style: AppTypography.bodySm()),
                    const SizedBox(height: 8),
                    Text(vendor.address.isEmpty ? 'Delivery fees calculated at checkout' : vendor.address, style: AppTypography.caption()),
                  ],
                ),
              ),
            ),
            const Padding(
              padding: EdgeInsets.all(12),
              child: Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 20),
            ),
          ],
        ),
      ),
    ).animate(delay: Duration(milliseconds: 50 * index)).fadeIn(duration: 350.ms).slideX(begin: 0.1, end: 0);
  }

  Future<void> _remove(OreVendor vendor) async {
    await ref.read(customerFavoritesProvider).remove(vendor.id);
    if (mounted) context.showToast('Removed from favourites', type: ToastType.info);
  }

  Widget _skeleton() => Container(
        margin: const EdgeInsets.only(bottom: 12),
        height: 92,
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
      );
}
