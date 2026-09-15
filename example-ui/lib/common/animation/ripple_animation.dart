import 'package:flutter/material.dart';
import 'package:orange_ui/utils/color_res.dart';

import 'circle_painter.dart';

class RipplesAnimation extends StatefulWidget {
  const RipplesAnimation({
    super.key,
    this.size = 100.0,
    required this.child,
  });

  final double size;
  final Widget child;

  @override
  State<RipplesAnimation> createState() => _RipplesAnimationState();
}

class _RipplesAnimationState extends State<RipplesAnimation>
    with TickerProviderStateMixin {
  AnimationController? _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    )..repeat();
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Widget _button() {
    return Center(
      child: ClipRRect(
        borderRadius: BorderRadius.circular(widget.size),
        child: widget.child,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: CustomPaint(
        painter: CirclePainter(
          _controller!,
          color: ColorRes.greyShade300,
        ),
        child: SizedBox(
          width: widget.size * 3.5,
          height: widget.size * 3.5,
          child: _button(),
        ),
      ),
    );
  }
}
