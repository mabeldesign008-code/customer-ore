import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/style_res.dart';

class CustomIconButton extends StatelessWidget {
  final VoidCallback onTap;

  const CustomIconButton({super.key, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: SizedBox(
        height: 75,
        width: 75,
        child: Stack(
          children: [
            Align(
              alignment: AlignmentDirectional.bottomEnd,
              child: Container(
                height: 70,
                width: 70,
                decoration: ShapeDecoration(
                    shape: SmoothRectangleBorder(
                      borderRadius: SmoothBorderRadius(
                          cornerRadius: 20, cornerSmoothing: 1),
                    ),
                    color: ColorRes.themeColor.withValues(alpha: 0.06)),
              ),
            ),
            Container(
              height: 70,
              width: 70,
              decoration: ShapeDecoration(
                shape: SmoothRectangleBorder(
                  borderRadius:
                      SmoothBorderRadius(cornerRadius: 20, cornerSmoothing: 1),
                ),
                gradient: StyleRes.linearGradient,
              ),
              alignment: Alignment.center,
              child: Image.asset(AssetRes.icRightArrow,
                  color: Colors.white, width: 40, height: 40),
            ),
          ],
        ),
      ),
    );
  }
}
