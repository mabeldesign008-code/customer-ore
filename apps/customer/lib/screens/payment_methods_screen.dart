import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ore_core/ore_core.dart';

class PaymentMethodsScreen extends StatelessWidget {
  const PaymentMethodsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          children: [
            Row(
              children: [
                IconButton(tooltip: 'Action', onPressed: () => context.pop(), icon: const Icon(Icons.arrow_back_ios_new_rounded)),
                Expanded(child: Text('Payment Methods', style: AppTypography.h3())),
              ],
            ),
            const SizedBox(height: 12),
            OreCard(
              color: AppColors.primary.withOpacity(0.08),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.credit_card_rounded, color: AppColors.primary, size: 30),
                  const SizedBox(height: 12),
                  Text('Choose payment at checkout', style: AppTypography.h2()),
                  const SizedBox(height: 8),
                  Text(
                    'Ore currently starts prepaid catalogue payments through Paystack. Mobile Money and Card are selected for each order, and Cash on Delivery is shown only when the checkout service permits it.',
                    style: AppTypography.bodySm(),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _method(Icons.smartphone_rounded, 'Mobile Money', 'Prepaid through Paystack'),
            _method(Icons.credit_card_rounded, 'Card', 'Prepaid through Paystack'),
            _method(Icons.payments_outlined, 'Cash on Delivery', 'Available only for eligible Vendor orders'),
            const SizedBox(height: 16),
            Text(
              'Saved cards and saved mobile-money instruments are not stored by the Customer app. Paystack owns the secure payment entry screen.',
              style: AppTypography.caption(AppColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }

  Widget _method(IconData icon, String title, String subtitle) => OreCard(
        margin: const EdgeInsets.only(bottom: 10),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(14)),
              child: Icon(icon, color: AppColors.primary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w700)),
                  Text(subtitle, style: AppTypography.bodySm()),
                ],
              ),
            ),
          ],
        ),
      );
}
