import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/button/custom_text_button.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/subscription_sheet/subscription_sheet.dart';
import 'package:orange_ui/screen/subscription_sheet/subscription_sheet_controller.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/service/subscription/subscription_manager.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/style_res.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

class SubscribeCard extends StatelessWidget {
  final VoidCallback? onNoThanksTap;

  const SubscribeCard({super.key, this.onNoThanksTap});

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<SubscriptionSheetController>();
    Package package = SubscriptionManager.shared.packages.first;
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(vertical: 10),
      padding: const EdgeInsets.symmetric(horizontal: 20),
      decoration: ShapeDecoration(
        shape: SmoothRectangleBorder(
          borderRadius:
              SmoothBorderRadius(cornerRadius: 20, cornerSmoothing: 1),
        ),
        gradient: StyleRes.linearGradient,
      ),
      child: Obx(
        () => Column(
          spacing: 10,
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            const SizedBox(height: 10),
            Column(
              children: [
                SubscribeText(isSubscribe.value
                    ? S.of(context).youAre
                    : S.of(context).subscribe),
                const PremiumText(),
                SubscribeText(isSubscribe.value
                    ? S.of(context).member
                    : '${S.of(context).upgradeExperience}!'),
                const SubscribeLine(),
              ],
            ),
            Column(
              spacing: 10,
              children: [
                if (SessionManager.instance.getSettings()?.appdata?.isDating ==
                    1)
                  SubscribeIconWithText(
                    title: S.of(context).getUnlimitedReverseSwipe,
                    color: ColorRes.white,
                  ),
                SubscribeIconWithText(
                  title: S.of(context).getVerifiedBadge,
                  color: ColorRes.white,
                ),
                SubscribeIconWithText(
                  title: S.of(context).adFreeExperience,
                  color: ColorRes.white,
                ),
                SubscribeIconWithText(
                  title: S.of(context).freeChat,
                  color: ColorRes.white,
                ),
              ],
            ),
            if (!isSubscribe.value &&
                SubscriptionManager.shared.packages.isNotEmpty)
              Column(
                spacing: 10,
                children: [
                  CustomTextButton(
                      onTap: () {
                        controller.onMakePurchase(package);
                      },
                      title:
                          '${S.of(context).upgradeFrom} ${package.storeProduct.priceString}',
                      bgColor: ColorRes.white,
                      textColor: ColorRes.themeColor,
                      height: 60),
                  InkWell(
                    onTap: onNoThanksTap,
                    child: Text(
                      S.of(context).noThanks,
                      style: const TextStyle(
                          fontFamily: FontRes.medium,
                          fontSize: 14,
                          color: ColorRes.white),
                    ),
                  )
                ],
              ),
            const SizedBox(height: 10),
          ],
        ),
      ),
    );
  }
}
