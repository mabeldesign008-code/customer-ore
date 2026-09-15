import 'package:flutter/material.dart';

/// App color palette matching vendor-fig design system
class AppColors {
  AppColors._();

  // Primary colors - matching vendor-fig (#0052cc)
  static const Color primary = Color(0xFF0052CC);
  static const Color primaryLight = Color(0xFF4D88FF);
  static const Color primaryDark = Color(0xFF0044AA);
  static const Color primaryHover = Color(0xFF0044AA);
  
  // Secondary colors
  static const Color secondary = Color(0xFF64748B);
  
  // Background colors - matching vendor-fig
  static const Color background = Color(0xFFF5F7F8); // #f5f7f8
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceSecondary = Color(0xFFF1F5F9);
  
  // Text colors - matching vendor-fig
  static const Color textPrimary = Color(0xFF0F172A); // #0f172a
  static const Color textSecondary = Color(0xFF64748B); // #64748b
  static const Color textTertiary = Color(0xFF94A3B8);
  static const Color textMuted = textTertiary;
  static const Color textDisabled = Color(0xFFCBD5E1);
  
  // Border colors
  static const Color border = Color(0xFFE2E8F0); // #e2e8f0
  static const Color borderLight = Color(0xFFF1F5F9);
  static const Color inputBorder = Color(0xFFCBD5E1); // rgba(0,82,204,0.3) equivalent
  static const Color inputFocusBorder = primary;
  
  // Status colors
  static const Color success = Color(0xFF059669); // #059669
  static const Color successLight = Color(0xFF10B981);
  static const Color error = Color(0xFFEF4444);
  static const Color errorLight = Color(0xFFFEE2E2);
  static const Color warning = Color(0xFFF59E0B);
  static const Color warningLight = Color(0xFFFEF3C7);
  static const Color info = Color(0xFF3B82F6);
  static const Color infoLight = Color(0xFFDBEAFE);
  
  // Overlay colors
  static const Color overlay = Color(0x80000000);
  static const Color overlayLight = Color(0x40000000);
  
  // Special colors
  static const Color primaryTransparent = Color(0x1A0052CC); // rgba(0,82,204,0.1)
  static const Color primaryTransparent20 = Color(0x330052CC); // rgba(0,82,204,0.2)
  static const Color primaryTransparent5 = Color(0x0D0052CC); // rgba(0,82,204,0.05)
  
  // Shadow colors
  static Color get shadowPrimary => primary.withOpacity(0.2);
  static Color get shadowLight => const Color(0x0F000000);
  
  // Gradient colors
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primary, primaryLight],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  // Chart colors for analytics
  static const List<Color> chartColors = [
    Color(0xFF0052CC), // Primary blue
    Color(0xFF10B981), // Success green
    Color(0xFFF59E0B), // Warning orange
    Color(0xFF3B82F6), // Info blue
    Color(0xFFEF4444), // Error red
    Color(0xFF8B5CF6), // Purple
    Color(0xFFEC4899), // Pink
    Color(0xFF14B8A6), // Teal
  ];
  
  // Business type specific colors
  static const Color restaurantColor = Color(0xFFEF4444);
  static const Color groceriesColor = Color(0xFF10B981);
  static const Color marketColor = Color(0xFFF59E0B);
  static const Color pharmacyColor = Color(0xFF3B82F6);
  static const Color retailColor = Color(0xFF8B5CF6);
  static const Color laundryColor = Color(0xFF14B8A6);
  
  /// Get color by business type
  static Color getBusinessTypeColor(String businessType) {
    switch (businessType.toLowerCase()) {
      case 'restaurant':
        return restaurantColor;
      case 'groceries':
        return groceriesColor;
      case 'market':
        return marketColor;
      case 'pharmacy':
        return pharmacyColor;
      case 'retail':
        return retailColor;
      case 'laundry':
        return laundryColor;
      default:
        return primary;
    }
  }
}
