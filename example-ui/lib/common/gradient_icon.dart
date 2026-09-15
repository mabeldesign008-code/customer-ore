import 'package:flutter/material.dart';
import 'package:orange_ui/utils/style_res.dart';

class GradientIcon extends StatelessWidget {
  final Widget child;
  final Gradient? gradient;

  const GradientIcon({super.key, required this.child, this.gradient});

  @override
  Widget build(BuildContext context) {
    return ShaderMask(
      shaderCallback: (Rect bounds) {
        return (gradient ?? StyleRes.linearGradient).createShader(bounds);
      },
      blendMode: BlendMode.srcATop,
      child: child,
    );
  }
}
