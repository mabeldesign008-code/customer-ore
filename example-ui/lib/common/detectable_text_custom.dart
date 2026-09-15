import 'package:detectable_text_field/detectable_text_field.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/hashtag_screen/hashtag_screen.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class DetectableTextCustom extends StatelessWidget {
  final String text;

  const DetectableTextCustom({super.key, required this.text});

  @override
  Widget build(BuildContext context) {
    return DetectableText(
      text: text,
      onTap: (p0) {
        Get.to(() => HashtagScreen(hashtagName: p0), preventDuplicates: false);
      },
      detectionRegExp: RegExp(r"\B#\w\w+"),
      detectedStyle: const TextStyle(
          fontFamily: FontRes.bold,
          color: ColorRes.themeColor,
          fontSize: 16,
          height: 1.12),
      basicStyle: const TextStyle(
          color: ColorRes.dimGrey3, fontSize: 16, fontFamily: FontRes.medium, height: 1.1),
      trimExpandedText: ' ${S.of(context).readLess}',
      trimCollapsedText: S.of(context).readMore,
      moreStyle: const TextStyle(
          fontFamily: FontRes.bold, color: ColorRes.themeColor, fontSize: 16),
      lessStyle: const TextStyle(
          fontFamily: FontRes.bold, color: ColorRes.themeColor, fontSize: 16),
    );
  }
}
