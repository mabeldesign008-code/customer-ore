import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/style_res.dart';

class CustomTextButton extends StatelessWidget {
  final VoidCallback onTap;
  final String? title;
  final double? cornerRadius;
  final Color? bgColor;
  final Color? textColor;
  final Gradient? gradient;
  final String? fontFamily;
  final double? height;
  final double? fontSize;
  final EdgeInsets? margin;
  final bool bottomSafeArea;
  final Widget? widget;

  const CustomTextButton({
    super.key,
    required this.onTap,
    this.title,
    this.cornerRadius,
    this.bgColor,
    this.gradient = StyleRes.linearGradient,
    this.textColor,
    this.fontFamily,
    this.height,
    this.fontSize,
    this.margin,
    this.bottomSafeArea = true,
    this.widget,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      bottom: bottomSafeArea,
      child: InkWell(
        onTap: onTap,
        child: Container(
          height: height ?? 50,
          margin: margin,
          padding: const EdgeInsets.symmetric(horizontal: 20),
          alignment: AlignmentDirectional.center,
          decoration: ShapeDecoration(
              shape: SmoothRectangleBorder(
                  borderRadius: SmoothBorderRadius(
                      cornerRadius: cornerRadius ?? 15, cornerSmoothing: 1)),
              color: bgColor,
              gradient: bgColor == null ? gradient : null),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                title ?? S.of(context).continueText,
                style: TextStyle(
                    fontFamily: fontFamily ?? FontRes.semiBold,
                    color: textColor ?? ColorRes.white,
                    fontSize: fontSize ?? 18),
              ),
              if (widget != null) widget!
            ],
          ),
        ),
      ),
    );
  }
}
