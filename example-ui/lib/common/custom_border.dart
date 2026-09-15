import 'package:flutter/material.dart';
import 'package:orange_ui/utils/color_res.dart';

class CustomBorder extends StatelessWidget {
  final double? height;
  final Color? color;

  const CustomBorder({super.key, this.height, this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
        height: height ?? 1,
        width: double.infinity,
        color: color ?? ColorRes.borderColor);
  }
}
