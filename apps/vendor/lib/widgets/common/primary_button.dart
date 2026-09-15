import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';

/// Primary button matching PrimaryButton from React app
/// Default: w-full h-14 rounded-[24px] with arrow icon
class PrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool disabled;
  final Widget? icon;
  final bool loading;

  const PrimaryButton({
    super.key,
    this.label = 'Continue',
    this.onPressed,
    this.disabled = false,
    this.icon,
    this.loading = false,
  });

  @override
  Widget build(BuildContext context) {
    final bool isDisabled = disabled || loading || onPressed == null;

    return SizedBox(
      width: double.infinity,
      height: 56, // h-14 = 56px
      child: ElevatedButton(
        onPressed: isDisabled ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: isDisabled ? AppColors.textDisabled : AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          shadowColor: isDisabled ? Colors.transparent : AppColors.shadowPrimary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24),
        ).copyWith(
          // Custom shadow for non-disabled state
          elevation: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.disabled)) return 0;
            if (states.contains(WidgetState.pressed)) return 2;
            return 10;
          }),
        ),
        child: loading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    label,
                    style: AppTextStyles.buttonText.copyWith(
                      color: Colors.white,
                    ),
                  ),
                  if (!isDisabled) ...[
                    const SizedBox(width: 8),
                    icon ?? const Icon(LucideIcons.arrowRight, size: 16),
                  ],
                ],
              ),
      ),
    );
  }
}
