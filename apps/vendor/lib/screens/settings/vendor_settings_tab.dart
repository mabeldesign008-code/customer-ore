import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart' hide AppColors;

import '../../core/router/app_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../providers/vendor_data_provider.dart';
import '../../providers/auth/vendor_auth_provider.dart';

class VendorSettingsTab extends ConsumerWidget {
  const VendorSettingsTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snapshot = ref.watch(vendorSnapshotProvider);
    return snapshot.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'))),
      error: (_, __) => Scaffold(appBar: AppBar(title: Text('Settings', style: AppTypography.h2())), body: Center(child: OreButton(label: 'Retry', onPressed: () => ref.invalidate(vendorSnapshotProvider)))),
      data: (value) => Scaffold(
        appBar: AppBar(title: Text('Settings', style: AppTypography.h2())),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.border)),
              child: Row(children: [
                const Icon(LucideIcons.store, color: AppColors.primary),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(value.vendor.name, style: AppTextStyles.subtitle),
                  Text(value.vendor.accepting ? 'Accepting orders' : 'Not accepting orders', style: AppTextStyles.caption),
                ])),
                Switch(value: value.vendor.accepting, onChanged: (open) async {
                  try {
                    await ref.read(vendorCatalogRepositoryProvider).setAccepting(value.vendor.id, open);
                    ref.invalidate(vendorSnapshotProvider);
                  } catch (_) {
                    if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to update availability')));
                  }
                }),
              ]),
            ),
            const SizedBox(height: 12),
            _tile(context, LucideIcons.store, 'Store profile', VendorRoutes.settingsProfile),
            _tile(context, LucideIcons.wallet, 'Settlements', VendorRoutes.wallet),
            _tile(context, LucideIcons.fileCheck, 'Compliance documents', VendorRoutes.settingsDocuments),
            _tile(context, LucideIcons.mapPin, 'Locations & staff', VendorRoutes.settingsLocations),
            _tile(context, LucideIcons.plug, 'POS integration', VendorRoutes.settingsPos),
            _tile(context, LucideIcons.star, 'Ratings & reviews', VendorRoutes.ratings),
            _tile(context, LucideIcons.bell, 'Notifications', VendorRoutes.notifications),
            _tile(context, LucideIcons.headset, 'Support', VendorRoutes.support),
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: TextButton.icon(
                onPressed: () async {
                  await ref.read(vendorAuthProvider).logout();
                  if (context.mounted) context.go(VendorRoutes.login);
                },
                icon: const Icon(LucideIcons.logOut, color: AppColors.error),
                label: const Text('Log out', style: TextStyle(color: AppColors.error)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _tile(BuildContext context, IconData icon, String label, String route) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: AnimatedPress(
        onTap: () => context.push(route),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
          child: Row(children: [
            Icon(icon, color: AppColors.textSecondary),
            const SizedBox(width: 12),
            Expanded(child: Text(label, style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600))),
            const Icon(LucideIcons.chevronRight, color: AppColors.textTertiary, size: 18),
          ]),
        ),
      ),
    );
  }
}
