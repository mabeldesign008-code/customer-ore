import 'package:flutter/material.dart';
import '../motion/motion.dart';

/// Universal press/scale micro-interaction. Wrap any tappable widget.
///
/// Provides:
/// - subtle scale-down on press (96%)
/// - opacity fade
/// - optional light haptic on tap
/// - optional shadow "lift" on press
class AnimatedPress extends StatefulWidget {
  const AnimatedPress({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.scale = 0.96,
    this.opacity = 0.9,
    this.haptic = true,
    this.duration = Motion.fast,
    this.borderRadius,
    this.semanticLabel,
    this.semanticHint,
    this.excludeFromSemantics = false,
  });

  final Widget child;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final double scale;
  final double opacity;
  final bool haptic;
  final Duration duration;
  final BorderRadius? borderRadius;
  final String? semanticLabel;
  final String? semanticHint;
  final bool excludeFromSemantics;

  @override
  State<AnimatedPress> createState() => _AnimatedPressState();
}

class _AnimatedPressState extends State<AnimatedPress>
    with SingleTickerProviderStateMixin {
  bool _pressed = false;

  void _onTapDown(TapDownDetails _) {
    if (widget.onTap == null && widget.onLongPress == null) return;
    setState(() => _pressed = true);
  }

  void _onTapUp(TapUpDetails _) => _release();
  void _onTapCancel() => _release();

  void _release() {
    if (!mounted) return;
    setState(() => _pressed = false);
  }

  @override
  Widget build(BuildContext context) {
    final disabled = widget.onTap == null && widget.onLongPress == null;
    // Respect "reduce motion": skip the press animation entirely when the OS asks.
    final animDuration = Motion.motionDuration(context, widget.duration);
    
    Widget result = GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: _onTapDown,
      onTapUp: _onTapUp,
      onTapCancel: _onTapCancel,
      onTap: widget.onTap == null
          ? null
          : () {
              if (widget.haptic) Haptics.light();
              widget.onTap!();
            },
      onLongPress: widget.onLongPress == null
          ? null
          : () {
              if (widget.haptic) Haptics.medium();
              widget.onLongPress!();
            },
      child: AnimatedContainer(
        duration: animDuration,
        curve: Motion.spring,
        transformAlignment: Alignment.center,
        transform: Matrix4.identity()
          ..scale(_pressed && !disabled ? widget.scale : 1.0),
        child: AnimatedOpacity(
          duration: animDuration,
          opacity: disabled ? 0.5 : (_pressed ? widget.opacity : 1.0),
          child: ClipRRect(
            borderRadius: widget.borderRadius ?? BorderRadius.zero,
            child: widget.child,
          ),
        ),
      ),
    );
    
    if (widget.excludeFromSemantics) {
      return ExcludeSemantics(child: result);
    }
    
    if (widget.semanticLabel != null || widget.semanticHint != null) {
      return Semantics(
        button: true,
        label: widget.semanticLabel,
        hint: widget.semanticHint,
        enabled: !disabled,
        child: result,
      );
    }
    
    return result;
  }
}
