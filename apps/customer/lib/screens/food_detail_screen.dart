import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ore_core/ore_core.dart';
import '../core/ui/customer_image.dart';

import '../core/ui/toast_x.dart';
import '../providers/customer_catalog_provider.dart';
import '../providers/customer_favorite_provider.dart';
import '../providers/cart_provider.dart';
import '../widgets/add_to_cart_sheet.dart';

class FoodDetailScreen extends ConsumerWidget {
  const FoodDetailScreen({super.key, required this.vendorId, required this.productId});
  final String vendorId;
  final String productId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(customerVendorDetailProvider(vendorId));
    if (detailAsync.isLoading) return const Scaffold(body: Center(child: CircularProgressIndicator(semanticsLabel: 'Loading')));
    final detail = detailAsync.value;
    final vendor = detail?.vendor;
    OreProduct? product;
    if (detail != null) {
      for (final candidate in detail.products) {
        if (candidate.id == productId) { product = candidate; break; }
      }
    }

    if (product == null || vendor == null) {
      return Scaffold(
        body: SafeArea(
          child: Column(children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 16, 8),
              child: Row(children: [
                IconButton(tooltip: 'Action', 
                  icon: const Icon(Icons.arrow_back_ios_new_rounded),
                  onPressed: () => context.pop(),
                ),
              ]),
            ),
            Expanded(
              child: OreEmptyState(
                icon: Icons.search_off_rounded,
                title: 'Product not found',
                subtitle: 'It may have been removed by the vendor.',
                ctaLabel: 'Back',
                onCta: () => context.pop(),
              ),
            ),
          ]),
        ),
      );
    }

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 300,
            pinned: true,
            stretch: true,
            leading: IconButton(tooltip: 'Action', 
              onPressed: () => context.pop(),
              icon: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: Colors.black.withOpacity(0.4), shape: BoxShape.circle),
                child: const Icon(Icons.arrow_back, color: Colors.white),
              ),
            ),
            flexibleSpace: FlexibleSpaceBar(
              stretchModes: const [StretchMode.zoomBackground],
              background: Hero(
                tag: 'prod-${product.id}',
                child: CustomerImage(
                  product.imageUrl ?? vendor.coverUrl ?? 'assets/images/vendors/restaurant_nana.jpg',
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(color: AppColors.primary),
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(
                    child: Text(product.name, style: AppTypography.h1())
                        .animate()
                        .fadeIn(delay: 200.ms, duration: 400.ms)
                        .slideY(begin: 0.15),
                  ),
                  IconButton(tooltip: 'Action', 
                    onPressed: () async {
                      HapticFeedback.selectionClick();
                      final favorites = ref.read(customerFavoritesProvider);
                      final wasFav = favorites.contains(vendor.id);
                      try {
                        await favorites.toggle(vendor);
                        if (!context.mounted) return;
                        context.showToast(
                          wasFav ? 'Removed from favourites' : 'Added to favourites',
                          type: ToastType.success,
                        );
                      } catch (error) {
                        if (!context.mounted) return;
                        final message = error.toString().replaceFirst('Exception: ', '').trim();
                        context.showToast(
                          message.isEmpty ? 'Favourites could not be updated.' : message,
                          type: ToastType.error,
                        );
                      }
                    },
                    icon: Icon(
                      Icons.favorite_outline_rounded,
                      color: ref.watch(customerFavoritesProvider).contains(vendor.id)
                          ? AppColors.danger
                          : AppColors.textMuted,
                    ),
                  ),
                ]),
                if (product.description != null) ...[
                  Text(product.description!, style: AppTypography.body())
                      .animate()
                      .fadeIn(delay: 260.ms)
                      .slideY(begin: 0.1),
                  const SizedBox(height: 12),
                ],
                Row(children: [
                  const Icon(Icons.star_rounded, size: 16, color: AppColors.accent),
                  const SizedBox(width: 4),
                  Text('${product.rating}', style: AppTypography.bodySm().copyWith(fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                  Text(' · ${product.ratingCount} ratings', style: AppTypography.bodySm()),
                  const Spacer(),
                  Text(Formatters.money(product.price),
                      style: AppTypography.h2(AppColors.primary)),
                ]).animate().fadeIn(delay: 300.ms).slideY(begin: 0.1),
                const SizedBox(height: 24),
                Text(
                  'From ${vendor.name}',
                  style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w700),
                ).animate().fadeIn(delay: 360.ms).slideY(begin: 0.1),
                Text(vendor.deliveryFeeLabel, style: AppTypography.bodySm())
                    .animate()
                    .fadeIn(delay: 400.ms)
                    .slideY(begin: 0.1),
                const SizedBox(height: 40),
              ]),
            ),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 20, offset: const Offset(0, -6))],
        ),
        child: SafeArea(
          top: false,
          child: OreButton(
            label: 'Add to cart · ${Formatters.money(product.price)}',
            icon: Icons.add_rounded,
            onPressed: () {
              HapticFeedback.mediumImpact();
              showModalBottomSheet(
                context: context,
                isScrollControlled: true,
                backgroundColor: Colors.transparent,
                builder: (_) => AddToCartSheet(
                  product: product!,
                  vendorId: vendorId,
                  vendorName: vendor.name,
                  onAdded: () {
                    context.showToast('${product!.name} added to cart', type: ToastType.success);
                  },
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
