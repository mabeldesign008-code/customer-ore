import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Motion tokens — shared durations and curves for consistent feel.
class Motion {
  Motion._();

  // Durations
  static const Duration fast = Duration(milliseconds: 150);
  static const Duration normal = Duration(milliseconds: 240);
  static const Duration medium = Duration(milliseconds: 320);
  static const Duration slow = Duration(milliseconds: 480);
  static const Duration page = Duration(milliseconds: 320);
  static const Duration long = Duration(milliseconds: 700);

  // Curves
  static const Curve standard = Curves.easeOutCubic;
  static const Curve emphasized = Curves.easeInOutCubic;
  static const Curve accelerate = Curves.easeInCubic;
  static const Curve decelerate = Curves.easeOutCubic;
  static const Curve spring = Curves.easeOutBack;
  static const Curve bounce = Curves.bounceOut;

  /// Duration that respects the platform "reduce motion" / disable-animations
  /// setting (MediaQuery.disableAnimations). When the user asked for reduced
  /// motion, returns zero so nothing animates.
  static Duration motionDuration(BuildContext context, Duration full) {
    final reduce = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    return reduce ? Duration.zero : full;
  }
}

/// Haptic helpers — use judiciously.
class Haptics {
  Haptics._();

  static void light() => HapticFeedback.selectionClick();
  static void selection() => HapticFeedback.selectionClick();
  static void medium() => HapticFeedback.mediumImpact();
  static void heavy() => HapticFeedback.heavyImpact();
  static void success() {
    HapticFeedback.mediumImpact();
    Future.delayed(const Duration(milliseconds: 80), HapticFeedback.lightImpact);
  }

  static void error() {
    HapticFeedback.heavyImpact();
    Future.delayed(const Duration(milliseconds: 100), HapticFeedback.mediumImpact);
  }
}
