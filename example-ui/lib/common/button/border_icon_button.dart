import 'package:flutter/material.dart';

class BorderIconButton extends StatelessWidget {
  final VoidCallback onTap;
  final String icon;
  final Color? color;
  final Color? bgColor;
  final BoxBorder? border;
  final double? height;
  final double? width;
  final double? padding;

  const BorderIconButton(
      {super.key,
      required this.onTap,
      required this.icon,
      this.color,
      this.border,
      this.bgColor,
      this.height,
      this.width,
      this.padding});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(30),
      child: Container(
        height: height ?? 37,
        width: width ?? 37,
        decoration: BoxDecoration(
            shape: BoxShape.circle, color: bgColor, border: border),
        alignment: Alignment.center,
        padding: EdgeInsets.all(padding ?? 5),
        child: Image.asset(icon, color: color),
      ),
    );
  }
}
