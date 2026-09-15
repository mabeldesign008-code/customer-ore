import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/button/round_icon_button.dart';
import 'package:orange_ui/common/custom_image.dart';
import 'package:orange_ui/common/fullname_with_age.dart';
import 'package:orange_ui/common/gradient_border.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/subscription_sheet/subscription_sheet.dart';
import 'package:orange_ui/screen/subscription_sheet/widget/subscribe_card.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/style_res.dart';

class YourAreProMember extends StatelessWidget {
  const YourAreProMember({super.key});

  @override
  Widget build(BuildContext context) {
    UserData? myUserData = SessionManager.instance.getUser();
    return SubscriptionBG(
        widget: SafeArea(
      top: true,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(height: AppBar().preferredSize.height),
            RoundIconButton(
                onTap: Get.back,
                icon: AssetRes.backArrow,
                bgColor: ColorRes.themeColor.withValues(alpha: 0.1),
                color: ColorRes.themeColor),
            const SizedBox(height: 20),
            Column(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              spacing: 10,
              children: [
                Center(
                  child: SizedBox(
                    width: 150,
                    height: 160,
                    child: Stack(
                      children: [
                        Align(
                          alignment: AlignmentDirectional.topCenter,
                          child: FittedBox(
                            child: GradientBorder(
                              strokeWidth: 4,
                              radius: 300,
                              gradient: StyleRes.linearGradient,
                              child: Padding(
                                padding: const EdgeInsets.all(3.0),
                                child: ClipOval(
                                    child: CustomImage(
                                        image: myUserData?.profileImage ?? '',
                                        height: 150,
                                        width: 150)),
                              ),
                            ),
                          ),
                        ),
                        Align(
                          alignment: AlignmentDirectional.bottomCenter,
                          child: FittedBox(
                            child: Container(
                              height: 30,
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 10),
                              alignment: AlignmentDirectional.center,
                              decoration: ShapeDecoration(
                                  shape: SmoothRectangleBorder(
                                      borderRadius: SmoothBorderRadius(
                                          cornerRadius: 8, cornerSmoothing: 1)),
                                  gradient: StyleRes.linearGradient),
                              child: Text(
                                S.of(context).premium.toUpperCase(),
                                style: const TextStyle(
                                    fontFamily: FontRes.bold,
                                    color: ColorRes.white,
                                    fontSize: 14,
                                    letterSpacing: 1),
                              ),
                            ),
                          ),
                        )
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsetsGeometry.symmetric(vertical: 10),
                  child: Column(
                    spacing: 4,
                    children: [
                      FullnameWithAge(
                        userData: myUserData,
                        fontColor: ColorRes.black,
                        mainAxisAlignment: MainAxisAlignment.center,
                      ),
                      Text(
                        myUserData?.bio ?? '',
                        style: const TextStyle(
                            fontFamily: FontRes.regular,
                            fontSize: 16,
                            color: ColorRes.dimGrey3),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
                const SubscribeCard()
              ],
            )
          ],
        ),
      ),
    ));
  }
}
