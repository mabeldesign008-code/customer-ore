import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/router/app_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../data/catalog/vendor_catalog_repository.dart';
import '../../providers/vendor_data_provider.dart';

/// Campaign management is connected to Catalog. Customers pick an active
/// campaign at checkout; redeem updates spent / redemption counts here.
class CreatePromotionScreen extends ConsumerStatefulWidget {
  const CreatePromotionScreen({super.key});

  @override
  ConsumerState<CreatePromotionScreen> createState() => _CreatePromotionScreenState();
}

class _CreatePromotionScreenState extends ConsumerState<CreatePromotionScreen> {
  Future<List<VendorPromotionRecord>>? _future;

  @override
  Widget build(BuildContext context) {
    final snapshot = ref.watch(vendorSnapshotProvider);
    return snapshot.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'))),
      error: (_, __) => Scaffold(appBar: AppBar(title: const Text('Promotions')), body: const Center(child: Text('Vendor profile is unavailable'))),
      data: (value) {
        _future ??= ref.read(vendorCatalogRepositoryProvider).getPromotions(value.vendor.id);
        return Scaffold(
          appBar: AppBar(title: const Text('Promotions'), actions: [IconButton(tooltip: 'Refresh', onPressed: () => setState(() => _future = ref.read(vendorCatalogRepositoryProvider).getPromotions(value.vendor.id)), icon: const Icon(LucideIcons.refreshCw))]),
          floatingActionButton: FloatingActionButton.extended(onPressed: () => _create(value.vendor.id), icon: const Icon(LucideIcons.plus), label: const Text('New campaign')),
          body: FutureBuilder<List<VendorPromotionRecord>>(
            future: _future,
            builder: (context, promotionSnapshot) {
              if (promotionSnapshot.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'));
              if (promotionSnapshot.hasError) return const Center(child: Text('Unable to load promotions'));
              final promotions = promotionSnapshot.data ?? const <VendorPromotionRecord>[];
              if (promotions.isEmpty) return const Center(child: Text('No campaigns yet.'));
              return ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                itemCount: promotions.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (_, index) {
                  final promotion = promotions[index];
                  final discount = promotion.discountType == 'PERCENT' ? '${promotion.discountValue}%' : 'GHS ${(promotion.discountValue / 100).toStringAsFixed(2)}';
                  final budget = promotion.budgetPesewas == null ? 'No budget cap' : 'Spent GHS ${(promotion.spentPesewas / 100).toStringAsFixed(2)} / ${(promotion.budgetPesewas! / 100).toStringAsFixed(2)}';
                  final limits = promotion.redemptionLimit == null ? 'Unlimited redemptions' : '${promotion.redemptionsUsed}/${promotion.redemptionLimit} redemptions';
                  final codeLabel = promotion.code == null ? '' : ' · code ${promotion.code}';
                  return SwitchListTile(
                    secondary: IconButton(
                      tooltip: 'Insights',
                      icon: const Icon(LucideIcons.barChart2, color: AppColors.primary),
                      onPressed: () => context.push(VendorRoutes.analyticsPromotionInsights.replaceFirst(':id', promotion.id)),
                    ),
                    value: promotion.active,
                    onChanged: (active) async {
                      try {
                        await ref.read(vendorCatalogRepositoryProvider).setPromotionActive(value.vendor.id, promotion.id, active);
                        if (mounted) setState(() => _future = ref.read(vendorCatalogRepositoryProvider).getPromotions(value.vendor.id));
                      } catch (_) {
                        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to update campaign')));
                      }
                    },
                    tileColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: const BorderSide(color: AppColors.border)),
                    title: Text(promotion.title, style: AppTextStyles.subtitleMedium),
                    subtitle: Text('$discount · $budget · $limits$codeLabel\n${promotion.startsAt.toLocal().toIso8601String().split('T').first} to ${promotion.endsAt.toLocal().toIso8601String().split('T').first}', style: AppTextStyles.caption),
                  );
                },
              );
            },
          ),
        );
      },
    );
  }

  Future<void> _create(String vendorId) async {
    final title = TextEditingController();
    final discount = TextEditingController();
    final minimum = TextEditingController();
    final budget = TextEditingController();
    final redemptionLimit = TextEditingController();
    final code = TextEditingController();
    var type = 'PERCENT';
    var startsAt = DateTime.now();
    var endsAt = DateTime.now().add(const Duration(days: 7));
    final submit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setDialogState) => AlertDialog(
          title: const Text('New campaign'),
          content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: title, maxLength: 120, decoration: const InputDecoration(labelText: 'Campaign title')),
            DropdownButtonFormField<String>(value: type, items: const [DropdownMenuItem(value: 'PERCENT', child: Text('Percentage discount')), DropdownMenuItem(value: 'FIXED', child: Text('Fixed GHS discount'))], onChanged: (value) => setDialogState(() => type = value ?? 'PERCENT')),
            TextField(controller: discount, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: InputDecoration(labelText: type == 'PERCENT' ? 'Discount percent' : 'Discount amount (GHS)')),
            TextField(controller: minimum, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Minimum subtotal (GHS, optional)')),
            TextField(controller: budget, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Campaign budget (GHS, optional)')),
            TextField(controller: redemptionLimit, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Redemption limit (optional)')),
            TextField(controller: code, textCapitalization: TextCapitalization.characters, decoration: const InputDecoration(labelText: 'Customer voucher code (optional)', hintText: 'JOLLOF10')),
            const SizedBox(height: 10),
            Row(children: [Expanded(child: Text('Starts ${startsAt.toLocal().toIso8601String().split('T').first}')), TextButton(onPressed: () async { final date = await showDatePicker(context: dialogContext, firstDate: DateTime.now(), lastDate: DateTime.now().add(const Duration(days: 365)), initialDate: startsAt); if (date != null) setDialogState(() => startsAt = DateTime(date.year, date.month, date.day)); }, child: const Text('Change'))]),
            Row(children: [Expanded(child: Text('Ends ${endsAt.toLocal().toIso8601String().split('T').first}')), TextButton(onPressed: () async { final date = await showDatePicker(context: dialogContext, firstDate: DateTime.now(), lastDate: DateTime.now().add(const Duration(days: 365)), initialDate: endsAt); if (date != null) setDialogState(() => endsAt = DateTime(date.year, date.month, date.day, 23, 59, 59)); }, child: const Text('Change'))]),
          ])),
          actions: [TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancel')), ElevatedButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Create'))],
        ),
      ),
    );
    if (submit == true) {
      final parsedDiscount = double.tryParse(discount.text.trim());
      final parsedMinimum = double.tryParse(minimum.text.trim()) ?? 0;
      final parsedBudget = double.tryParse(budget.text.trim());
      final parsedLimit = int.tryParse(redemptionLimit.text.trim());
      if (parsedDiscount == null || parsedDiscount <= 0 || parsedMinimum < 0 || (parsedBudget != null && parsedBudget <= 0) || (parsedLimit != null && parsedLimit <= 0) || !endsAt.isAfter(startsAt)) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter valid campaign values and dates')));
      } else {
        try {
          await ref.read(vendorCatalogRepositoryProvider).createPromotion(vendorId: vendorId, title: title.text, discountType: type, discountValue: type == 'PERCENT' ? parsedDiscount.round() : (parsedDiscount * 100).round(), minimumSubtotalPesewas: (parsedMinimum * 100).round(), budgetPesewas: parsedBudget == null ? null : (parsedBudget * 100).round(), redemptionLimit: parsedLimit, startsAt: startsAt, endsAt: endsAt, code: code.text.trim().isEmpty ? null : code.text.trim());
          if (mounted) setState(() => _future = ref.read(vendorCatalogRepositoryProvider).getPromotions(vendorId));
        } catch (_) {
          if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to create campaign. Check the values and dates.')));
        }
      }
    }
    title.dispose();
    discount.dispose();
    minimum.dispose();
    budget.dispose();
    redemptionLimit.dispose();
  }
}
