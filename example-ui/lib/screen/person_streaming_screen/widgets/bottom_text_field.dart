import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/style_res.dart';

class BottomTextField extends StatelessWidget {
  final TextEditingController commentController;
  final FocusNode commentFocus;
  final VoidCallback onMsgSend;
  final VoidCallback onGiftTap;
  final int count;

  const BottomTextField({super.key,
      required this.commentController,
      required this.commentFocus,
      required this.onMsgSend,
      required this.onGiftTap,
      required this.count});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: Get.width - 60,
                margin: const EdgeInsets.only(left: 5),
                padding: const EdgeInsets.all(2),
                decoration: BoxDecoration(
                  color: ColorRes.black.withValues(alpha: 0.33),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: TextField(
                        style: TextStyle(
                          fontSize: 13,
                          color: ColorRes.white.withValues(alpha: 0.70),
                        ),
                        keyboardType: TextInputType.multiline,
                        minLines: 1,
                        maxLines: 5,
                        controller: commentController,
                        focusNode: commentFocus,
                        decoration: InputDecoration(
                          isDense: true,
                          border: InputBorder.none,
                          hintText: S.current.comment,
                          contentPadding: const EdgeInsets.only(
                              left: 14, bottom: 10, top: 0),
                          hintStyle: TextStyle(
                            color: ColorRes.white.withValues(alpha: 0.45),
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ),
                    InkWell(
                      borderRadius: BorderRadius.circular(30),
                      onTap: onMsgSend,
                      child: Container(
                        height: 36,
                        width: 36,
                        padding: const EdgeInsets.fromLTRB(10, 9, 6, 9),
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: StyleRes.linearGradient,
                        ),
                        child: Image.asset(AssetRes.share),
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              InkWell(
                onTap: onGiftTap,
                child: Container(
                  margin: const EdgeInsets.only(right: 10),
                  padding: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    color: ColorRes.black.withValues(alpha: 0.33),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Container(
                    height: 36,
                    width: 36,
                    padding: const EdgeInsets.all(8),
                    decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: StyleRes.linearGradient),
                    child: Image.asset(AssetRes.gift),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
