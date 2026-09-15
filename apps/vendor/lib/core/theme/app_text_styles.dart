import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Typography styles matching vendor-fig design system
/// All styles use Inter font family
class AppTextStyles {
  AppTextStyles._();

  // Font family
  static const String fontFamily = 'Inter';

  // Heading styles
  static const TextStyle heading1 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 32,
    fontWeight: FontWeight.w700, // Bold
    height: 1.2,
    color: AppColors.textPrimary,
    letterSpacing: -0.5,
  );

  static const TextStyle heading2 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 24,
    fontWeight: FontWeight.w700, // Bold
    height: 1.3,
    color: AppColors.textPrimary,
    letterSpacing: -0.3,
  );

  static const TextStyle heading3 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 18,
    fontWeight: FontWeight.w700, // Bold
    height: 1.4,
    color: AppColors.textPrimary,
  );

  // Subtitle styles
  static const TextStyle subtitle = TextStyle(
    fontFamily: fontFamily,
    fontSize: 16,
    fontWeight: FontWeight.w600, // SemiBold
    height: 1.5,
    color: AppColors.textPrimary,
  );

  static const TextStyle subtitleMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w600, // SemiBold
    height: 1.5,
    color: AppColors.textPrimary,
  );

  // Body text styles
  static const TextStyle body = TextStyle(
    fontFamily: fontFamily,
    fontSize: 16,
    fontWeight: FontWeight.w400, // Regular
    height: 1.5,
    color: AppColors.textPrimary,
  );

  static const TextStyle bodyMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w400, // Regular
    height: 1.5,
    color: AppColors.textPrimary,
  );

  static const TextStyle bodySmall = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12,
    fontWeight: FontWeight.w400, // Regular
    height: 1.5,
    color: AppColors.textSecondary,
  );

  // Caption styles
  static const TextStyle caption = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12,
    fontWeight: FontWeight.w400, // Regular
    height: 1.4,
    color: AppColors.textSecondary,
  );

  static const TextStyle captionBold = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12,
    fontWeight: FontWeight.w600, // SemiBold
    height: 1.4,
    color: AppColors.textSecondary,
  );

  // Button text styles
  static const TextStyle buttonText = TextStyle(
    fontFamily: fontFamily,
    fontSize: 16,
    fontWeight: FontWeight.w700, // Bold
    height: 1.2,
    letterSpacing: 0.5,
  );

  static const TextStyle buttonTextSmall = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w600, // SemiBold
    height: 1.2,
    letterSpacing: 0.3,
  );

  // Label styles
  static const TextStyle label = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w500, // Medium
    height: 1.4,
    color: AppColors.textPrimary,
  );

  static const TextStyle labelSmall = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12,
    fontWeight: FontWeight.w500, // Medium
    height: 1.4,
    color: AppColors.textSecondary,
  );

  // Overline styles (uppercase small text)
  static const TextStyle overline = TextStyle(
    fontFamily: fontFamily,
    fontSize: 10,
    fontWeight: FontWeight.w600, // SemiBold
    height: 1.6,
    letterSpacing: 1.5,
    color: AppColors.textSecondary,
  );

  // Number/Price styles
  static const TextStyle priceText = TextStyle(
    fontFamily: fontFamily,
    fontSize: 24,
    fontWeight: FontWeight.w700, // Bold
    height: 1.2,
    color: AppColors.textPrimary,
  );

  static const TextStyle priceLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 32,
    fontWeight: FontWeight.w800, // ExtraBold
    height: 1.2,
    color: AppColors.textPrimary,
  );

  // Input text styles
  static const TextStyle inputText = TextStyle(
    fontFamily: fontFamily,
    fontSize: 16,
    fontWeight: FontWeight.w400, // Regular
    height: 1.5,
    color: AppColors.textPrimary,
  );

  static const TextStyle inputLabel = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w500, // Medium
    height: 1.4,
    color: AppColors.textPrimary,
  );

  static const TextStyle inputHint = TextStyle(
    fontFamily: fontFamily,
    fontSize: 16,
    fontWeight: FontWeight.w400, // Regular
    height: 1.5,
    color: AppColors.textTertiary,
  );

  // Link styles
  static const TextStyle link = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w600, // SemiBold
    height: 1.5,
    color: AppColors.primary,
    decoration: TextDecoration.underline,
  );

  // Error/Validation styles
  static const TextStyle errorText = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12,
    fontWeight: FontWeight.w400, // Regular
    height: 1.4,
    color: AppColors.error,
  );

  // Badge/Chip styles
  static const TextStyle badgeText = TextStyle(
    fontFamily: fontFamily,
    fontSize: 11,
    fontWeight: FontWeight.w600, // SemiBold
    height: 1.2,
    letterSpacing: 0.5,
  );

  // Legacy aliases for backward compatibility
  static const TextStyle bodyTextSmall = bodySmall;
}
