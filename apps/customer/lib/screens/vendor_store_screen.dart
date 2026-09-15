import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/ui/iconly_compat.dart';
import 'package:ore_core/ore_core.dart';
import '../core/ui/customer_image.dart';
import '../core/ui/toast_x.dart';
import '../providers/customer_catalog_provider.dart';
import '../providers/cart_provider.dart';
import '../widgets/add_to_cart_sheet.dart';

class VendorStoreScreen extends ConsumerStatefulWidget {
  const VendorStoreScreen({super.key, required this.vendorId});
  final String vendorId;
  @override
  ConsumerState<VendorStoreScreen> createState() => _VendorStoreScreenState();
}

class _VendorStoreScreenState extends ConsumerState<VendorStoreScreen> {
  String _search = '';
  String? _activeCat;
  final ScrollController _scroll = ScrollController();
  bool _showTitle = false;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(() {
      final show = _scroll.offset > 220;
      if (show != _showTitle) setState(() => _showTitle = show);
    });
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final detailAsync = ref.watch(customerVendorDetailProvider(widget.vendorId));
    if (detailAsync.isLoading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (detailAsync.hasError || !detailAsync.hasValue) return Scaffold(appBar: AppBar(), body: const Center(child: Text('Error loading vendor')));
    
    final detail = detailAsync.value!;
    final vendor = detail.vendor;
    final products = detail.products;
    final cats = detail.categories;
    final cartCount = ref.watch(cartCountProvider);
    
    final grouped = <String, List<OreProduct>>{};
    for (final c in cats) {
      grouped[c.name] = products.where((p) => p.categoryName == c.name || (c.id == 'c_popular' && p.isPopular)).toList();
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          CustomScrollView(
            controller: _scroll,
            physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
            slivers: [
              SliverAppBar(
                expandedHeight: 300,
                pinned: true,
                stretch: true,
                backgroundColor: Colors.white,
                leading: IconButton(
                  icon: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.9), shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 8)]),
                    child: const Icon(IconlyLight.arrowLeft2, color: AppColors.textPrimary, size: 22),
                  ),
                  onPressed: () => context.pop(),
                ),
                actions: [
                  IconButton(
                    icon: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: Colors.white.withOpacity(0.9), shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 8)]),
                      child: const Icon(IconlyLight.search, color: AppColors.textPrimary, size: 22),
                    ),
                    onPressed: () => context.push('/search?vendorId=${widget.vendorId}'),
                  ),
                ],
                flexibleSpace: FlexibleSpaceBar(
                  title: _showTitle ? Text(vendor.name, style: AppTypography.h2().copyWith(fontWeight: FontWeight.w800)) : null,
                  centerTitle: true,
                  stretchModes: const [StretchMode.zoomBackground],
                  background: Stack(
                    fit: StackFit.expand,
                    children: [
                      Hero(
                        tag: 'vendor-cover-${vendor.id}',
                        child: CustomerImage(vendor.coverUrl ?? 'assets/images/vendors/restaurant_nana.jpg', fit: BoxFit.cover),
                      ),
                      DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(colors: [Colors.black.withOpacity(0.8), Colors.transparent], begin: Alignment.bottomCenter, end: Alignment.center),
                        ),
                      ),
                      Positioned(
                        left: 24, right: 24, bottom: 24,
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(vendor.name, style: AppTypography.display(Colors.white).copyWith(fontSize: 34)),
                          const SizedBox(height: 8),
                          Row(children: [
                            const Icon(IconlyBold.star, color: AppColors.accent, size: 18),
                            const SizedBox(width: 6),
                            Text('${vendor.rating} (${vendor.reviewCount}+)', style: AppTypography.body(Colors.white).copyWith(fontWeight: FontWeight.w800)),
                            const SizedBox(width: 12),
                            Text('·  ${vendor.category}', style: AppTypography.body(Colors.white70)),
                          ]),
                        ]),
                      ),
                    ],
                  ),
                ),
              ),

              SliverToBoxAdapter(
                child: Container(
                  color: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                  child: Row(children: [
                    _infoPill(IconlyBold.timeCircle, vendor.etaLabel),
                    const SizedBox(width: 12),
                    _infoPill(IconlyBold.send, vendor.deliveryFeeLabel),
                  ]),
                ),
              ),

              SliverPersistentHeader(
                pinned: true,
                delegate: _CatTabs(
                  categories: cats.map((c) => c.name).toList(),
                  active: _activeCat,
                  onTap: (c) {
                    Haptics.selection();
                    setState(() => _activeCat = c);
                  },
                ),
              ),

              for (final entry in grouped.entries)
                if (entry.value.isNotEmpty && (_activeCat == null || _activeCat == entry.key))
                  ...[
                    SliverPadding(
                      padding: const EdgeInsets.only(left: 24, right: 24, top: 24, bottom: 12),
                      sliver: SliverToBoxAdapter(child: Text(entry.key, style: AppTypography.h2().copyWith(fontSize: 22))),
                    ),
                    SliverPadding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      sliver: SliverList.separated(
                        itemCount: entry.value.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 16),
                        itemBuilder: (c, i) => _ProductTile(
                          product: entry.value[i],
                          vendor: vendor,
                          onTap: () => _openProduct(entry.value[i], vendor),
                        ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.1, curve: Curves.easeOutExpo),
                      ),
                    ),
                  ],

              const SliverToBoxAdapter(child: SizedBox(height: 200)), // Space for bottom cart
            ],
          ),

          if (cartCount > 0)
            Positioned(
              left: 24, right: 24, bottom: MediaQuery.of(context).padding.bottom + 24,
              child: _CartBar(vendor: vendor, count: cartCount, onTap: () { Haptics.selection(); context.push('/cart'); }),
            ),
        ],
      ),
    );
  }

  void _openProduct(OreProduct p, OreVendor vendor) {
    Haptics.selection();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AddToCartSheet(
        product: p,
        vendorId: widget.vendorId,
        vendorName: vendor.name,
        onAdded: () {
          Haptics.success();
          OreToast.show(context, message: 'Added to cart successfully', type: ToastType.success);
        },
      ),
    );
  }

  Widget _infoPill(IconData i, String t) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(24)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(i, size: 18, color: AppColors.primary),
          const SizedBox(width: 8),
          Text(t, style: AppTypography.body().copyWith(fontWeight: FontWeight.w800)),
        ]),
      );
}

class _CatTabs extends SliverPersistentHeaderDelegate {
  _CatTabs({required this.categories, required this.active, required this.onTap});
  final List<String> categories;
  final String? active;
  final ValueChanged<String> onTap;

  @override double get minExtent => 64;
  @override double get maxExtent => 64;

  @override Widget build(BuildContext context, double shrink, bool overlaps) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (c, i) {
          final cat = categories[i];
          final sel = cat == active;
          return AnimatedPress(
            onTap: () => onTap(cat),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOutExpo,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              margin: const EdgeInsets.symmetric(vertical: 8),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: sel ? AppColors.primary : AppColors.surface,
                borderRadius: BorderRadius.circular(32),
                border: Border.all(color: sel ? AppColors.primary : AppColors.border, width: 1.5),
              ),
              child: Text(cat, style: AppTypography.body(sel ? Colors.white : AppColors.textSecondary).copyWith(fontWeight: FontWeight.w800)),
            ),
          );
        },
      ),
    );
  }
  @override bool shouldRebuild(covariant _CatTabs old) => old.active != active;
}

class _ProductTile extends StatelessWidget {
  const _ProductTile({required this.product, required this.vendor, required this.onTap});
  final OreProduct product;
  final OreVendor vendor;
  final VoidCallback onTap;

  @override Widget build(BuildContext context) {
    return AnimatedPress(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 24, offset: const Offset(0, 8))],
        ),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(product.name, style: AppTypography.h3().copyWith(fontSize: 18)),
              if (product.description != null) ...[
                const SizedBox(height: 6),
                Text(product.description!, style: AppTypography.bodySm(AppColors.textSecondary), maxLines: 2, overflow: TextOverflow.ellipsis),
              ],
              const SizedBox(height: 12),
              Text(Formatters.money(product.price), style: AppTypography.h2(AppColors.primary)),
            ]),
          ),
          const SizedBox(width: 16),
          Stack(children: [
            Hero(
              tag: 'prod-${product.id}',
              child: ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: CustomerImage(product.imageUrl ?? vendor.coverUrl ?? 'assets/images/vendors/restaurant_nana.jpg', width: 110, height: 110, fit: BoxFit.cover),
              ),
            ),
            Positioned(
              right: -4, bottom: -4,
              child: Container(
                width: 40, height: 40,
                decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 10, offset: Offset(0, 4))]),
                child: const Icon(IconlyBold.plus, color: Colors.white, size: 20),
              ),
            ),
          ]),
        ]),
      ),
    );
  }
}

class _CartBar extends StatelessWidget {
  const _CartBar({required this.vendor, required this.count, required this.onTap});
  final OreVendor vendor;
  final int count;
  final VoidCallback onTap;

  @override Widget build(BuildContext context) {
    return AnimatedPress(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [AppColors.primary, Color(0xFF0284C7)]),
          borderRadius: BorderRadius.circular(28),
          boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.4), blurRadius: 30, offset: const Offset(0, 12))],
        ),
        child: Row(children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.white.withOpacity(0.25), borderRadius: BorderRadius.circular(16)),
            child: const Icon(IconlyBold.buy, color: Colors.white, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
              Text('$count item${count > 1 ? 's' : ''}', style: AppTypography.h3(Colors.white)),
              Text('View cart & checkout', style: AppTypography.bodySm(Colors.white.withOpacity(0.8))),
            ]),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
            child: Text('Checkout', style: AppTypography.button(AppColors.primary)),
          ),
        ]),
      ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.5, curve: Curves.easeOutBack),
    );
  }
}
