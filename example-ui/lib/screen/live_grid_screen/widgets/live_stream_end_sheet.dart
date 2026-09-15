import 'package:flutter/material.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class LiveStreamEndSheet extends StatelessWidget {
  final String name;
  final VoidCallback onExitBtn;

  const LiveStreamEndSheet(
      {super.key, required this.name, required this.onExitBtn});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 300,
      decoration: const BoxDecoration(
        color: ColorRes.white,
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(30),
        ),
      ),
      padding: const EdgeInsets.all(15),
      child: SafeArea(
        top: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: InkWell(
                onTap: onExitBtn,
                child: CircleAvatar(
                  backgroundColor: ColorRes.themeColor.withValues(alpha: 0.2),
                  child: const Icon(
                    Icons.close,
                    color: ColorRes.themeColor,
                  ),
                ),
              ),
            ),
            const Spacer(),
            Text(
              name,
              style: const TextStyle(color: ColorRes.black, fontSize: 20, fontFamily: FontRes.bold),
            ),
            Text(
              S.of(context).liveStreamEnded,
              style: const TextStyle(color: ColorRes.black, fontSize: 19, fontFamily: FontRes.regular),
            ),
            const Spacer(),
          ],
        ),
      ),
    );
  }
}
