import 'package:flutter/material.dart';

class CustomBoxShadow extends BoxShadow {
  final BlurStyle style;

  const CustomBoxShadow({
    super.color,
    super.offset,
    super.blurRadius,
    this.style = BlurStyle.normal,
  });

  @override
  Paint toPaint() {
    final Paint result = Paint()
      ..color = color
      ..maskFilter = MaskFilter.blur(style, blurSigma);
    assert(() {
      if (debugDisableShadows) {
        result.maskFilter = null;
      }
      return true;
    }());
    return result;
  }
}
