import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:fl_chart/fl_chart.dart';

import '../../core/router/app_router.dart';
import '../../data/catalog/vendor_catalog_repository.dart';
import '../../data/ledger/vendor_ledger_repository.dart';
import '../../data/order/vendor_order_repository.dart';
import '../../data/notifications/vendor_notification_service.dart';
import '../../providers/vendor_data_provider.dart';
import 'vendor_orders_tab.dart';
import '../menu/vendor_menu_tab.dart';
import '../analytics/vendor_analytics_tab.dart';
import '../settings/vendor_settings_tab.dart';

// Orders, menu, and analytics tabs are backend-backed widgets; settings
// remains the existing local navigation shell until each settings contract is wired.

class VendorDashboardScreen extends ConsumerStatefulWidget {
  const VendorDashboardScreen({super.key});
  @override
  ConsumerState<VendorDashboardScreen> createState() => _VendorDashboardScreenState();
}

class _VendorDashboardScreenState extends ConsumerState<VendorDashboardScreen> {
  int _tab = 0;
  bool? _storeOnlineOverride;
  StreamSubscription<VendorNotificationEvent>? _notificationSubscription;
  Timer? _ordersPoll;

  @override
  void initState() {
    super.initState();
    _notificationSubscription = ref.read(vendorNotificationServiceProvider).events.listen((event) {
      _refreshOrders(includeSnapshot: true);
      if (event.orderId != null) {
        ref.invalidate(vendorOrderProvider(event.orderId!));
      }
      if (event.orderId != null && mounted) {
        context.go(VendorRoutes.orders);
      }
      if (event.title != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(event.title!)));
      }
    });
    _ordersPoll = Timer.periodic(const Duration(seconds: 10), (_) => _refreshOrders());
    Future<void>.microtask(() => ref.read(vendorNotificationServiceProvider).initialize());
  }

  void _refreshOrders({bool includeSnapshot = false}) {
    if (includeSnapshot) ref.invalidate(vendorSnapshotProvider);
    final snapshot = ref.read(vendorSnapshotProvider).value;
    if (snapshot != null) ref.invalidate(vendorOrdersProvider(snapshot.vendor.id));
  }

  @override
  void dispose() {
    _ordersPoll?.cancel();
    _notificationSubscription?.cancel();
    super.dispose();
  }

  Future<void> _setStoreOnline(bool value) async {
    final snapshot = ref.read(vendorSnapshotProvider).value;
    if (snapshot == null) return;
    try {
      final updated = await ref.read(vendorCatalogRepositoryProvider).setAccepting(snapshot.vendor.id, value);
      if (!mounted) return;
      setState(() => _storeOnlineOverride = updated.vendor.accepting);
      ref.invalidate(vendorSnapshotProvider);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to update store availability. Please try again.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final snapshotAsync = ref.watch(vendorSnapshotProvider);
    final snapshot = snapshotAsync.value;
    final statement = ref.watch(vendorStatementProvider).value;
    final ordersAsync = snapshot == null ? null : ref.watch(vendorOrdersProvider(snapshot.vendor.id));
    final storeOnline = _storeOnlineOverride ?? snapshot?.vendor.accepting ?? false;
    final pages = [
      _DashboardHome(
        vendor: snapshot?.vendor,
        menuCount: snapshot?.menu.length ?? 0,
        statement: statement,
        orders: ordersAsync?.value ?? const <VendorOrder>[],
        storeOnline: storeOnline,
        profileError: snapshotAsync.hasError,
        onStartOnboarding: () => context.go(VendorRoutes.onboardingType),
        onToggleStore: snapshot == null ? null : _setStoreOnline,
      ),
      const VendorOrdersTab(),
      const VendorMenuTab(),
      const VendorAnalyticsTab(),
      const VendorSettingsTab(),
    ];

    return Scaffold(
      body: pages[_tab],
      bottomNavigationBar: _VendorNav(
        current: _tab,
        onTap: (i) {
          Haptics.light();
          setState(() => _tab = i);
        },
      ),
    );
  }
}

class _DashboardHome extends StatelessWidget {
  const _DashboardHome({
    required this.vendor,
    required this.menuCount,
    required this.statement,
    required this.orders,
    required this.storeOnline,
    required this.profileError,
    required this.onStartOnboarding,
    required this.onToggleStore,
  });

  final VendorProfile? vendor;
  final int menuCount;
  final VendorLedgerStatement? statement;
  final List<VendorOrder> orders;
  final bool storeOnline;
  final bool profileError;
  final VoidCallback onStartOnboarding;
  final ValueChanged<bool>? onToggleStore;

  @override
  Widget build(BuildContext context) {
    final isStoreActivated = vendor?.approved == true && menuCount >= 3;
    final now = DateTime.now();
    final todayEarningsPesewas = statement?.earnings
            .where((earning) => _sameDay(earning.createdAt, now))
            .fold<int>(0, (sum, earning) => sum + earning.amountPesewas) ??
        0;
    final ordersToday = orders.where((order) => _sameDay(order.createdAt, now)).length;
    final averagePrepMinutes = orders.isEmpty
        ? null
        : (orders.map((order) => order.prepTimeMin).reduce((a, b) => a + b) / orders.length).round();
    final revenueSpots = _revenueSpots(statement);

    return CustomScrollView(
      slivers: [
        SliverAppBar(
          pinned: true,
          expandedHeight: 180,
          backgroundColor: AppColors.primary,
          flexibleSpace: FlexibleSpaceBar(
            background: Container(
              decoration: const BoxDecoration(gradient: LinearGradient(colors: [AppColors.primary, AppColors.primaryDark])),
              padding: const EdgeInsets.fromLTRB(20, 60, 20, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Row(children: [
                    const CircleAvatar(radius: 22, backgroundColor: Colors.white24, child: Icon(LucideIcons.store, color: Colors.white)),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(vendor?.name ?? 'Vendor store', style: AppTypography.h3(Colors.white)),
                      Text(vendor == null
                          ? 'Loading store profile…'
                          : 'Cape Coast · ${storeOnline ? "Open for orders" : "Closed / Setup mode"}',
                          style: AppTypography.bodySm(Colors.white70)),
                    ])),
                    Switch(
                      value: storeOnline,
                      onChanged: onToggleStore == null
                          ? null
                          : (val) {
                        if (val && !isStoreActivated) {
                          OreToast.show(
                            context,
                            message: 'Complete the Store Activation Checklist (Hours + Menu) before going online',
                            type: ToastType.error,
                          );
                          return;
                        }
                        onToggleStore?.call(val);
                      },
                      activeColor: AppColors.primaryLight,
                    ),
                  ]),
                ],
              ),
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (profileError)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.warning.withOpacity(0.4)),
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Vendor profile not found', style: AppTypography.h3()),
                    const SizedBox(height: 6),
                    Text('Complete Vendor onboarding before managing orders or your catalogue.', style: AppTypography.bodySm()),
                    const SizedBox(height: 12),
                    ElevatedButton(onPressed: onStartOnboarding, child: const Text('Start onboarding')),
                  ]),
                ),
              // Store Activation Checklist Banner (Section 4 Spec)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(LucideIcons.sparkles, color: AppColors.primary, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Store Activation Checklist', style: AppTypography.h3()),
                              Text('Complete these 4 steps to open your store',
                                  style: AppTypography.caption(AppColors.textSecondary)),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.success.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            isStoreActivated ? 'Ready' : '$menuCount items',
                            style: AppTypography.caption(AppColors.success).copyWith(fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _activationItem(
                      title: '1. Vendor profile approved',
                      subtitle: vendor?.approved == true ? 'Approved by Ore' : 'Awaiting backend approval',
                      completed: vendor?.approved == true,
                    ),
                    _activationItem(
                      title: '2. Initial catalogue (minimum 3 items)',
                      subtitle: '$menuCount menu item${menuCount == 1 ? '' : 's'} loaded from Catalog',
                      completed: menuCount >= 3,
                    ),
                    _activationItem(
                      title: '3. Store availability',
                      subtitle: vendor == null ? 'Loading Catalog profile' : (storeOnline ? 'Accepting orders' : 'Currently closed'),
                      completed: vendor != null,
                    ),
                    _activationItem(
                      title: '4. Backend store profile',
                      subtitle: vendor == null ? 'Not available' : 'Catalog profile synchronized',
                      completed: vendor != null,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Stats
              Row(children: [
                _statCard('Today\'s earnings', Formatters.money(todayEarningsPesewas / 100), 'Ledger', AppColors.success, LucideIcons.wallet),
                const SizedBox(width: 12),
                _statCard('Orders today', '$ordersToday', 'Order service', AppColors.info, LucideIcons.receiptText),
              ]),
              const SizedBox(height: 12),
              Row(children: [
                _statCard('Avg prep time', averagePrepMinutes == null ? '—' : '${averagePrepMinutes}m', 'Order data', AppColors.success, LucideIcons.clock3),
                const SizedBox(width: 12),
                _statCard('Rating', '—', 'Not in current DTO', AppColors.warning, LucideIcons.star),
              ]),
              const SizedBox(height: 24),
              Text('Today', style: AppTypography.h2()),
              const SizedBox(height: 8),
              Text('Revenue', style: AppTypography.bodySm()),
              const SizedBox(height: 12),
              SizedBox(
                height: 180,
                child: LineChart(LineChartData(
                  gridData: const FlGridData(show: false),
                  titlesData: const FlTitlesData(show: false),
                  borderData: FlBorderData(show: false),
                  lineBarsData: [
                    LineChartBarData(
                      spots: revenueSpots,
                      isCurved: true,
                      color: AppColors.primary,
                      barWidth: 3,
                      dotData: const FlDotData(show: false),
                      belowBarData: BarAreaData(show: true, color: AppColors.primary.withOpacity(0.1)),
                    ),
                  ],
                )),
              ).animate().fadeIn(duration: Motion.medium),
              const SizedBox(height: 24),
              Text('Quick actions', style: AppTypography.h3()),
              const SizedBox(height: 12),
              GridView.count(
                crossAxisCount: 4,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  _quickAction(LucideIcons.utensils, 'Menu', () => context.push(VendorRoutes.menu)),
                  _quickAction(LucideIcons.tag, 'Promotions', () => context.push(VendorRoutes.analyticsPromotion)),
                  _quickAction(LucideIcons.clock, 'Hours', () => context.push(VendorRoutes.settingsHours)),
                  _quickAction(LucideIcons.chartBar, 'Analytics', () => context.push(VendorRoutes.analytics)),
                ],
              ),
              const SizedBox(height: 120),
            ]),
          ),
        ),
      ],
    );
  }

  bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  List<FlSpot> _revenueSpots(VendorLedgerStatement? statement) {
    final now = DateTime.now();
    return List<FlSpot>.generate(7, (index) {
      final day = DateTime(now.year, now.month, now.day - (6 - index));
      final total = statement?.earnings
              .where((earning) => _sameDay(earning.createdAt, day))
              .fold<int>(0, (sum, earning) => sum + earning.amountPesewas) ??
          0;
      return FlSpot(index.toDouble(), total / 100);
    });
  }

  Widget _activationItem({required String title, required String subtitle, required bool completed}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(
            completed ? LucideIcons.checkCircle2 : LucideIcons.circle,
            color: completed ? AppColors.success : AppColors.textMuted,
            size: 18,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTypography.button(completed ? AppColors.textPrimary : AppColors.textSecondary),
                ),
                Text(subtitle, style: AppTypography.caption(AppColors.textMuted)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _statCard(String label, String value, String delta, Color color, IconData icon) => Expanded(
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10)]),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [Icon(icon, size: 18, color: color), const Spacer(), Text(delta, style: AppTypography.caption(color).copyWith(fontWeight: FontWeight.w800))]),
            const SizedBox(height: 8),
            Text(value, style: AppTypography.h2().copyWith(fontSize: 22)),
            Text(label, style: AppTypography.bodySm()),
          ]),
        ),
      );

  Widget _quickAction(IconData i, String l, VoidCallback onTap) => AnimatedPress(
        onTap: onTap,
        child: Column(children: [
          Container(width: 50, height: 50, decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(14)), child: Icon(i, color: AppColors.primary)),
          const SizedBox(height: 6),
          Text(l, style: AppTypography.caption(), textAlign: TextAlign.center),
        ]),
      );
}

class _VendorNav extends StatelessWidget {
  const _VendorNav({required this.current, required this.onTap});
  final int current;
  final ValueChanged<int> onTap;
  @override
  Widget build(BuildContext context) {
    final items = [
      (LucideIcons.layoutDashboard, 'Home'),
      (LucideIcons.clipboardList, 'Orders'),
      (LucideIcons.utensils, 'Menu'),
      (LucideIcons.chartBar, 'Analytics'),
      (LucideIcons.settings, 'Settings'),
    ];
    return Container(
      padding: EdgeInsets.only(left: 12, right: 12, top: 8, bottom: MediaQuery.of(context).padding.bottom + 8),
      decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 12, offset: const Offset(0, -4))]),
      child: Row(children: [
        for (int i = 0; i < items.length; i++)
          Expanded(
            child: AnimatedPress(
              onTap: () => onTap(i),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                AnimatedContainer(duration: Motion.fast, curve: Motion.spring, padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6), decoration: BoxDecoration(color: current == i ? AppColors.primary.withOpacity(0.12) : Colors.transparent, borderRadius: BorderRadius.circular(16)), child: Icon(items[i].$1, color: current == i ? AppColors.primary : AppColors.textMuted, size: 22)),
                const SizedBox(height: 4),
                Text(items[i].$2, style: AppTypography.caption(current == i ? AppColors.primary : AppColors.textMuted).copyWith(fontWeight: FontWeight.w700, fontSize: 10)),
              ]),
            ),
          ),
      ]),
    );
  }
}
