import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/subscription_sheet/subscription_sheet.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/style_res.dart';

class SubscriptionButton extends StatefulWidget {
  const SubscriptionButton({super.key});

  @override
  State<SubscriptionButton> createState() => _SubscriptionButtonState();
}

class _SubscriptionButtonState extends State<SubscriptionButton> {
  String _text1 = S.current.go;
  String _text2 = ' ${S.current.premium}';

  @override
  void initState() {
    super.initState();
    UserData? userData = SessionManager.instance.getUser();
    if (userData?.isVerify == true) {
      _text1 = '';
      _text2 = S.current.youArePremiumMember;
    }
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () {
        Get.bottomSheet(const SubscriptionSheet(), isScrollControlled: true)
            .then((value) {
          if (value != null && value == true) {
            _text1 = '';
            _text2 = S.current.youArePremiumMember;
            setState(() {});
          }
        });
      },
      child: Container(
        height: 49,
        margin: const EdgeInsets.symmetric(vertical: 3),
        width: MediaQuery.of(context).size.width,
        decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            gradient: StyleRes.linearGradient),
        child: Row(
          children: [
            Container(
              height: 28,
              width: 28,
              alignment: Alignment.center,
              margin: const EdgeInsets.symmetric(horizontal: 10),
              decoration: BoxDecoration(
                  color: ColorRes.themeColor.withValues(alpha: 0.1),
                  shape: BoxShape.circle),
              child: Image.asset(
                AssetRes.icPremiumCrown,
                height: 28,
                width: 28,
              ),
            ),
            RichText(
              text: TextSpan(
                text: _text1,
                style: const TextStyle(
                    color: ColorRes.white,
                    fontFamily: FontRes.regular,
                    fontSize: 15),
                children: [
                  TextSpan(
                    text: _text2.toUpperCase(),
                    style: const TextStyle(
                        color: ColorRes.white,
                        fontFamily: FontRes.bold,
                        fontSize: 15),
                  )
                ],
              ),
            )
          ],
        ),
      ),
    );
  }
}
