import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';

class RoundIconButton extends StatelessWidget {
  final VoidCallback? onTap;
  final String? icon;
  final Color? color;
  final Color? bgColor;
  final double? padding;

  const RoundIconButton(
      {super.key,
      this.onTap,
      this.icon,
      this.color,
      this.bgColor,
      this.padding});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap ?? Get.back,
      borderRadius: BorderRadius.circular(30),
      child: Container(
        height: 37,
        width: 37,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: bgColor ?? ColorRes.themeColor.withValues(alpha: 0.06),
        ),
        padding: EdgeInsets.all(padding ?? 0),
        alignment: Alignment.center,
        child: Image.asset(
          icon ?? AssetRes.backArrow,
          height: 25,
          width: 25,
          color: color ?? ColorRes.themeColor,
        ),
      ),
    );
  }
}
