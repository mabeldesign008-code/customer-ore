import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ore_core/ore_core.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../providers/customer_address_provider.dart';
import '../providers/customer_catalog_provider.dart';
import '../widgets/customer_address_picker.dart';

/// Onboarding screen asking for location access — shown after auth, before home.
class LocationPermissionScreen extends ConsumerWidget {
  const LocationPermissionScreen({super.key, this.isGuest = false});
  final bool isGuest;

  Future<void> _openManualPicker(BuildContext context, WidgetRef ref) async {
    final result = await showModalBottomSheet<OreAddress>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const CustomerAddressPicker(
        title: 'Enter your location',
      ),
    );

    if (result != null && context.mounted) {
      await ref.read(customerAddressBookProvider).add(result);
      if (context.mounted) {
        OreToast.show(context, message: 'Location saved: ${result.label}', type: ToastType.success);
        context.go('/');
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(children: [
            const Spacer(),
            // Map illustration
            Container(
              width: 240, height: 240,
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.08),
                shape: BoxShape.circle,
              ),
              child: Stack(alignment: Alignment.center, children: [
                // Pulse rings
                for (int i = 0; i < 3; i++)
                  Container(
                    width: 180 + i * 40.0,
                    height: 180 + i * 40.0,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.primary.withOpacity(0.15 - i * 0.04)),
                    ),
                  ).animate(onPlay: (c) => c.repeat())
                   .scale(begin: const Offset(0.6, 0.6), end: const Offset(1.1, 1.1), duration: 2.seconds)
                   .fadeOut(duration: 2.seconds),
                Container(
                  width: 80, height: 80,
                  decoration: const BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                    boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 20, offset: Offset(0, 8))],
                  ),
                  child: const Icon(Icons.my_location_rounded, color: Colors.white, size: 36),
                ).animate().scale(duration: Motion.medium, curve: Motion.spring, begin: const Offset(0.3, 0.3)),
              ]),
            ),
            const SizedBox(height: 40),
            Text('Enable location', style: AppTypography.h1().copyWith(fontSize: 28))
                .animate().fadeIn(delay: 200.ms).slideY(begin: 0.2, curve: Motion.spring),
            const SizedBox(height: 12),
            Text(
              'We need your location to find nearby vendors, give accurate delivery times, and show your rider where to go.',
              textAlign: TextAlign.center,
              style: AppTypography.body(AppColors.textSecondary).copyWith(fontSize: 16, height: 1.5),
            ).animate().fadeIn(delay: 300.ms),
            const SizedBox(height: 28),
            _benefit(Icons.pedal_bike_rounded, 'Faster delivery', 'We match you with the closest riders'),
            _benefit(Icons.location_on_rounded, 'Accurate addresses', 'Delivery goes to the right doorstep'),
            _benefit(Icons.schedule_rounded, 'Real-time ETAs', 'See exactly when your order arrives'),
            const Spacer(),
            OreButton(
              label: 'Allow location access',
              icon: Icons.my_location_rounded,
              onPressed: () {
                Haptics.success();
                context.go('/');
              },
            ).animate().fadeIn(delay: 500.ms).slideY(begin: 0.15),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => _openManualPicker(context, ref),
              child: Text('Enter location manually', style: AppTypography.body(AppColors.textSecondary).copyWith(fontWeight: FontWeight.w600)),
            ).animate().fadeIn(delay: 600.ms),
            const SizedBox(height: 12),
          ]),
        ),
      ),
    );
  }

  Widget _benefit(IconData i, String title, String sub) => Padding(
    padding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
    child: Row(children: [
      Container(
        width: 44, height: 44,
        decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.08), borderRadius: BorderRadius.circular(14)),
        child: Icon(i, color: AppColors.primary, size: 20),
      ),
      const SizedBox(width: 14),
      Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 2),
          Text(sub, style: AppTypography.bodySm()),
        ]),
      ),
    ]),
  ).animate().fadeIn(delay: 400.ms).slideX(begin: 0.1);
}
