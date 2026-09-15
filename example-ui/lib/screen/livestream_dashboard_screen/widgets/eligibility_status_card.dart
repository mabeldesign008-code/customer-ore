import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class EligibilityStatusCard extends StatelessWidget {
  final String? image;
  final String title;
  final String eligibilityTitle;
  final Color color;
  final String? fontFamily;
  final VoidCallback? onTap;

  const EligibilityStatusCard(
      {super.key,
      this.image,
      required this.title,
      required this.color,
      required this.eligibilityTitle,
      this.fontFamily,
      this.onTap});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        SizedBox(
          height: 54,
          width: Get.width,
          child: ClipRRect(
              borderRadius: BorderRadius.circular(15),
              child: Image.asset(AssetRes.map1)),
        ),
        Container(
          height: 54,
          width: Get.width,
          decoration: BoxDecoration(
            color: ColorRes.darkGrey5.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(15),
          ),
        ),
        SizedBox(
          height: 54,
          width: Get.width,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(15),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaY: 15, sigmaX: 15),
              child: Padding(
                padding: const EdgeInsets.only(left: 13, right: 3),
                child: Row(
                  spacing: 10,
                  children: [
                    if (image != null)
                      Image.asset(image!, height: 25, width: 25),
                    Expanded(
                      child: Text(
                        title,
                        style: const TextStyle(
                            fontSize: 15, color: ColorRes.darkGrey),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    InkWell(
                      onTap: onTap,
                      child: Container(
                        height: 37,
                        padding: const EdgeInsets.symmetric(horizontal: 25),
                        decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(30),
                            color: color.withValues(alpha: 0.20)),
                        alignment: Alignment.center,
                        child: Text(
                          eligibilityTitle,
                          style: TextStyle(
                              color: color,
                              fontSize: 12,
                              fontFamily: fontFamily ?? FontRes.semiBold,
                              letterSpacing: 0.8),
                        ),
                      ),
                    )
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
