import 'package:flutter/material.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';

class StartingProfileTopText extends StatelessWidget {
  const StartingProfileTopText({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SizedBox(height: AppBar().preferredSize.height),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Image.asset(AssetRes.themeLabel, height: 28, width: 93),
            const SizedBox(width: 5),
            Text(
              S.current.profile,
              style: const TextStyle(
                color: ColorRes.black,
                fontSize: 21,
              ),
            ),
          ],
        ),
        const SizedBox(height: 18),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Text(
            S.current.startingProfileInfoText,
            style: const TextStyle(
              color: ColorRes.grey2,
              fontSize: 14,
            ),
          ),
        ),
      ],
    );
  }
}
