import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../providers/vendor_data_provider.dart';

class PromotionInsightsScreen extends ConsumerWidget {
  const PromotionInsightsScreen({super.key, required this.promotionId});

  final String promotionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snapshot = ref.watch(vendorSnapshotProvider);
    return snapshot.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'))),
      error: (_, __) => Scaffold(appBar: AppBar(title: const Text('Promotion insights')), body: const Center(child: Text('Vendor profile is unavailable'))),
      data: (value) => FutureBuilder<Map<String, dynamic>>(
        future: ref.read(vendorCatalogRepositoryProvider).promotionAnalytics(value.vendor.id, promotionId),
        builder: (context, analytics) {
          return Scaffold(
            appBar: AppBar(title: const Text('Promotion insights')),
            body: _body(analytics),
          );
        },
      ),
    );
  }

  Widget _body(AsyncSnapshot<Map<String, dynamic>> analytics) {
    if (analytics.connectionState != ConnectionState.done) {
      return const Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'));
    }
    if (analytics.hasError || analytics.data == null) {
      return const Center(child: Padding(
        padding: EdgeInsets.all(24),
        child: Text('Promotion analytics could not load. The campaign may have been removed.'),
      ));
    }
    final data = analytics.data!;
    final redemptions = data['redemptions'] is num ? (data['redemptions'] as num).toInt() : 0;
    final discountPesewas = data['discountPesewas'] is num ? (data['discountPesewas'] as num).toInt() : 0;
    final uniqueCustomers = data['uniqueCustomers'] is num ? (data['uniqueCustomers'] as num).toInt() : 0;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _stat(LucideIcons.ticket, 'Redemptions', '$redemptions'),
        const SizedBox(height: 10),
        _stat(LucideIcons.banknote, 'Discount given', 'GHS ${(discountPesewas / 100).toStringAsFixed(2)}'),
        const SizedBox(height: 10),
        _stat(LucideIcons.users, 'Unique customers', '$uniqueCustomers'),
        const SizedBox(height: 16),
        Text(
          'Figures come from Catalog promotionAnalytics for redeemed checkouts only. Empty means no customer has used this campaign yet.',
          style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
        ),
      ],
    );
  }

  Widget _stat(IconData icon, String label, String value) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(children: [
        Icon(icon, color: AppColors.primary),
        const SizedBox(width: 12),
        Expanded(child: Text(label, style: AppTextStyles.bodyMedium)),
        Text(value, style: AppTextStyles.subtitleMedium),
      ]),
    );
  }
}
