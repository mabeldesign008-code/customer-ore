import 'dart:ui';

import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/button/round_icon_button.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/style_res.dart';

class LoginSetupView extends StatelessWidget {
  final Widget? child;
  final String title;
  final String description;
  final EdgeInsets? padding;
  final Widget? topRightWidget;

  const LoginSetupView(
      {super.key,
      this.child,
      required this.title,
      required this.description,
      this.padding,
      this.topRightWidget});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          const LoginBGView(),
          SafeArea(
            bottom: false,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 15.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: 10,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const RoundIconButton(),
                          if (topRightWidget != null) topRightWidget!
                        ],
                      ),
                      const SizedBox(height: 5),
                      Text(
                        title,
                        style: const TextStyle(
                            color: ColorRes.white,
                            fontSize: 25,
                            fontFamily: FontRes.bold),
                      ),
                      Text(
                        description,
                        style: const TextStyle(
                            color: ColorRes.white,
                            fontSize: 16,
                            fontFamily: FontRes.regular),
                      ),
                      const SizedBox(height: 0),
                    ],
                  ),
                ),
                Expanded(
                  child: Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(top: 15),
                    decoration: ShapeDecoration(
                      color: ColorRes.white,
                      shape: SmoothRectangleBorder(
                        borderRadius: SmoothBorderRadius(
                            cornerRadius: 50, cornerSmoothing: 1),
                      ),
                    ),
                    padding: padding ?? const EdgeInsets.only(left: 30, right: 30, top: 20),
                    child: child,
                  ),
                )
              ],
            ),
          )
        ],
      ),
    );
  }
}

class LoginBGView extends StatelessWidget {
  const LoginBGView({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: Get.height / 2,
      width: double.infinity,
      color: ColorRes.black,
      child: Stack(
        children: [
          Positioned(
            top: -60,
            right: -60,
            child: Container(
              height: 200,
              width: 200,
              decoration: ShapeDecoration(
                  shape: SmoothRectangleBorder(
                    borderRadius: SmoothBorderRadius(
                        cornerRadius: 30, cornerSmoothing: 1),
                  ),
                  gradient: StyleRes.linearGradient),
            ),
          ),
          BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 170, sigmaY: 170),
            child: Container(
              height: Get.height / 2,
              width: double.infinity,
              color: ColorRes.black.withValues(alpha: 0.6),
            ),
          )
        ],
      ),
    );
  }
}
