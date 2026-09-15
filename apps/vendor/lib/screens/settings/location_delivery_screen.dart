import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../providers/vendor_data_provider.dart';
import '../../widgets/common/primary_button.dart';

class LocationDeliveryScreen extends ConsumerStatefulWidget {
  const LocationDeliveryScreen({super.key});

  @override
  ConsumerState<LocationDeliveryScreen> createState() => _LocationDeliveryScreenState();
}

class _LocationDeliveryScreenState extends ConsumerState<LocationDeliveryScreen> {
  double? _radius;
  bool? _acceptsCod;
  bool _saving = false;

  Future<void> _save(String vendorId) async {
    setState(() => _saving = true);
    try {
      await ref.read(vendorCatalogRepositoryProvider).updateVendor(vendorId, <String, dynamic>{
        'deliveryRadiusKm': _radius,
        'acceptsCod': _acceptsCod,
      });
      ref.invalidate(vendorSnapshotProvider);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Delivery settings updated')));
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to update delivery settings')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final snapshot = ref.watch(vendorSnapshotProvider);
    return snapshot.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'))),
      error: (_, __) => Scaffold(appBar: AppBar(title: const Text('Delivery settings')), body: Center(child: PrimaryButton(label: 'Retry', onPressed: () => ref.invalidate(vendorSnapshotProvider)))),
      data: (value) {
        final radius = _radius ?? value.vendor.deliveryRadiusKm;
        final acceptsCod = _acceptsCod ?? value.vendor.acceptsCod;
        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(title: Text('Delivery settings', style: AppTextStyles.heading3)),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text('Delivery radius', style: AppTextStyles.heading3),
              const SizedBox(height: 6),
              Text('${radius.toStringAsFixed(1)} km', style: AppTextStyles.heading2.copyWith(color: AppColors.primary)),
              Slider(
                value: radius.clamp(1.0, 25.0).toDouble(),
                min: 1,
                max: 25,
                divisions: 48,
                activeColor: AppColors.primary,
                onChanged: (value) => setState(() => _radius = value),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.border)),
                child: Row(children: [
                  const Icon(LucideIcons.banknote, color: AppColors.primary),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Accept cash on delivery', style: AppTextStyles.subtitleMedium),
                    Text('Use the backend Vendor COD setting', style: AppTextStyles.caption),
                  ])),
                  Switch(value: acceptsCod, onChanged: (value) => setState(() => _acceptsCod = value)),
                ]),
              ),
              const SizedBox(height: 16),
              _readOnly('Workplace latitude', value.vendor.lat.toStringAsFixed(6)),
              _readOnly('Workplace longitude', value.vendor.lng.toStringAsFixed(6)),
              const SizedBox(height: 24),
              PrimaryButton(label: 'Save changes', loading: _saving, onPressed: _saving ? null : () => _save(value.vendor.id), icon: const Icon(LucideIcons.check, color: Colors.white)),
            ],
          ),
        );
      },
    );
  }

  Widget _readOnly(String label, String value) => Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
        child: Row(children: [Expanded(child: Text(label, style: AppTextStyles.bodyMedium)), Text(value, style: AppTextStyles.subtitleMedium)]),
      );
}
