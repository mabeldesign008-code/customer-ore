import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class BorderTextCard extends StatelessWidget {
  final String text;
  final VoidCallback onTap;
  final bool isSelected;
  final EdgeInsets? padding;
  final bool isCheckBtnVisible;
  final double? height;
  final Color? bgColor;
  final EdgeInsets? margin;

  const BorderTextCard({
    super.key,
    required this.text,
    required this.onTap,
    required this.isSelected,
    this.padding,
    this.isCheckBtnVisible = false,
    this.height,
    this.bgColor,
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        height: height ?? 50,
        padding: padding,
        margin: margin,
        decoration: ShapeDecoration(
            shape: SmoothRectangleBorder(
              borderRadius:
                  SmoothBorderRadius(cornerRadius: 15, cornerSmoothing: 1),
              side: BorderSide(
                  color:
                      isSelected ? ColorRes.themeColor : ColorRes.borderColor),
            ),
            color: bgColor ??
                (isSelected
                    ? ColorRes.themeColor.withValues(alpha: 0.06)
                    : ColorRes.white)),
        alignment: AlignmentDirectional.center,
        child: Row(
          mainAxisAlignment: isCheckBtnVisible
              ? MainAxisAlignment.spaceBetween
              : MainAxisAlignment.center,
          children: [
            Text(
              text,
              style: TextStyle(
                  fontFamily: FontRes.medium,
                  fontSize: 16,
                  color: isSelected ? ColorRes.themeColor : ColorRes.dimGrey3),
            ),
            if (isCheckBtnVisible)
              Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isSelected ? ColorRes.themeColor : ColorRes.white,
                    boxShadow: isSelected
                        ? []
                        : [
                            BoxShadow(
                                color: ColorRes.black.withValues(alpha: 0.15),
                                offset: const Offset(0, 1),
                                blurRadius: 4)
                          ]),
                alignment: AlignmentDirectional.center,
                child: Image.asset(AssetRes.icCheck,
                    color: ColorRes.white, height: 10, width: 10),
              )
          ],
        ),
      ),
    );
  }
}
