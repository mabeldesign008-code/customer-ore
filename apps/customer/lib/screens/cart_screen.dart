import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/ui/iconly_compat.dart';
import 'package:ore_core/ore_core.dart';
import '../core/ui/customer_image.dart';
import '../providers/cart_provider.dart';

class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});
  @override ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen> {
  @override Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    final total = ref.watch(cartSubtotalProvider);
    
    if (cart.isEmpty) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(leading: IconButton(icon: const Icon(IconlyLight.arrowLeft2), onPressed: () => context.pop())),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(IconlyLight.buy, size: 80, color: AppColors.textMuted),
              const SizedBox(height: 20),
              Text('Your cart is empty', style: AppTypography.h2()),
              const SizedBox(height: 8),
              Text('Looks like you haven\'t added anything yet', style: AppTypography.body(AppColors.textSecondary)),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Cart', style: AppTypography.h2()),
        leading: IconButton(icon: const Icon(IconlyLight.arrowLeft2), onPressed: () => context.pop()),
        actions: [
          TextButton(onPressed: () { Haptics.light(); ref.read(cartProvider.notifier).clear(); }, child: Text('Clear', style: AppTypography.body(AppColors.danger))),
          const SizedBox(width: 8),
        ],
      ),
      body: Stack(
        children: [
          ListView.separated(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.only(left: 24, right: 24, top: 12, bottom: 180),
            itemCount: cart.length,
            separatorBuilder: (_, __) => const SizedBox(height: 16),
            itemBuilder: (context, i) {
              final item = cart[i];
              return _CartTile(item: item)
                  .animate().fadeIn(delay: (i * 50).ms).slideX(begin: 0.1, curve: Curves.easeOutExpo);
            },
          ),
          
          Positioned(
            left: 24, right: 24, bottom: MediaQuery.of(context).padding.bottom + 24,
            child: AnimatedPress(
              onTap: () { Haptics.selection(); context.push('/checkout'); },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [AppColors.primary, Color(0xFF0284C7)]),
                  borderRadius: BorderRadius.circular(34),
                  boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.4), blurRadius: 24, offset: const Offset(0, 10))],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Total', style: AppTypography.bodySm(Colors.white.withOpacity(0.8))),
                        Text(Formatters.money(total), style: AppTypography.h2(Colors.white)),
                      ],
                    ),
                    Row(
                      children: [
                        Text('Checkout', style: AppTypography.button().copyWith(fontSize: 18)),
                        const SizedBox(width: 8),
                        const Icon(IconlyBold.arrowRight2, color: Colors.white),
                      ],
                    ),
                  ],
                ),
              ),
            ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.5, curve: Curves.easeOutBack),
          ),
        ],
      ),
    );
  }
}

class _CartTile extends ConsumerWidget {
  const _CartTile({required this.item});
  final CartItem item;

  @override Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 20, offset: const Offset(0, 6))],
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: CustomerImage(item.imageUrl ?? '', width: 80, height: 80, fit: BoxFit.cover),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.title, style: AppTypography.h3()),
                if (item.selectedAddons.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(item.selectedAddons.map((a) => a.optionName).join(', '), style: AppTypography.bodySm(AppColors.textSecondary), maxLines: 1, overflow: TextOverflow.ellipsis),
                ],
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(Formatters.money(item.unitPrice * item.quantity), style: AppTypography.h3(AppColors.primary)),
                    Container(
                      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(20)),
                      child: Row(
                        children: [
                          _QtyBtn(icon: Icons.remove_rounded, onTap: () { Haptics.light(); ref.read(cartProvider.notifier).decrement(item.customizationKey); }),
                          Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: Text('${item.quantity}', style: AppTypography.h3())),
                          _QtyBtn(icon: Icons.add_rounded, onTap: () { Haptics.light(); ref.read(cartProvider.notifier).increment(item.customizationKey); }),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _QtyBtn extends StatelessWidget {
  const _QtyBtn({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;
  @override Widget build(BuildContext context) {
    return AnimatedPress(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 4)]),
        child: Icon(icon, size: 16, color: AppColors.textPrimary),
      ),
    );
  }
}
