import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class TextWithArrowCard extends StatelessWidget {
  final String title;
  final VoidCallback onTap;

  const TextWithArrowCard(
      {super.key, required this.title, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        width: Get.width,
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        decoration: BoxDecoration(
          color: ColorRes.grey10,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                    color: ColorRes.davyGrey,
                    fontSize: 15,
                    fontFamily: FontRes.semiBold),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const Icon(Icons.keyboard_arrow_right, color: ColorRes.themeColor)
          ],
        ),
      ),
    );
  }
}
