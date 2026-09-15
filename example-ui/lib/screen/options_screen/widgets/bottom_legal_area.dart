import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/options_screen/options_screen.dart';
import 'package:orange_ui/screen/options_screen/options_screen_view_model.dart';
import 'package:orange_ui/screen/options_screen/widgets/text_with_arrow_card.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class BottomLegalArea extends StatelessWidget {
  final VoidCallback onPrivacyPolicyTap;
  final VoidCallback onTermsOfUseTap;
  final VoidCallback onLogoutTap;
  final VoidCallback onDeleteAccountTap;
  final OptionalScreenViewModel model;

  const BottomLegalArea({
    super.key,
    required this.onPrivacyPolicyTap,
    required this.onTermsOfUseTap,
    required this.onLogoutTap,
    required this.onDeleteAccountTap,
    required this.model,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        OptionsScreenHeading(title: S.current.legal),
        const SizedBox(height: 9),
        TextWithArrowCard(
            title: S.current.privacyPolicy, onTap: onPrivacyPolicyTap),
        const SizedBox(height: 8),
        TextWithArrowCard(title: S.current.termsOfUse, onTap: onTermsOfUseTap),
        SizedBox(height: AppBar().preferredSize.height / 1.5),
        InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: onLogoutTap,
          child: Container(
            height: 46,
            width: Get.width,
            decoration: BoxDecoration(
                color: ColorRes.grey10,
                borderRadius: BorderRadius.circular(10)),
            child: Center(
              child: Text(
                S.current.logOut,
                style: const TextStyle(
                  fontSize: 15,
                  color: ColorRes.davyGrey,
                  fontFamily: FontRes.semiBold,
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 20),
        Center(child: Image.asset(AssetRes.themeLabel, height: 28, width: 93)),
        Obx(
          () => Center(
              child: Text(
                  "${S.current.versionText} ${model.packageInfo.value?.version}",
                  style:
                      const TextStyle(fontSize: 12, color: ColorRes.grey20))),
        ),
        const SizedBox(height: 20),
        InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: onDeleteAccountTap,
          child: Container(
            height: 46,
            width: Get.width,
            decoration: BoxDecoration(
                color: ColorRes.grey10,
                borderRadius: BorderRadius.circular(10)),
            child: Center(
              child: Text(
                S.current.deleteAccount,
                style: const TextStyle(
                  fontSize: 15,
                  color: ColorRes.davyGrey,
                  fontFamily: FontRes.semiBold,
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 20)
      ],
    );
  }
}
