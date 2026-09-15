import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Horizontal shake animation — perfect for invalid input feedback.
///
/// Usage:
/// ```dart
/// _shakeKey.currentState?.shake();
/// ```
class ShakeX extends StatefulWidget {
  const ShakeX({
    super.key,
    required this.child,
    this.duration = const Duration(milliseconds: 500),
    this.delta = 10,
    this.curve = Curves.elasticOut,
  });

  final Widget child;
  final Duration duration;
  final double delta;
  final Curve curve;

  @override
  ShakeXState createState() => ShakeXState();
}

class ShakeXState extends State<ShakeX> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.duration);
    _anim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: widget.curve),
    );
  }

  /// Trigger the shake animation programmatically.
  void shake() {
    _controller.forward(from: 0);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _anim,
      builder: (_, child) {
        final v = _anim.value;
        // three left-right bounces then settles
        final sine = widget.delta * math.sin(v * 3 * math.pi) * (1 - v);
        return Transform.translate(offset: Offset(sine, 0), child: child);
      },
      child: widget.child,
    );
  }
}
