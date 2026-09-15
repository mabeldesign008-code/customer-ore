import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/utils/color_res.dart';

class TopStoryLine extends StatefulWidget {
  final int imageLength;
  final PageController pageController;

  const TopStoryLine(
      {super.key, required this.imageLength, required this.pageController});

  @override
  State<TopStoryLine> createState() => _TopStoryLineState();
}

class _TopStoryLineState extends State<TopStoryLine> {
  int currentPosition = 0;
  int lastCurrentPosition = 0;

  @override
  Widget build(BuildContext context) {
    widget.pageController.addListener(() {
      currentPosition = widget.pageController.page?.round() ?? 0;
      if (currentPosition != lastCurrentPosition) {
        if (mounted) {
          lastCurrentPosition = currentPosition;
          setState(() {});
        }
      }
    });

    return widget.imageLength <= 1
        ? const SizedBox()
        : Container(
            margin: const EdgeInsets.symmetric(horizontal: 31),
            child: Row(
              children: List.generate(widget.imageLength, (index) {
                return Expanded(
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 1.5),
                    height: 2.7,
                    width: (Get.width - 62) / widget.imageLength,
                    decoration: BoxDecoration(
                      color: currentPosition == index
                          ? ColorRes.white
                          : ColorRes.white.withValues(alpha: 0.30),
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                );
              }),
            ),
          );
  }
}
