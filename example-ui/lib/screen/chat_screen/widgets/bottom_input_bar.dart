import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/style_res.dart';

class BottomInputBar extends StatelessWidget {
  final TextEditingController msgController;
  final VoidCallback onShareBtnTap;
  final VoidCallback onAddBtnTap;
  final VoidCallback onCameraTap;

  const BottomInputBar({
    super.key,
    required this.msgController,
    required this.onShareBtnTap,
    required this.onAddBtnTap,
    required this.onCameraTap,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      minimum: const EdgeInsets.only(bottom: 10),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 3),
        margin: const EdgeInsets.symmetric(horizontal: 10),
        width: Get.width,
        color: ColorRes.white,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(30),
                  color: ColorRes.grey10,
                ),
                child: TextField(
                  controller: msgController,
                  textCapitalization: TextCapitalization.sentences,
                  textInputAction: TextInputAction.newline,
                  minLines: 1,
                  maxLines: 5,
                  textAlignVertical: TextAlignVertical.center,
                  onTapOutside: (_) => FocusManager.instance.primaryFocus?.unfocus(),
                  decoration: InputDecoration(
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                    border: InputBorder.none,
                    hintText: S.current.chatHint,
                    hintStyle: const TextStyle(fontSize: 14),
                    suffixIconConstraints: const BoxConstraints(),
                    suffixIcon: InkWell(
                      onTap: onShareBtnTap,
                      child: Container(
                        height: 36,
                        width: 36,
                        margin: const EdgeInsets.all(3),
                        alignment: Alignment.center,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: StyleRes.linearGradient,
                        ),
                        child: Image.asset(AssetRes.share, height: 16, width: 16),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10), // Added spacing for better layout
            InkWell(
              onTap: onAddBtnTap,
              borderRadius: BorderRadius.circular(10),
              child: Image.asset(
                AssetRes.add,
                height: 25,
                width: 25,
                color: ColorRes.themeColor,
              ),
            ),
            const SizedBox(width: 10), // Added spacing for better layout
            InkWell(
              onTap: onCameraTap,
              borderRadius: BorderRadius.circular(10),
              child: Image.asset(
                AssetRes.camera,
                height: 25,
                width: 25,
                color: ColorRes.themeColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
