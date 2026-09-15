import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/webview_screen/webview_screen.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/urls.dart';

class PrivacyPolicyText extends StatelessWidget {
  const PrivacyPolicyText({super.key});

  @override
  Widget build(BuildContext context) {
    return RichText(
      text: TextSpan(
        text: S.of(context).toContinueBelown,
        style: const TextStyle(
            fontFamily: FontRes.medium, fontSize: 12, color: ColorRes.dimGrey3),
        children: [
          TextSpan(
              text: S.of(context).iAgreeTo,
              style: const TextStyle(
                  fontFamily: FontRes.medium,
                  fontSize: 12,
                  color: ColorRes.dimGrey3)),
          TextSpan(
              text: ' ${S.of(context).termsOfUse}',
              style: const TextStyle(
                  fontFamily: FontRes.medium,
                  fontSize: 12,
                  color: ColorRes.themeColor),
              recognizer: TapGestureRecognizer()
                ..onTap = () async {
                  Get.to(() => WebViewScreen(
                      appBarTitle: S.current.termsOfUse,
                      url: Urls.aTermsOfUse));
                }),
          TextSpan(
              text: ' ${S.of(context).and} ',
              style: const TextStyle(
                  fontFamily: FontRes.medium,
                  fontSize: 12,
                  color: ColorRes.dimGrey3)),
          TextSpan(
              text: S.of(context).privacyPolicy,
              style: const TextStyle(
                  fontFamily: FontRes.medium,
                  fontSize: 12,
                  color: ColorRes.themeColor),
              recognizer: TapGestureRecognizer()
                ..onTap = () async {
                  //Code to launch your URL
                  Get.to(() => WebViewScreen(
                      appBarTitle: S.current.termsOfUse,
                      url: Urls.aPrivacyPolicy));
                }),
        ],
      ),
      textAlign: TextAlign.center,
    );
  }
}
