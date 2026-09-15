import 'dart:ui';

import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/style_res.dart';

class HideMoreInfoButton extends StatefulWidget {
  final VoidCallback onHideBtnTap;
  final bool isMoreInfo;

  const HideMoreInfoButton(
      {super.key, required this.onHideBtnTap, required this.isMoreInfo});

  @override
  State<HideMoreInfoButton> createState() => _HideMoreInfoButtonState();
}

class _HideMoreInfoButtonState extends State<HideMoreInfoButton>
    with SingleTickerProviderStateMixin {
  double? _scale;
  AnimationController? _controller;

  @override
  void initState() {
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
      lowerBound: 0.0,
      upperBound: 0.1,
    )..addListener(() {
        if (mounted) setState(() {});
      });

    super.initState();
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  void _tapDown(TapDownDetails details) {
    _controller?.forward();
  }

  void _tapUp(TapUpDetails details) {
    _controller?.reverse();
  }

  @override
  Widget build(BuildContext context) {
    _scale = 1 - _controller!.value;
    return SizedBox(
      height: 80,
      child: Stack(
        alignment: Alignment.topCenter,
        children: [
          if (!widget.isMoreInfo)
            Container(
              margin: const EdgeInsets.only(top: 15),
              child: ClipSmoothRect(
                radius: const SmoothBorderRadius.vertical(
                    top: SmoothRadius(cornerRadius: 30, cornerSmoothing: 1)),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaY: 10, sigmaX: 10),
                  child: Container(
                    width: Get.width,
                    decoration: BoxDecoration(
                      color: ColorRes.black.withValues(alpha: 0.4),
                      borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(30),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: () {
              widget.onHideBtnTap();
              HapticFeedback.lightImpact();
            },
            onTapUp: _tapUp,
            onTapDown: _tapDown,
            child: Transform.scale(
              scale: _scale,
              child: FittedBox(
                child: Container(
                  height: 30,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    gradient: StyleRes.linearGradient,
                  ),
                  child: Text(
                    !widget.isMoreInfo
                        ? S.current.moreInfo
                        : S.current.hideInfo,
                    style: TextStyle(
                        color: ColorRes.white.withValues(alpha: 0.80),
                        fontSize: 11,
                        fontFamily: FontRes.bold,
                        letterSpacing: 0.65),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
