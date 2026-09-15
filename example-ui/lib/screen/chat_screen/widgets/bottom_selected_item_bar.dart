import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class BottomSelectedItemBar extends StatelessWidget {
  final VoidCallback onCancelBtnClick;
  final int selectedItemCount;
  final VoidCallback onItemDelete;

  const BottomSelectedItemBar({super.key,
      required this.onCancelBtnClick,
      required this.selectedItemCount,
      required this.onItemDelete});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const Divider(
          thickness: 0.5,
        ),
        Container(
          padding: const EdgeInsets.symmetric(vertical: 4),
          margin: const EdgeInsets.only(bottom: 7, right: 10, left: 10),
          width: Get.width,
          decoration: const BoxDecoration(color: ColorRes.white),
          child: SafeArea(
            top: false,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                InkWell(
                  onTap: onCancelBtnClick,
                  child: Text(
                    S.current.cancel,
                    style: const TextStyle(
                        fontSize: 15, color: ColorRes.davyGrey, fontFamily: FontRes.semiBold),
                  ),
                ),
                const Spacer(),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  transitionBuilder: (Widget child, Animation<double> animation) {
                    return ScaleTransition(scale: animation, child: child);
                  },
                  child: Text(
                    '$selectedItemCount ',
                    key: ValueKey<int>(selectedItemCount),
                    style: const TextStyle(
                      fontFamily: FontRes.semiBold,
                      fontSize: 15,
                      color: ColorRes.davyGrey,
                    ),
                  ),
                ),
                Text(
                  S.current.selected,
                  style: const TextStyle(
                      fontSize: 15, color: ColorRes.davyGrey, fontFamily: FontRes.semiBold),
                ),
                const Spacer(),
                InkWell(
                  onTap: onItemDelete,
                  child: const Icon(
                    Icons.delete,
                    color: ColorRes.themeColor,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
