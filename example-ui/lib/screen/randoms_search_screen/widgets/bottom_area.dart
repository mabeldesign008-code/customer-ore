import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class BottomArea extends StatelessWidget {
  final VoidCallback onCancelTap;
  final VoidCallback onNextTap;
  final bool isLoading;

  const BottomArea(
      {super.key,
      required this.onCancelTap,
      required this.isLoading,
      required this.onNextTap});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: InkWell(
              borderRadius: BorderRadius.circular(10),
              onTap: () {
                isLoading ? onCancelTap() : onNextTap();
              },
              child: Container(
                height: 50,
                width: Get.width,
                decoration: BoxDecoration(
                  color: ColorRes.themeColor.withValues(alpha: 0.13),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Center(
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 300),
                    transitionBuilder: (Widget child, Animation<double> animation) {
                      return ScaleTransition(scale: animation, child: child);
                    },
                    child: Text(
                      isLoading ? S.current.cancelCap : S.current.next,
                      key: ValueKey<String>(isLoading ? S.current.cancelCap : S.current.next),
                      style: const TextStyle(
                        color: ColorRes.themeColor,
                        fontFamily: FontRes.bold,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 23),
        ],
      ),
    );
  }
}
