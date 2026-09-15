import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/ui/iconly_compat.dart';
import 'package:ore_core/ore_core.dart';
import '../providers/orders_provider.dart';

class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});
  @override ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  @override Widget build(BuildContext context) {
    final orders = ref.watch(ordersProvider);
    
    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          SliverAppBar(
            expandedHeight: 120,
            pinned: true,
            backgroundColor: AppColors.background,
            flexibleSpace: FlexibleSpaceBar(
              titlePadding: const EdgeInsets.only(left: 24, bottom: 16),
              title: Text('My Orders', style: AppTypography.h1()),
            ),
          ),
          
          if (orders.isEmpty)
            SliverFillRemaining(
              child: Center(
                child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(IconlyLight.document, size: 64, color: AppColors.textMuted),
                  const SizedBox(height: 16),
                  Text('No orders yet', style: AppTypography.h3()),
                ]),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.only(left: 24, right: 24, top: 16, bottom: 140),
              sliver: SliverList.separated(
                itemCount: orders.length,
                separatorBuilder: (_, __) => const SizedBox(height: 20),
                itemBuilder: (context, i) {
                  final order = orders[i];
                  return _OrderCard(order: order)
                      .animate().fadeIn(delay: (i * 50).ms).slideY(begin: 0.1, curve: Curves.easeOutExpo);
                },
              ),
            ),
        ],
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order});
  final OreOrder order;

  @override Widget build(BuildContext context) {
    final isActive = order.isActive;
    
    return AnimatedPress(
      onTap: () {
        Haptics.selection();
        context.push(isActive ? '/orders/${order.id}/tracking' : '/orders/${order.id}');
      },
      borderRadius: BorderRadius.circular(24),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: isActive ? AppColors.primary.withOpacity(0.3) : Colors.transparent),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 20, offset: const Offset(0, 8))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 48, height: 48,
                  decoration: BoxDecoration(color: order.serviceType.color.withOpacity(0.12), borderRadius: BorderRadius.circular(16)),
                  child: Icon(order.serviceType.icon, color: order.serviceType.color, size: 24),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(order.vendorName, style: AppTypography.h3().copyWith(fontSize: 18)),
                      const SizedBox(height: 4),
                      Text('Order #${order.id}', style: AppTypography.bodySm(AppColors.textSecondary)),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(color: isActive ? AppColors.primary.withOpacity(0.1) : AppColors.surface, borderRadius: BorderRadius.circular(16)),
                  child: Text(isActive ? 'Active' : order.status.name.toUpperCase(), 
                      style: AppTypography.caption(isActive ? AppColors.primary : AppColors.textSecondary)),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Divider(height: 1),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('${order.items.length} items', style: AppTypography.body(AppColors.textSecondary)),
                Text(Formatters.money(order.total), style: AppTypography.h3(AppColors.primary)),
              ],
            ),
            if (isActive) ...[
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(16)),
                alignment: Alignment.center,
                child: Text('Track Order', style: AppTypography.button(Colors.white)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
