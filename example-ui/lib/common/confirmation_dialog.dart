import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/style_res.dart';

class ConfirmationDialog extends StatelessWidget {
  final VoidCallback? onTap;
  final String description;
  final double? dialogSize;
  final String? textButton;
  final String? heading;
  final EdgeInsets? padding;

  const ConfirmationDialog({super.key,
      required this.onTap,
      required this.description,
      this.dialogSize,
      this.textButton,
      this.heading,
      this.padding});

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: SmoothRectangleBorder(
          borderRadius:
              SmoothBorderRadius(cornerRadius: 20, cornerSmoothing: 1)),
      insetPadding: padding,
      backgroundColor: ColorRes.white,
      child: AspectRatio(
        aspectRatio: dialogSize ?? 1.8,
        child: Container(
          padding: const EdgeInsets.all(15),
          decoration: ShapeDecoration(
              shape: SmoothRectangleBorder(
                  borderRadius:
                      SmoothBorderRadius(cornerRadius: 20, cornerSmoothing: 1)),
              color: ColorRes.white),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              Text(
                heading ?? '${S.current.areYouSure}?',
                style: const TextStyle(
                    fontFamily: FontRes.bold,
                    fontSize: 18,
                    color: ColorRes.davyGrey),
              ),
              Text(
                description,
                style: const TextStyle(
                    color: ColorRes.dimGrey3,
                    fontFamily: FontRes.regular,
                    fontSize: 14),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () {
                        Get.back();
                      },
                      child: Container(
                        height: 45,
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        decoration: ShapeDecoration(
                            shape: SmoothRectangleBorder(
                                borderRadius: SmoothBorderRadius(
                                    cornerRadius: 10, cornerSmoothing: 1))),
                        alignment: Alignment.center,
                        child: Text(
                          S.current.cancel,
                          style: const TextStyle(
                              fontFamily: FontRes.semiBold,
                              fontSize: 15,
                              color: ColorRes.davyGrey),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: InkWell(
                      onTap: onTap,
                      child: Container(
                        height: 45,
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        decoration: ShapeDecoration(
                            shape: SmoothRectangleBorder(
                                borderRadius: SmoothBorderRadius(
                                    cornerRadius: 10, cornerSmoothing: 1)),
                            gradient: StyleRes.linearGradient),
                        alignment: Alignment.center,
                        child: Text(
                          textButton ?? S.current.delete,
                          style: const TextStyle(
                              fontFamily: FontRes.semiBold,
                              fontSize: 15,
                              color: ColorRes.white),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
