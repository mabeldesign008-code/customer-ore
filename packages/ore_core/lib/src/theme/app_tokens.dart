import 'package:flutter/material.dart';

/// Design tokens for spacing, radii and shadows used across all Ore apps.
///
/// Keep these as `const double` so they tree-shake and can be used in
/// `const EdgeInsets` / `const BorderRadius` constructors.
class AppSpacing {
  AppSpacing._();

  // 4-pixel grid
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20; // screen edge
  static const double xxl = 24;
  static const double xxxl = 32;

  // Common EdgeInsets
  static const screen = EdgeInsets.symmetric(horizontal: xl);
  static const card = EdgeInsets.all(lg);
  static const sectionGap = SizedBox(height: xxl);
  static const itemGap = SizedBox(height: md);
}

class AppRadius {
  AppRadius._();

  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16; // buttons/inputs
  static const double xl = 20; // cards
  static const double xxl = 28; // bottom sheets / modals
  static const double pill = 100;

  static final BorderRadius button = BorderRadius.circular(lg);
  static final BorderRadius card = BorderRadius.circular(xl);
  static final BorderRadius sheet = BorderRadius.circular(xxl);
  static final BorderRadius input = BorderRadius.circular(md + 2);
}

class AppShadows {
  AppShadows._();

  static List<BoxShadow> card = [
    BoxShadow(color: _black(0.04), blurRadius: 14, offset: const Offset(0, 4)),
  ];

  static List<BoxShadow> cardLift = [
    BoxShadow(color: _black(0.08), blurRadius: 20, offset: const Offset(0, 8)),
  ];

  static List<BoxShadow> button = [
    BoxShadow(color: _black(0.15), blurRadius: 12, offset: const Offset(0, 6)),
  ];

  static List<BoxShadow> sheet = [
    BoxShadow(color: _black(0.12), blurRadius: 24, offset: const Offset(0, -8)),
  ];

  static Color _black(double o) => Colors.black.withOpacity(o);
}
