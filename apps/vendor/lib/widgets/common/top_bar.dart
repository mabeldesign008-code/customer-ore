import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';

/// Top bar with back button, title, and progress indicator
/// Matching TopBar component from React app
class TopBar extends StatelessWidget {
  final String title;
  final VoidCallback? onBack;
  final int? step;
  final int? total;
  final Widget? rightSlot;

  const TopBar({
    super.key,
    required this.title,
    this.onBack,
    this.step,
    this.total,
    this.rightSlot,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.background.withOpacity(0.92),
        border: const Border(
          bottom: BorderSide(color: AppColors.border, width: 1),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // Header with back button, title, and right slot
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Row(
                children: [
                  // Back button or spacer
                  SizedBox(
                    width: 40,
                    height: 40,
                    child: onBack != null
                        ? IconButton(tooltip: 'Action', 
                            onPressed: onBack,
                            icon: const Icon(
                              LucideIcons.arrowLeft,
                              size: 18,
                              color: AppColors.textPrimary,
                            ),
                            style: IconButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shape: const CircleBorder(),
                            ),
                          )
                        : null,
                  ),
                  // Title
                  Expanded(
                    child: Text(
                      title,
                      style: AppTextStyles.heading3,
                      textAlign: TextAlign.center,
                    ),
                  ),
                  // Right slot or spacer
                  SizedBox(
                    width: 40,
                    height: 40,
                    child: rightSlot,
                  ),
                ],
              ),
            ),

            // Progress indicator (if step and total provided)
            if (step != null && total != null) ...[
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: Column(
                  children: [
                    // Step indicator text
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Step $step of $total',
                          style: AppTextStyles.bodySmall.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Text(
                          '${((step! / total!) * 100).round()}% Complete',
                          style: AppTextStyles.bodySmall.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    // Progress bar
                    ProgressBar(step: step!, total: total!),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Progress bar component matching React version
class ProgressBar extends StatelessWidget {
  final int step;
  final int total;

  const ProgressBar({
    super.key,
    required this.step,
    required this.total,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 8,
      decoration: BoxDecoration(
        color: AppColors.primaryTransparent20, // rgba(0,82,204,0.2)
        borderRadius: BorderRadius.circular(4),
      ),
      child: FractionallySizedBox(
        alignment: Alignment.centerLeft,
        widthFactor: step / total,
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
      ),
    );
  }
}
