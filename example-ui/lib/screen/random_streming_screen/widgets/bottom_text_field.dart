import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';

class BottomTextField extends StatelessWidget {
  final TextEditingController commentController;
  final FocusNode commentFocus;
  final VoidCallback onMsgSend;

  const BottomTextField(
      {super.key,
      required this.commentController,
      required this.onMsgSend,
      required this.commentFocus});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        width: Get.width,
        height: 50,
        margin: const EdgeInsets.symmetric(horizontal: 10),
        padding: const EdgeInsets.symmetric(horizontal: 5),
        decoration: BoxDecoration(
            color: ColorRes.black.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(30)),
        child: Row(
          children: [
            Expanded(
              child: TextField(
                  controller: commentController,
                  focusNode: commentFocus,
                  style: TextStyle(fontSize: 13, color: ColorRes.white.withValues(alpha: 0.70)),
                  keyboardType: TextInputType.multiline,
                  decoration: InputDecoration(
                    isDense: true,
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10.0),
                        borderSide: const BorderSide(color: ColorRes.transparent, width: 0.0)),
                    focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10.0),
                        borderSide: const BorderSide(color: ColorRes.transparent, width: 0.0)),
                    enabledBorder: OutlineInputBorder(
                        borderSide: const BorderSide(color: ColorRes.transparent, width: 0.0),
                        borderRadius: BorderRadius.circular(10)),
                    hintText: S.current.comment,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10),
                    hintStyle:
                        TextStyle(color: ColorRes.white.withValues(alpha: 0.45), fontSize: 13),
                  ),
                  cursorColor: ColorRes.white),
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
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      ColorRes.lightOrange,
                      ColorRes.themeColor,
                    ],
                  ),
                ),
                child: Image.asset(AssetRes.share),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
