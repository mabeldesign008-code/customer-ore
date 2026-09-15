import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/ui/iconly_compat.dart';
import 'package:ore_core/ore_core.dart';
import 'package:shimmer/shimmer.dart';
import '../core/ui/customer_image.dart';
import '../providers/customer_catalog_provider.dart';
import '../providers/customer_favorite_provider.dart';
import '../providers/vendor_stories_provider.dart';
import '../screens/vendor_story_screen.dart';
import '../widgets/customer_address_picker.dart';

class HomeScreenV2 extends ConsumerStatefulWidget {
  const HomeScreenV2({super.key});
  @override
  ConsumerState<HomeScreenV2> createState() => _HomeScreenV2State();
}

class _HomeScreenV2State extends ConsumerState<HomeScreenV2>
    with SingleTickerProviderStateMixin {
  ServiceType _selected = ServiceType.food;
  String _location = 'Cape Coast service area';
  bool _loading = false;

  static const _services = [
    {'name': 'Food', 't': ServiceType.food},
    {'name': 'Groceries', 't': ServiceType.groceries},
    {'name': 'Market', 't': ServiceType.market},
    {'name': 'Shop', 't': ServiceType.shop},
    {'name': 'Pharmacy', 't': ServiceType.pharmacy},
    {'name': 'Laundry', 't': ServiceType.laundry},
    {'name': 'Parcel', 't': ServiceType.parcel},
    {'name': 'Errand', 't': ServiceType.errand},
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadLocationLabel());
  }

  Future<void> _loadLocationLabel() async {
    final loc = await ref.read(customerLocationProvider.future);
    if (mounted)
      setState(() => _location = loc.label ?? 'Cape Coast service area');
  }

  Future<void> _chooseLocation() async {
    HapticFeedback.selectionClick();
    final address = await showModalBottomSheet<OreAddress>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) =>
          const CustomerAddressPicker(title: 'Choose delivery location'),
    );
    if (!mounted ||
        address == null ||
        address.lat == null ||
        address.lng == null)
      return;

    ref
        .read(customerLocationOverrideProvider.notifier)
        .set(
          CustomerLocation(
            lat: address.lat!,
            lng: address.lng!,
            label: address.label ?? address.street ?? 'Selected location',
          ),
        );
    setState(
      () => _location = address.label ?? address.street ?? 'Selected location',
    );
    ref.invalidate(customerVendorsProvider(_selected));
  }

  void _onService(ServiceType t) {
    Haptics.light();
    if (t == ServiceType.parcel) {
      context.push('/parcel');
      return;
    }
    if (t == ServiceType.errand) {
      context.push('/errand');
      return;
    }
    if (t == ServiceType.laundry) {
      context.push('/laundry');
      return;
    }
    setState(() => _selected = t);
  }

  @override
  Widget build(BuildContext context) {
    final vendorsAsync = ref.watch(customerVendorsProvider(_selected));
    final vendors = vendorsAsync.value ?? const <OreVendor>[];

    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        onRefresh: () async {
          Haptics.selection();
          ref.invalidate(customerVendorsProvider(_selected));
          await ref.read(customerVendorsProvider(_selected).future);
          Haptics.light();
        },
        color: AppColors.primary,
        displacement: 40,
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(
            parent: AlwaysScrollableScrollPhysics(),
          ),
          slivers: [
            SliverAppBar(
              expandedHeight: 180,
              pinned: true,
              stretch: true,
              backgroundColor: Theme.of(context).scaffoldBackgroundColor,
              flexibleSpace: Builder(
                builder: (context) {
                  final isDark =
                      Theme.of(context).brightness == Brightness.dark;
                  final bg = isDark
                      ? AppColors.darkBackground
                      : const Color(0xFFF8FAFC);
                  return FlexibleSpaceBar(
                    titlePadding: const EdgeInsets.only(left: 24, bottom: 16),
                    title: GestureDetector(
                      onTap: _chooseLocation,
                      child: Row(
                        children: [
                          const Icon(
                            IconlyBold.location,
                            color: AppColors.primary,
                            size: 18,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            _location,
                            style: AppTypography.h3().copyWith(fontSize: 16),
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            IconlyLight.arrowDown2,
                            size: 16,
                            color: isDark
                                ? AppColors.darkTextPrimary
                                : AppColors.textPrimary,
                          ),
                        ],
                      ),
                    ),
                    background: Stack(
                      children: [
                        Positioned.fill(child: Container(color: bg)),
                        Positioned(
                          top: 60,
                          right: -40,
                          child: Icon(
                            IconlyBold.discount,
                            size: 180,
                            color: AppColors.primary.withOpacity(0.05),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
              actions: [
                Builder(
                  builder: (context) {
                    final isDark =
                        Theme.of(context).brightness == Brightness.dark;
                    return IconButton(
                      icon: Icon(
                        IconlyLight.notification,
                        color: isDark
                            ? AppColors.darkTextPrimary
                            : AppColors.textPrimary,
                      ),
                      onPressed: () => context.push('/notifications'),
                    );
                  },
                ),
                const SizedBox(width: 12),
              ],
            ),

            // Search bar + service quick-picker (dark-mode aware).
            SliverToBoxAdapter(
              child: Transform.translate(
                offset: const Offset(0, -20),
                child: Builder(
                  builder: (context) {
                    final isDark =
                        Theme.of(context).brightness == Brightness.dark;
                    final cardBg = isDark
                        ? AppColors.darkSurface
                        : Colors.white;
                    final mutedText = isDark
                        ? AppColors.darkTextMuted
                        : AppColors.textMuted;
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Tappable search field — opens full SearchScreen.
                          // Mic button is cosmetic but the SearchScreen auto-focuses
                          // the keyboard, so users can dictate via the OS
                          // keyboard's built-in voice dictation button.
                          AnimatedPress(
                            onTap: () {
                              HapticFeedback.selectionClick();
                              context.push('/search');
                            },
                            child: Container(
                              height: 54,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 18,
                              ),
                              decoration: BoxDecoration(
                                color: cardBg,
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(
                                      isDark ? 0.25 : 0.05,
                                    ),
                                    blurRadius: 20,
                                    offset: const Offset(0, 8),
                                  ),
                                ],
                                border: isDark
                                    ? Border.all(
                                        color: AppColors.darkBorder.withOpacity(
                                          0.6,
                                        ),
                                      )
                                    : null,
                              ),
                              child: Row(
                                children: [
                                  Icon(Icons.search_rounded, color: mutedText),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      'Search food, groceries, vendors…',
                                      style: AppTypography.body(mutedText),
                                    ),
                                  ),
                                  Container(
                                    width: 34,
                                    height: 34,
                                    decoration: BoxDecoration(
                                      color: AppColors.primary.withOpacity(
                                        0.08,
                                      ),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: const Icon(
                                      Icons.mic_rounded,
                                      color: AppColors.primary,
                                      size: 18,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          // Service quick-picker (food/groceries/…)
                          Container(
                            height: 120,
                            decoration: BoxDecoration(
                              color: cardBg,
                              borderRadius: BorderRadius.circular(32),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(
                                    isDark ? 0.25 : 0.06,
                                  ),
                                  blurRadius: 30,
                                  offset: const Offset(0, 10),
                                ),
                              ],
                              border: isDark
                                  ? Border.all(
                                      color: AppColors.darkBorder.withOpacity(
                                        0.6,
                                      ),
                                    )
                                  : null,
                            ),
                            child: ListView.separated(
                              scrollDirection: Axis.horizontal,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 24,
                              ),
                              itemCount: _services.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(width: 20),
                              itemBuilder: (context, index) {
                                final s = _services[index];
                                final t = s['t'] as ServiceType;
                                final isSel = t == _selected;
                                return AnimatedPress(
                                  onTap: () => _onService(t),
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Container(
                                        width: 60,
                                        height: 60,
                                        decoration: BoxDecoration(
                                          color: isSel
                                              ? AppColors.primary
                                              : (isDark
                                                    ? AppColors
                                                          .darkSurfaceElevated
                                                    : AppColors.surface),
                                          shape: BoxShape.circle,
                                          boxShadow: [
                                            BoxShadow(
                                              color: isSel
                                                  ? AppColors.primary
                                                        .withOpacity(0.4)
                                                  : Colors.transparent,
                                              blurRadius: isSel ? 16 : 0,
                                              offset: isSel
                                                  ? const Offset(0, 8)
                                                  : Offset.zero,
                                            ),
                                          ],
                                        ),
                                        child: Icon(
                                          t.icon,
                                          color: isSel
                                              ? Colors.white
                                              : (isDark
                                                    ? AppColors
                                                          .darkTextSecondary
                                                    : AppColors.textSecondary),
                                          size: 28,
                                        ),
                                      ),
                                      const SizedBox(height: 12),
                                      Text(
                                        s['name'] as String,
                                        style:
                                            AppTypography.bodySm(
                                              isSel
                                                  ? (isDark
                                                        ? AppColors
                                                              .darkTextPrimary
                                                        : AppColors.textPrimary)
                                                  : (isDark
                                                        ? AppColors
                                                              .darkTextSecondary
                                                        : AppColors
                                                              .textSecondary),
                                            ).copyWith(
                                              fontWeight: isSel
                                                  ? FontWeight.w800
                                                  : FontWeight.w600,
                                            ),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ),

            // Stories strip (Instagram-style vendor promos)
            SliverToBoxAdapter(child: _StoriesStrip(serviceType: _selected)),

            if (vendorsAsync.isLoading)
              SliverPadding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 12,
                ),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (_, __) => const Padding(
                      padding: EdgeInsets.only(bottom: 16),
                      child: _VendorCardShimmer(),
                    ),
                    childCount: 4,
                  ),
                ),
              )
            else if (vendors.isEmpty)
              SliverFillRemaining(
                child: Center(
                  child: Text(
                    'No vendors available right now',
                    style: AppTypography.h3(),
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 12,
                ),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate((context, index) {
                    final v = vendors[index];
                    return _VendorCard(vendor: v)
                        .animate()
                        .fadeIn(duration: 400.ms, delay: (index * 100).ms)
                        .slideY(begin: 0.1, curve: Curves.easeOutExpo);
                  }, childCount: vendors.length),
                ),
              ),

            const SliverToBoxAdapter(child: SizedBox(height: 120)),
          ],
        ),
      ),
    );
  }
}

class _VendorCard extends StatelessWidget {
  const _VendorCard({required this.vendor});
  final OreVendor vendor;

  @override
  Widget build(BuildContext context) {
    return AnimatedPress(
      onTap: () {
        Haptics.selection();
        context.push('/vendor/${vendor.id}');
      },
      borderRadius: BorderRadius.circular(28),
      child: Container(
        margin: const EdgeInsets.only(bottom: 24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(28),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 30,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Hero(
              tag: 'vendor-cover-${vendor.id}',
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(28),
                ),
                child: CustomerImage(
                  vendor.coverUrl ??
                      'assets/images/vendors/restaurant_nana.jpg',
                  width: double.infinity,
                  height: 180,
                  fit: BoxFit.cover,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          vendor.name,
                          style: AppTypography.h2().copyWith(fontSize: 22),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              IconlyBold.star,
                              color: AppColors.accent,
                              size: 14,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              vendor.rating.toStringAsFixed(1),
                              style: AppTypography.bodySm(
                                const Color(0xFFD97706),
                              ).copyWith(fontWeight: FontWeight.w800),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      const Icon(
                        IconlyLight.timeCircle,
                        color: AppColors.textSecondary,
                        size: 16,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        vendor.etaLabel,
                        style: AppTypography.body(AppColors.textSecondary),
                      ),
                      const SizedBox(width: 16),
                      const Icon(
                        IconlyLight.send,
                        color: AppColors.textSecondary,
                        size: 16,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        vendor.deliveryFeeLabel,
                        style: AppTypography.body(AppColors.textSecondary),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StoriesStrip extends ConsumerWidget {
  const _StoriesStrip({required this.serviceType});
  final ServiceType serviceType;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final storiesAsync = ref.watch(vendorStoriesProvider);
    final stories = storiesAsync
        .where((s) => s.serviceType == serviceType)
        .toList();
    if (stories.isEmpty) return const SizedBox.shrink();
    return Container(
      height: 108,
      margin: const EdgeInsets.only(top: 8, bottom: 4),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: stories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 14),
        itemBuilder: (context, i) {
          final story = stories[i];
          final hasUnseen = !story.isViewed;
          return AnimatedPress(
                onTap: () {
                  Haptics.selection();
                  ref
                      .read(vendorStoriesProvider.notifier)
                      .markStoryAsViewed(story.vendorId);
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => VendorStoryScreen(
                        allVendorStories: stories,
                        initialVendorIndex: i,
                      ),
                    ),
                  );
                },
                child: Column(
                  children: [
                    Container(
                      width: 72,
                      height: 72,
                      padding: const EdgeInsets.all(3),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: hasUnseen
                            ? const LinearGradient(
                                colors: [AppColors.primary, AppColors.accent],
                              )
                            : null,
                        border: hasUnseen
                            ? null
                            : Border.all(color: AppColors.border, width: 2),
                      ),
                      child: Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child: ClipOval(
                          child: CustomerImage(
                            story.vendorImage,
                            width: 64,
                            height: 64,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                              color: AppColors.surface,
                              child: const Icon(
                                Icons.storefront_rounded,
                                color: AppColors.textMuted,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    SizedBox(
                      width: 72,
                      child: Text(
                        story.vendorName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                        style: AppTypography.caption().copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              )
              .animate(delay: (i * 50).ms)
              .fadeIn()
              .scale(
                begin: const Offset(0.85, 0.85),
                curve: Curves.easeOutBack,
              );
        },
      ),
    );
  }
}

class _VendorCardShimmer extends StatelessWidget {
  const _VendorCardShimmer();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final base = isDark ? const Color(0xFF1F2747) : Colors.grey.shade200;
    final highlight = isDark ? const Color(0xFF2C3563) : Colors.grey.shade100;
    return Shimmer.fromColors(
      baseColor: base,
      highlightColor: highlight,
      child: Container(
        height: 200,
        decoration: BoxDecoration(
          color: base,
          borderRadius: BorderRadius.circular(24),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 120,
              width: double.infinity,
              decoration: BoxDecoration(
                color: base,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(24),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(height: 14, width: 160, color: base),
                  const SizedBox(height: 8),
                  Container(height: 10, width: 220, color: base),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
