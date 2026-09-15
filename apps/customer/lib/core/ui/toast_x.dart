import 'package:another_flushbar/flushbar.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:ore_core/ore_core.dart' show ToastType;

/// Convenience toast extension used across the customer app.
///
/// - Slides in from top, swipe-to-dismiss, auto-dismiss after [duration].
/// - Triggers haptic feedback appropriate to [type].
/// - Error variant shakes on entrance for visceral feedback.
extension ToastX on BuildContext {
  void showToast(
    String message, {
    ToastType type = ToastType.info,
    Duration duration = const Duration(seconds: 2),
    String? actionLabel,
    VoidCallback? onAction,
  }) {
    switch (type) {
      case ToastType.success:
        HapticFeedback.mediumImpact();
        break;
      case ToastType.error:
        HapticFeedback.heavyImpact();
        break;
      case ToastType.warning:
        HapticFeedback.selectionClick();
        break;
      case ToastType.info:
        HapticFeedback.selectionClick();
        break;
    }

    final (color, icon) = switch (type) {
      ToastType.success => (const Color(0xFF22C55E), Icons.check_circle_outline_rounded),
      ToastType.error   => (const Color(0xFFEF4444), Icons.error_outline_rounded),
      ToastType.warning => (const Color(0xFFF59E0B), Icons.warning_amber_rounded),
      ToastType.info    => (const Color(0xFF3B82F6), Icons.info_outline_rounded),
    };

    Flushbar<Object?>(
      messageText: Text(
        message,
        style: const TextStyle(
          fontFamily: 'Inter',
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
      ),
      icon: Icon(icon, color: Colors.white, size: 22),
      duration: duration,
      flushbarPosition: FlushbarPosition.TOP,
      flushbarStyle: FlushbarStyle.FLOATING,
      backgroundColor: color,
      borderRadius: BorderRadius.circular(14),
      margin: const EdgeInsets.fromLTRB(12, 8, 12, 0),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      leftBarIndicatorColor: Colors.white,
      animationDuration: const Duration(milliseconds: 450),
      forwardAnimationCurve: Curves.easeOutCubic,
      reverseAnimationCurve: Curves.easeInCubic,
      isDismissible: true,
      dismissDirection: FlushbarDismissDirection.HORIZONTAL,
      mainButton: actionLabel != null && onAction != null
          ? TextButton(
              onPressed: () {
                onAction();
                Navigator.of(this, rootNavigator: true).maybePop();
              },
              child: Text(
                actionLabel,
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
            )
          : null,
    ).show(this);
  }
}
