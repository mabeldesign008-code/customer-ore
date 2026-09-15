import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../providers/vendor_data_provider.dart';

/// Vendor-level preparation and order-capacity settings backed by Catalog.
class PreparationTimeSettingsScreen extends ConsumerStatefulWidget {
  const PreparationTimeSettingsScreen({super.key});

  @override
  ConsumerState<PreparationTimeSettingsScreen> createState() => _PreparationTimeSettingsScreenState();
}

class _PreparationTimeSettingsScreenState extends ConsumerState<PreparationTimeSettingsScreen> {
  int _selectedTime = 10;
  int _maxConcurrentOrders = 5;
  bool _loaded = false;
  bool _saving = false;

  @override
  Widget build(BuildContext context) {
    final snapshot = ref.watch(vendorSnapshotProvider);
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 1,
        shadowColor: AppColors.border,
        leading: IconButton(tooltip: 'Action', icon: const Icon(LucideIcons.arrowLeft, size: 20), onPressed: () => Navigator.of(context).pop()),
        title: Text('Preparation Settings', style: AppTextStyles.heading2.copyWith(fontSize: 18)),
        centerTitle: true,
        actions: [
          TextButton(onPressed: _saving ? null : _save, child: Text('SAVE', style: AppTextStyles.subtitleMedium.copyWith(color: AppColors.primary))),
          const SizedBox(width: 8),
        ],
      ),
      body: snapshot.when(
        loading: () => const Center(child: CircularProgressIndicator(semanticsLabel: 'Loading')),
        error: (_, __) => Center(child: ElevatedButton(onPressed: () => ref.invalidate(vendorSnapshotProvider), child: const Text('Retry'))),
        data: (value) {
          if (!_loaded) {
            _loaded = true;
            _selectedTime = value.vendor.defaultPrepTimeMin;
            _maxConcurrentOrders = value.vendor.maxConcurrentOrders < 1 ? 1 : value.vendor.maxConcurrentOrders;
          }
          return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(children: [
              const Icon(LucideIcons.clock, size: 20, color: AppColors.primary),
              const SizedBox(width: 8),
              Text('Default Preparation Time', style: AppTextStyles.heading2.copyWith(fontSize: 16)),
            ]),
            const SizedBox(height: 8),
            Text('Used when a new catalogue item does not provide its own preparation time.', style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [0, 5, 10, 15, 20, 30, 45, 60].map((time) {
                final selected = _selectedTime == time;
                return ChoiceChip(label: Text(time == 0 ? 'No prep' : '$time min'), selected: selected, onSelected: (_) => setState(() => _selectedTime = time), selectedColor: AppColors.primaryTransparent20);
              }).toList(),
            ),
            const SizedBox(height: 28),
            const Divider(color: AppColors.border),
            const SizedBox(height: 24),
            Row(children: [
              const Icon(LucideIcons.layers, size: 20, color: AppColors.primary),
              const SizedBox(width: 8),
              Text('Order capacity', style: AppTextStyles.heading2.copyWith(fontSize: 16)),
            ]),
            const SizedBox(height: 8),
            Text('The backend stops new orders when active work reaches this limit.', style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.border)),
              child: Row(children: [
                Expanded(child: Text('Maximum concurrent orders', style: AppTextStyles.subtitleMedium)),
                IconButton(tooltip: 'Action', onPressed: _maxConcurrentOrders > 1 ? () => setState(() => _maxConcurrentOrders--) : null, icon: const Icon(LucideIcons.minusCircle)),
                Text('$_maxConcurrentOrders', style: AppTextStyles.heading2.copyWith(fontSize: 18)),
                IconButton(tooltip: 'Action', onPressed: () => setState(() => _maxConcurrentOrders++), icon: const Icon(LucideIcons.plusCircle, color: AppColors.primary)),
              ]),
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.05), borderRadius: BorderRadius.circular(16)),
              child: Row(children: [
                const Icon(LucideIcons.info, color: AppColors.primary),
                const SizedBox(width: 12),
                Expanded(child: Text('These settings are saved to your Vendor profile and apply to new orders and new catalogue items.', style: AppTextStyles.bodyTextSmall)),
              ]),
            ),
          ],
          );
        },
      ),
    );
  }

  Future<void> _save() async {
    final snapshot = ref.read(vendorSnapshotProvider).value;
    if (snapshot == null) return;
    setState(() => _saving = true);
    try {
      await ref.read(vendorCatalogRepositoryProvider).updateVendor(snapshot.vendor.id, <String, dynamic>{
        'defaultPrepTimeMin': _selectedTime,
        'maxConcurrentOrders': _maxConcurrentOrders,
      });
      ref.invalidate(vendorSnapshotProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Preparation settings saved')));
      Navigator.of(context).pop();
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to save preparation settings')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}
