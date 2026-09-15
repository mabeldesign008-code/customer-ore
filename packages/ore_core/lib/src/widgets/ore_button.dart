import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../motion/motion.dart';
import '../theme/app_colors.dart';

/// A premium primary / secondary / text / loading / success / error button
/// with built-in micro-interactions (press-scale, state morphs with spring, haptic).
class OreButton extends StatefulWidget {
  const OreButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.isLoading = false,
    this.isSuccess = false,
    this.isError = false,
    this.variant = OreButtonVariant.primary,
    this.color,
    this.textColor,
    this.fullWidth = true,
    this.height = 54,
    this.compact = false,
  });

  /// Secondary button constructor
  const OreButton.secondary({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.isLoading = false,
    this.isSuccess = false,
    this.isError = false,
    this.color,
    this.textColor,
    this.fullWidth = true,
    this.height = 54,
    this.compact = false,
  }) : variant = OreButtonVariant.secondary;

  /// Ghost button constructor  
  const OreButton.ghost({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.isLoading = false,
    this.isSuccess = false,
    this.isError = false,
    this.color,
    this.textColor,
    this.fullWidth = true,
    this.height = 54,
    this.compact = false,
  }) : variant = OreButtonVariant.ghost;

  /// Danger button constructor
  const OreButton.danger({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.isLoading = false,
    this.isSuccess = false,
    this.isError = false,
    this.color,
    this.textColor,
    this.fullWidth = true,
    this.height = 54,
    this.compact = false,
  }) : variant = OreButtonVariant.danger;

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool isLoading;
  final bool isSuccess;
  final bool isError;
  final OreButtonVariant variant;
  final Color? color;
  final Color? textColor;
  final bool fullWidth;
  final double height;
  /// Compact variant (44px tall) for space-constrained bars like the sticky checkout bar.
  final bool compact;

  @override
  State<OreButton> createState() => _OreButtonState();
}

enum OreButtonVariant { primary, secondary, ghost, danger }

class _OreButtonState extends State<OreButton>
    with TickerProviderStateMixin {
  late final AnimationController _shakeCtrl;

  @override
  void initState() {
    super.initState();
    _shakeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 450),
    );
  }

  @override
  void didUpdateWidget(covariant OreButton old) {
    super.didUpdateWidget(old);
    if (widget.isError && !old.isError) {
      Haptics.error();
      _shakeCtrl.forward(from: 0);
    } else if (widget.isSuccess && !old.isSuccess) {
      Haptics.success();
    }
  }

  @override
  void dispose() {
    _shakeCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onPressed != null &&
        !widget.isLoading &&
        !widget.isSuccess &&
        !widget.isError;

    final Color bg;
    final Color fg;
    final Color? border;

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = Theme.of(context).colorScheme.surface;
    final defaultText = isDark ? AppColors.darkTextPrimary : AppColors.textPrimary;

    switch (widget.variant) {
      case OreButtonVariant.primary:
        bg = widget.isError
            ? AppColors.danger
            : (widget.color ?? (isDark ? AppColors.primaryLight : AppColors.primary));
        fg = widget.textColor ?? Colors.white;
        border = null;
        break;
      case OreButtonVariant.secondary:
        bg = surfaceColor;
        fg = widget.isError ? AppColors.danger : (widget.textColor ?? (isDark ? AppColors.primaryLight : AppColors.primary));
        border = widget.isError ? AppColors.danger : (widget.color ?? (isDark ? AppColors.primaryLight : AppColors.primary));
        break;
      case OreButtonVariant.ghost:
        bg = Colors.transparent;
        fg = widget.isError ? AppColors.danger : (widget.textColor ?? defaultText);
        border = Colors.transparent;
        break;
      case OreButtonVariant.danger:
        bg = AppColors.danger;
        fg = Colors.white;
        border = null;
        break;
    }

    final effectiveHeight = widget.compact ? 44.0 : widget.height;
    final radius = widget.compact ? 12.0 : 16.0;
    Widget content = AnimatedContainer(
      duration: Motion.normal,
      curve: Motion.standard,
      height: effectiveHeight,
      width: widget.fullWidth ? double.infinity : null,
      padding: EdgeInsets.symmetric(horizontal: widget.fullWidth ? 0 : 24),
      decoration: BoxDecoration(
        color: enabled ? bg : bg.withOpacity(0.5),
        borderRadius: BorderRadius.circular(radius),
        border: border == null ? null : Border.all(color: border, width: 1.4),
        boxShadow: (widget.variant == OreButtonVariant.primary ||
                widget.variant == OreButtonVariant.danger) &&
                enabled
            ? [
                BoxShadow(
                  color: bg.withOpacity(0.28),
                  blurRadius: 14,
                  offset: const Offset(0, 6),
                )
              ]
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(radius),
          onTap: enabled
              ? () {
                  Haptics.medium();
                  widget.onPressed!();
                }
              : null,
          child: Center(
            child: AnimatedSwitcher(
              duration: Motion.normal,
              switchInCurve: Motion.spring,
              switchOutCurve: Motion.standard,
              transitionBuilder: (child, anim) => FadeTransition(
                opacity: anim,
                child: ScaleTransition(scale: anim, child: child),
              ),
              child: widget.isLoading
                  ? SizedBox(
                      key: const ValueKey('loading'),
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        valueColor: AlwaysStoppedAnimation<Color>(fg),
                      ),
                    )
                  : widget.isSuccess
                      ? Icon(Icons.check_rounded, color: fg, size: 26,
                          key: const ValueKey('success'))
                      : widget.isError
                          ? Icon(Icons.error_outline_rounded, color: fg, size: 24,
                              key: const ValueKey('error'))
                          : Row(
                              key: const ValueKey('label'),
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                if (widget.icon != null) ...[
                                  Icon(widget.icon, color: fg, size: 20),
                                  const SizedBox(width: 8),
                                ],
                                Text(
                                  widget.label,
                                  style: TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: fg,
                                    letterSpacing: 0.2,
                                  ),
                                ),
                              ],
                            ),
            ),
          ),
        ),
      ),
    );

    if (widget.isError) {
      content = AnimatedBuilder(
        animation: _shakeCtrl,
        builder: (_, child) {
          final v = _shakeCtrl.value;
          final sine = 8.0 * math.sin(v * 3 * 3.1415926) * (1 - v);
          return Transform.translate(offset: Offset(sine, 0), child: child);
        },
        child: content,
      );
    }

    final result = widget.fullWidth
        ? content
        : Row(mainAxisSize: MainAxisSize.min, children: [content]);

    return Semantics(
      button: true,
      enabled: enabled,
      label: widget.label,
      onTap: enabled
          ? () {
              Haptics.medium();
              widget.onPressed!();
            }
          : null,
      child: result,
    );
  }
}
