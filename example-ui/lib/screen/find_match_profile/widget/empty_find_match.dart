import 'package:flutter/material.dart';
import 'package:orange_ui/common/button/custom_text_button.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class EmptyFindMatch extends StatelessWidget {
  final VoidCallback onTap;

  const EmptyFindMatch({super.key, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 30.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Image.asset(AssetRes.emptyFindMatch, height: 200, width: 200),
          const SizedBox(height: 5),
          Text(
            S.of(context).noMatchesFound,
            style: const TextStyle(
                fontFamily: FontRes.bold,
                color: ColorRes.davyGrey,
                fontSize: 25),
          ),
          const SizedBox(height: 5),
          Text(
            S
                .of(context)
                .tryExpandingYourAgeOrDistancePreferencesOrSwitchInterests,
            style: const TextStyle(
                fontFamily: FontRes.regular,
                color: ColorRes.dimGrey3,
                fontSize: 17),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          CustomTextButton(
              onTap: onTap,
              margin: const EdgeInsets.symmetric(horizontal: 20),
              title: S.of(context).makeYourPreferenceWider),
        ],
      ),
    );
  }
}
