import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../motion/motion.dart';
import 'animated_press.dart';

/// A premium text-field with leading icon, optional trailing icon, animated
/// floating label, focus-scale, haptic on focus, and shake-on-error affordance.
class OreInput extends StatefulWidget {
  const OreInput({
    super.key,
    this.controller,
    this.focusNode,
    this.hintText,
    this.label,
    this.prefixIcon,
    this.suffixIcon,
    this.suffix,
    this.keyboardType,
    this.obscureText = false,
    this.onChanged,
    this.onSubmitted,
    this.inputFormatters,
    this.textInputAction,
    this.autoFocus = false,
    this.enabled = true,
    this.errorText,
    this.maxLength,
    this.maxLines = 1,
    this.minLines,
    this.fillColor,
    this.textCapitalization = TextCapitalization.none,
    this.textAlign = TextAlign.start,
    this.style,
    this.onTap,
    this.readOnly = false,
    this.initialValue,
  });

  final TextEditingController? controller;
  final FocusNode? focusNode;
  final String? hintText;
  final String? label;
  final IconData? prefixIcon;
  final IconData? suffixIcon;
  final Widget? suffix;
  final TextInputType? keyboardType;
  final bool obscureText;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final List<TextInputFormatter>? inputFormatters;
  final TextInputAction? textInputAction;
  final bool autoFocus;
  final bool enabled;
  final String? errorText;
  final int? maxLength;
  final int maxLines;
  final int? minLines;
  final Color? fillColor;
  final TextCapitalization textCapitalization;
  final TextAlign textAlign;
  final TextStyle? style;
  final VoidCallback? onTap;
  final bool readOnly;
  final String? initialValue;

  @override
  State<OreInput> createState() => _OreInputState();
}

class _OreInputState extends State<OreInput>
    with SingleTickerProviderStateMixin {
  late bool _obscured;
  late FocusNode _focus;
  late final AnimationController _shakeCtrl;
  String? _prevError;
  bool _hasFocus = false;

  @override
  void initState() {
    super.initState();
    _obscured = widget.obscureText;
    _focus = widget.focusNode ?? FocusNode();
    _focus.addListener(_onFocusChange);
    _shakeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 450),
    );
  }

  void _onFocusChange() {
    setState(() => _hasFocus = _focus.hasFocus);
    if (_focus.hasFocus) {
      HapticFeedback.selectionClick();
    }
  }

  @override
  void didUpdateWidget(covariant OreInput old) {
    super.didUpdateWidget(old);
    if (widget.errorText != null &&
        widget.errorText!.isNotEmpty &&
        widget.errorText != _prevError) {
      _shakeCtrl.forward(from: 0);
      Haptics.error();
    }
    _prevError = widget.errorText;
  }

  @override
  void dispose() {
    _focus.removeListener(_onFocusChange);
    if (widget.focusNode == null) _focus.dispose();
    _shakeCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final fill = widget.fillColor ?? AppColors.background;
    final labelStyle = AppTypography.body(AppColors.textSecondary)
        .copyWith(fontWeight: FontWeight.w600);
    final floatingLabelStyle = AppTypography.bodySm(AppColors.primary)
        .copyWith(fontWeight: FontWeight.w700);

    Widget field = TextField(
      controller: widget.controller,
      focusNode: _focus,
      keyboardType: widget.keyboardType,
      obscureText: _obscured,
      onChanged: widget.onChanged,
      onSubmitted: widget.onSubmitted,
      inputFormatters: widget.inputFormatters,
      textInputAction: widget.textInputAction,
      autofocus: widget.autoFocus,
      enabled: widget.enabled,
      maxLength: widget.maxLength,
      maxLines: widget.maxLines,
      minLines: widget.minLines,
      textCapitalization: widget.textCapitalization,
      textAlign: widget.textAlign,
      style: widget.style ?? AppTypography.bodyLg(),
      onTap: widget.onTap,
      readOnly: widget.readOnly,
      decoration: InputDecoration(
        filled: true,
        fillColor: fill,
        isDense: false,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        hintText: widget.hintText,
        hintStyle: AppTypography.body(AppColors.textMuted),
        labelText: widget.label,
        labelStyle: labelStyle,
        floatingLabelStyle: floatingLabelStyle,
        prefixIcon: widget.prefixIcon != null
            ? Icon(widget.prefixIcon,
                size: 20,
                color: _hasFocus ? AppColors.primary : AppColors.textSecondary)
            : null,
        suffixIcon: widget.obscureText
            ? IconButton(tooltip: 'Visibility_off_outlined', 
                icon: Icon(
                  _obscured
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined,
                  size: 20,
                  color: AppColors.textSecondary,
                ),
                onPressed: () {
                  HapticFeedback.selectionClick();
                  setState(() => _obscured = !_obscured);
                },
              )
            : widget.suffixIcon != null
                ? Icon(widget.suffixIcon,
                    size: 20, color: AppColors.textSecondary)
                : null,
        suffix: widget.suffix,
        counterText: '',
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.border, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.8),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.danger, width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.danger, width: 1.8),
        ),
        errorText: widget.errorText,
        errorStyle: AppTypography.caption(AppColors.danger),
      ),
    );

    if (widget.errorText != null && widget.errorText!.isNotEmpty) {
      field = AnimatedBuilder(
        animation: _shakeCtrl,
        builder: (_, child) {
          final v = _shakeCtrl.value;
          final sine = 6.0 * math.sin(v * 3 * 3.1415926) * (1 - v);
          return Transform.translate(offset: Offset(sine, 0), child: child);
        },
        child: field,
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AnimatedContainer(
          duration: Motion.fast,
          curve: Curves.easeOutCubic,
          transform: Matrix4.identity()
            ..translate(0.0, _hasFocus ? -1.5 : 0.0)
            ..scale(_hasFocus ? 1.008 : 1.0),
          transformAlignment: Alignment.center,
          child: field,
        ),
      ],
    );
  }
}

/// A rounded white "card" container with soft shadow — reusable section block.
class OreCard extends StatelessWidget {
  const OreCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.margin,
    this.color,
    this.onTap,
    this.radius = 20,
  });

  final Widget child;
  final EdgeInsets padding;
  final EdgeInsets? margin;
  final Color? color;
  final VoidCallback? onTap;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final content = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color ?? theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(radius),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.25 : 0.04),
            blurRadius: isDark ? 20 : 14,
            offset: const Offset(0, 4),
          ),
        ],
        border: isDark ? Border.all(color: AppColors.darkBorder.withOpacity(0.6)) : null,
      ),
      child: child,
    );
    final wrapped = margin != null ? Padding(padding: margin!, child: content) : content;
    if (onTap == null) return wrapped;
    return AnimatedPress(onTap: onTap, borderRadius: BorderRadius.circular(radius), child: wrapped);
  }
}

/// A pill-shaped chip for filters/tags.
class OreChip extends StatelessWidget {
  const OreChip({
    super.key,
    required this.label,
    this.selected = false,
    this.onTap,
    this.icon,
    this.color,
  });

  final String label;
  final bool selected;
  final VoidCallback? onTap;
  final IconData? icon;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = color ?? AppColors.primary;
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final bgUnselected = isDark ? AppColors.darkSurfaceElevated : Colors.white;
    final borderUnselected = isDark ? AppColors.darkBorder : AppColors.border;
    final textUnselected = isDark ? AppColors.darkTextPrimary : AppColors.textPrimary;
    return AnimatedPress(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          color: selected ? c : bgUnselected,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: selected ? c : borderUnselected, width: selected ? 1.5 : 1),
          boxShadow: selected
              ? [BoxShadow(color: c.withOpacity(0.25), blurRadius: 8, offset: const Offset(0, 3))]
              : null,
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          if (icon != null) ...[
            Icon(icon, size: 15, color: selected ? Colors.white : textUnselected),
            const SizedBox(width: 6),
          ],
          Text(label,
              style: AppTypography.body(selected ? Colors.white : textUnselected)
                  .copyWith(fontWeight: FontWeight.w700)),
        ]),
      ),
    );
  }
}

/// A drag handle used at the top of bottom sheets for affordance.
class SheetHandle extends StatelessWidget {
  const SheetHandle({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        margin: const EdgeInsets.only(top: 10, bottom: 8),
        width: 40,
        height: 4,
        decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(4)),
      ),
    );
  }
}
