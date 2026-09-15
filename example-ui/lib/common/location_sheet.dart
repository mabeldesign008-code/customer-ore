import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/common/button/custom_text_button.dart';
import 'package:orange_ui/common/common_fun.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/utils/app_res.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class LocationSheet extends StatelessWidget {
  const LocationSheet({super.key});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      children: [
        Container(
            width: double.infinity,
            decoration: const ShapeDecoration(
                color: ColorRes.white,
                shape: SmoothRectangleBorder(
                    borderRadius: SmoothBorderRadius.vertical(
                        top: SmoothRadius(
                            cornerRadius: 30, cornerSmoothing: 1)))),
            padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 15),
            child: SafeArea(
              child: Column(
                spacing: 15,
                children: [
                  Image.asset(AssetRes.icLocationPermission,
                      width: 230, height: 230),
                  const SizedBox(height: 15),
                  Column(
                    spacing: 10,
                    children: [
                      Text(S.of(context).allowLocationAccess,
                          style: const TextStyle(
                              color: ColorRes.darkGrey,
                              fontSize: 25,
                              fontFamily: FontRes.bold)),
                      Text(
                          S
                              .of(context)
                              .allowOrangeToAccessYourLocationToFindMatchesNearby
                              .trParams({'appname': AppRes.appName}),
                          style: const TextStyle(
                              color: ColorRes.grey,
                              fontSize: 20,
                              fontFamily: FontRes.regular),
                          textAlign: TextAlign.center),
                      const SizedBox(height: 1),
                    ],
                  ),
                  CustomTextButton(
                      onTap: () async {
                        CommonUI.lottieLoader();
                            await CommonFun.getUserCurrentLocation();
                        Get.back();
                        Get.back();
                      },
                      title: S.of(context).allowPermission),
                  InkWell(
                    onTap: () {
                      Get.back();
                      ApiProvider().getIPPlaceDetail(onCompletion: (detail) {
                        ApiProvider().updateProfile(
                            latitude: detail.lat?.toStringAsFixed(2),
                            longitude: detail.lon?.toStringAsFixed(2));
                      });
                    },
                    child: Text(S.of(context).iWillDoItLater,
                        style: const TextStyle(
                            color: ColorRes.themeColor,
                            fontSize: 16,
                            fontFamily: FontRes.bold),
                        textAlign: TextAlign.center),
                  ),
                ],
              ),
            )),
      ],
    );
  }
}
