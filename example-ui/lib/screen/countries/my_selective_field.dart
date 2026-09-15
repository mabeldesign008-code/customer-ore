import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class MySelectiveField extends StatelessWidget {
  final String placeholder;
  final String? heading;
  final double horizontalSpacing;
  final Widget bottomSheet;
  final Function()? onDismiss;
  final bool isSelected;

  const MySelectiveField({
    super.key,
    required this.placeholder,
    this.horizontalSpacing = 20,
    this.heading,
    required this.bottomSheet,
    this.onDismiss,
    this.isSelected = false,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () {
        if (isSelected) {
          Get.bottomSheet(
            bottomSheet,
            isScrollControlled: true,
            ignoreSafeArea: false,
          ).then(
            (value) {
              if (onDismiss != null) onDismiss!();
            },
          );
        }
      },
      child: Container(
        decoration: ShapeDecoration(
          shape: SmoothRectangleBorder(
            borderRadius:
                SmoothBorderRadius(cornerRadius: 15, cornerSmoothing: 1),
            side: const BorderSide(color: ColorRes.borderColor),
          ),
          color: isSelected ? Colors.white : ColorRes.borderColor,
        ),
        height: 50,
        padding: const EdgeInsets.symmetric(horizontal: 15),
        child: Row(
          children: [
            Expanded(
              child: Text(
                placeholder,
                style: const TextStyle(
                    fontFamily: FontRes.medium,
                    fontSize: 16,
                    color: ColorRes.dimGrey3),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            RotatedBox(
              quarterTurns: 1,
              child: Image.asset(
                AssetRes.icRightArrow,
                height: 15,
                width: 15,
                color: ColorRes.grey2,
              ),
            )
          ],
        ),
      ),
    );
  }
}
