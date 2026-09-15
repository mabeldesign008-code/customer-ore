import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../models/business/business_type.dart';
import '../../providers/auth/registration_provider.dart';
import '../../providers/vendor_data_provider.dart';
import '../../widgets/common/top_bar.dart';
import '../../widgets/common/primary_button.dart';
import 'business_information_screen.dart';

/// Business Type Selection Screen
/// Pixel-perfect match to BusinessTypeScreen from React app
/// Step 1 of 5 in the registration flow
class BusinessTypeScreen extends ConsumerWidget {
  const BusinessTypeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final form = ref.watch(registrationProvider);
    final selectedType = form.businessType;

    return Scaffold(
      backgroundColor: AppColors.background, // #f5f7f8
      body: Column(
        children: [
          // Top bar with progress
          const TopBar(
            title: 'Vendor Setup',
            step: 1,
            total: 5,
          ),

          // Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 8),
                  // Heading - matching React: text-2xl font-bold leading-tight
                  Text(
                    'What type of business do you have?',
                    style: AppTextStyles.heading2.copyWith(
                      fontSize: 24,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Business type options
                  ...BusinessType.all.map((businessType) {
                    final isSelected = selectedType == businessType.id;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _BusinessTypeCard(
                        businessType: businessType,
                        isSelected: isSelected,
                        onTap: () {
                          ref
                              .read(registrationProvider.notifier)
                              .updateField('businessType', businessType.id);
                        },
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),

          // Bottom button - matching React: sticky bottom-0 with border
          Container(
            decoration: const BoxDecoration(
              color: AppColors.background,
              border: Border(
                top: BorderSide(color: AppColors.border, width: 1),
              ),
            ),
            padding: const EdgeInsets.all(16),
            child: SafeArea(
              top: false,
              child: PrimaryButton(
                label: 'Continue',
                disabled: selectedType.isEmpty,
                onPressed: selectedType.isNotEmpty
                    ? () async {
                        try {
                          await ref.read(vendorOnboardingRepositoryProvider).saveStage(
                            1,
                            <String, dynamic>{
                              'vendorType': _vendorTypeForApi(selectedType),
                              'vendorClass': 'BUSINESS',
                            },
                          );
                          if (!context.mounted) return;
                          ref.read(registrationStepProvider.notifier).setStep(2);
                          Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => const BusinessInformationScreen()),
                          );
                        } catch (_) {
                          if (!context.mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Unable to save business type. Please try again.')),
                          );
                        }
                      }
                    : null,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

String _vendorTypeForApi(String type) {
  switch (type.toLowerCase()) {
    case 'food':
      return 'FOOD';
    case 'groceries':
      return 'GROCERY';
    case 'market':
      return 'MARKET';
    case 'pharmacy':
      return 'PHARMACY';
    case 'shop':
      return 'SHOP';
    case 'laundry':
      return 'LAUNDRY';
    default:
      return type.toUpperCase();
  }
}

/// Business type selection card
/// Matching the button design from React app
class _BusinessTypeCard extends StatelessWidget {
  final BusinessType businessType;
  final bool isSelected;
  final VoidCallback onTap;

  const _BusinessTypeCard({
    required this.businessType,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(18), // p-[18px]
          decoration: BoxDecoration(
            color: isSelected
                ? AppColors.primaryTransparent5 // rgba(0,82,204,0.05)
                : Colors.white,
            border: Border.all(
              color: isSelected ? AppColors.primary : AppColors.border,
              width: 2,
            ),
            borderRadius: BorderRadius.circular(24),
          ),
          child: Row(
            children: [
              // Icon container - matching React: w-12 h-12 rounded-2xl
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.primaryTransparent, // rgba(0,82,204,0.1)
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(
                  LucideIcons.building2,
                  size: 20,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 16),

              // Text content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      businessType.label,
                      style: AppTextStyles.subtitle.copyWith(
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      businessType.sub,
                      style: AppTextStyles.bodySmall.copyWith(
                        fontSize: 14,
                        color: AppColors.textSecondary,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),

              // Selection indicator - matching React: w-5 h-5 rounded-full
              Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.primary : Colors.transparent,
                  border: Border.all(
                    color: isSelected ? AppColors.primary : AppColors.inputBorder,
                    width: 2,
                  ),
                  shape: BoxShape.circle,
                ),
                child: isSelected
                    ? const Icon(
                        LucideIcons.check,
                        size: 11,
                        color: Colors.white,
                      )
                    : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
