import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/ui/iconly_compat.dart';
import 'package:ore_core/ore_core.dart';
import '../providers/cart_provider.dart';
import '../providers/orders_provider.dart';
import '../providers/customer_auth_provider.dart';
import '../providers/notifications_provider.dart';
import 'home_screen_v2.dart';
import 'orders_screen.dart';
import 'profile_screen.dart';

class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key, required this.initialTab});
  final int initialTab;
  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  late int _index;
  final _tabs = const [
    _Tab(icon: IconlyLight.home, activeIcon: IconlyBold.home, label: 'Home'),
    _Tab(icon: IconlyLight.document, activeIcon: IconlyBold.document, label: 'Orders'),
    _Tab(icon: IconlyLight.profile, activeIcon: IconlyBold.profile, label: 'Profile'),
  ];

  @override
  void initState() {
    super.initState();
    _index = widget.initialTab;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (ref.read(customerAuthProvider).isAuthenticated) {
        ref.read(customerNotificationServiceProvider).initialize();
      }
    });
  }

  void _goTo(int i) {
    if (i == _index) return;
    Haptics.light();
    setState(() => _index = i);
    switch (i) {
      case 0: context.go('/'); break;
      case 1: context.go('/orders'); break;
      case 2: context.go('/profile'); break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final activeOrders = ref.watch(activeOrdersProvider);
    final cartCount = ref.watch(cartCountProvider);
    final firstActive = activeOrders.isNotEmpty ? activeOrders.first : null;
    final mq = MediaQuery.of(context);
    final bottomPad = mq.padding.bottom;
    const pillHeight = 72.0;
    const navBottomInset = 20.0;
    
    return Scaffold(
      extendBody: true,
      backgroundColor: AppColors.background,
      body: Stack(
        clipBehavior: Clip.none,
        children: [
          IndexedStack(index: _index, children: const [HomeScreenV2(), OrdersScreen(), ProfileScreen()]),
          if (firstActive != null && _index == 0)
            Positioned(
              left: 16, right: 16, bottom: pillHeight + navBottomInset + bottomPad + 12,
              child: const _ActiveOrderBanner().animate().fadeIn(duration: 400.ms).slideY(begin: 0.3, curve: Curves.easeOutBack),
            ),
        ],
      ),
      floatingActionButton: cartCount > 0 && _index == 0
          ? _CartFab(count: cartCount, onTap: () { Haptics.selection(); context.push('/cart'); })
              .animate().fadeIn(duration: 250.ms).scale(begin: const Offset(0.7, 0.7), curve: Curves.easeOutBack)
          : null,
      floatingActionButtonLocation: _CenterDockedFABLocation(bottomPad: bottomPad, navInset: navBottomInset),
      bottomNavigationBar: Padding(
        padding: EdgeInsets.only(left: 24, right: 24, bottom: navBottomInset + bottomPad),
        child: _FloatingPillNav(tabs: _tabs, current: _index, onTap: _goTo),
      ),
    );
  }
}

class _Tab {
  final IconData icon, activeIcon;
  final String label;
  const _Tab({required this.icon, required this.activeIcon, required this.label});
}

class _FloatingPillNav extends StatelessWidget {
  const _FloatingPillNav({required this.tabs, required this.current, required this.onTap});
  final List<_Tab> tabs;
  final int current;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(36),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 30, sigmaY: 30),
        child: Container(
          height: 72,
          padding: const EdgeInsets.symmetric(horizontal: 10),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.85),
            borderRadius: BorderRadius.circular(36),
            border: Border.all(color: Colors.white.withOpacity(0.9), width: 1.5),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 30, offset: const Offset(0, 12))],
          ),
          child: Row(
            children: [
              for (int i = 0; i < tabs.length; i++)
                Expanded(child: _PillTab(tab: tabs[i], selected: i == current, onTap: () => onTap(i), index: i)),
            ],
          ),
        ),
      ),
    ).animate().fadeIn(duration: 500.ms).slideY(begin: 0.5, curve: Curves.easeOutExpo);
  }
}

class _PillTab extends StatelessWidget {
  const _PillTab({required this.tab, required this.selected, required this.onTap, required this.index});
  final _Tab tab;
  final bool selected;
  final VoidCallback onTap;
  final int index;

  @override
  Widget build(BuildContext context) {
    return AnimatedPress(
      onTap: onTap,
      borderRadius: BorderRadius.circular(28),
      child: SizedBox(
        height: 52,
        child: Stack(
          alignment: Alignment.center,
          children: [
            AnimatedAlign(
              duration: const Duration(milliseconds: 350),
              curve: Curves.easeOutBack,
              alignment: Alignment.center,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 350),
                curve: Curves.easeOutBack,
                height: 48,
                width: selected ? 100 : 0,
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(selected ? 0.12 : 0),
                  borderRadius: BorderRadius.circular(28),
                ),
              ),
            ),
            AnimatedPositioned(
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOutCubic,
              top: selected ? 8 : 14,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(selected ? tab.activeIcon : tab.icon, color: selected ? AppColors.primary : AppColors.textMuted, size: 24),
                  AnimatedSize(
                    duration: const Duration(milliseconds: 250),
                    curve: Curves.easeOutCubic,
                    child: SizedBox(
                      height: selected ? 14 : 0,
                      child: Opacity(
                        opacity: selected ? 1 : 0,
                        child: Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Text(tab.label, style: const TextStyle(fontFamily: 'Plus Jakarta Sans', fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.primary)),
                        ),
                      ),
                    ),
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

class _CenterDockedFABLocation extends FloatingActionButtonLocation {
  const _CenterDockedFABLocation({required this.bottomPad, required this.navInset});
  final double bottomPad;
  final double navInset;
  @override
  Offset getOffset(ScaffoldPrelayoutGeometry geometry) {
    final fabW = geometry.floatingActionButtonSize.width;
    final fabH = geometry.floatingActionButtonSize.height;
    const right = 20.0;
    final pillTop = geometry.scaffoldSize.height - (72 + navInset + bottomPad);
    final top = pillTop - fabH * 0.45;
    return Offset(geometry.scaffoldSize.width - fabW - right, top);
  }
}

class _CartFab extends StatelessWidget {
  const _CartFab({required this.count, required this.onTap});
  final int count;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    return AnimatedPress(
      onTap: onTap,
      child: Container(
        width: 64, height: 64,
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [AppColors.primary, Color(0xFF0284C7)], begin: Alignment.topLeft, end: Alignment.bottomRight),
          shape: BoxShape.circle,
          boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.5), blurRadius: 24, offset: const Offset(0, 10))],
          border: Border.all(color: Colors.white.withOpacity(0.4), width: 2),
        ),
        child: Stack(clipBehavior: Clip.none, children: [
          const Center(child: Icon(IconlyBold.buy, color: Colors.white, size: 28)),
          Positioned(
            top: -2, right: -2,
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0.5, end: 1),
              duration: const Duration(milliseconds: 400),
              curve: Curves.easeOutBack,
              builder: (c, v, child) => Transform.scale(
                scale: v,
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: const BoxDecoration(color: AppColors.accent, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 4)]),
                  child: Text(count > 99 ? '99+' : '$count', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                ),
              ),
            ),
          ),
        ]),
      ),
    );
  }
}

class _ActiveOrderBanner extends ConsumerWidget {
  const _ActiveOrderBanner();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final active = ref.watch(activeOrdersProvider);
    final order = active.isEmpty ? null : active.first;
    if (order == null) return const SizedBox.shrink();
    return AnimatedPress(
      onTap: () => context.push('/orders/${order.id}/tracking'),
      borderRadius: BorderRadius.circular(24),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.95),
          borderRadius: BorderRadius.circular(24),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.12), blurRadius: 30, offset: const Offset(0, 10))],
          border: Border.all(color: Colors.white.withOpacity(0.9), width: 1.5),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
            child: Row(children: [
              Container(
                width: 52, height: 52,
                decoration: BoxDecoration(color: order.serviceType.color.withOpacity(0.15), borderRadius: BorderRadius.circular(16)),
                child: Icon(order.serviceType.icon, color: order.serviceType.color, size: 28),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(order.status.customerLabel(vendorName: order.vendorName), style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w800), maxLines: 1, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 3),
                  Text('${order.vendorName} · ${order.eta}', style: AppTypography.caption(AppColors.textSecondary)),
                  const SizedBox(height: 10),
                  LayoutBuilder(builder: (c, cs) {
                    final p = (order.status.timelineStep / 5).clamp(0.0, 1.0);
                    return Stack(children: [
                      Container(height: 5, decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(3))),
                      AnimatedContainer(duration: const Duration(milliseconds: 500), curve: Curves.easeOutExpo, height: 5, width: cs.maxWidth * p, decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(3))),
                    ]);
                  }),
                ]),
              ),
              const SizedBox(width: 12),
              Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: AppColors.background, shape: BoxShape.circle), child: const Icon(IconlyLight.arrowRight2, color: AppColors.textPrimary, size: 20)),
            ]),
          ),
        ),
      ),
    );
  }
}
