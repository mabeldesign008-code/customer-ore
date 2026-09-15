import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/blocked_profiles_screen/blocked_profiles_screen.dart';
import 'package:orange_ui/screen/hidden_profile_screen/hidden_profile_screen.dart';
import 'package:orange_ui/screen/languages_screen/languages_screen.dart';
import 'package:orange_ui/screen/like_profiles_screen/like_profiles_screen.dart';
import 'package:orange_ui/screen/options_screen/options_screen.dart';
import 'package:orange_ui/screen/options_screen/options_screen_view_model.dart';
import 'package:orange_ui/screen/options_screen/widgets/subscription_button.dart';
import 'package:orange_ui/screen/preference_screen/preference_screen.dart';
import 'package:orange_ui/screen/saved_profiles_screen/saved_profiles_screen.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/style_res.dart';

class OptionsCenterArea extends StatelessWidget {
  final OptionalScreenViewModel model;

  const OptionsCenterArea({super.key, required this.model});

  @override
  Widget build(BuildContext context) {
    UserData? userData = model.userData;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SubscriptionButton(),
        TopOptionCard(
          title: S.current.livestream,
          onTap: model.onLiveStreamTap,
          image: AssetRes.sun,
          iconPadding: 0,
          iconColor: null,
          bgColor: ColorRes.transparent,
        ),
        if (userData?.isVerified == 0)
          TopOptionCard(
            title: S.current.verification,
            onTap: model.onApplyForVerTap,
            image: AssetRes.tickMark,
            iconPadding: 0,
            iconColor: ColorRes.blueTick,
            bgColor: ColorRes.transparent,
          ),
        if (userData?.isVerified == 1)
          EligibilityStatusCard(
            icon: AssetRes.tickMark,
            title: S.current.liveVerification.capitalizeFirst ?? '',
              status: userData?.isVerified ?? 0),
        TopOptionCard(
            onTap: () {
              Get.to(() => const LanguagesScreen());
            },
            title: S.current.appLanguages,
            image: AssetRes.icLanguage,
            isCircleImage: true),
        TopOptionCard(
            onTap: () {
              Get.to(() => const SavedProfilesScreen());
            },
            title: S.current.savedProfiles,
            image: AssetRes.icBookMark,
            isCircleImage: true),
        TopOptionCard(
            onTap: () {
              Get.to(() => const BlockedProfilesScreen());
            },
            title: S.of(context).blockedProfiles,
            image: AssetRes.icBlock,
            isCircleImage: true),
        if (model.settingData?.appdata?.isDating == 1) ...[
          TopOptionCard(
              onTap: () {
                Get.to(() => const LikeProfilesScreen());
              },
              title: S.current.likeProfiles,
              image: AssetRes.icFillFav,
              isCircleImage: true),
          TopOptionCard(
              onTap: () {
                Get.to(() => const HiddenProfileScreen());
              },
              title: S.of(context).hiddenProfile,
              image: AssetRes.icHide,
              isCircleImage: true,
              iconColor: ColorRes.themeColor),
          TopOptionCard(
              onTap: () {
                Get.to(() => const PreferenceScreen());
              },
              title: S.of(context).matchPreference,
              image: AssetRes.icPreference,
              isCircleImage: true,
              iconColor: ColorRes.themeColor),
        ],
        Padding(
            padding: const EdgeInsets.only(top: 18, bottom: 9),
            child: OptionsScreenHeading(title: S.current.privacy)),
        PermissionTiles(
            title: S.current.pushNotification,
            subTitle: S.current.notificationData,
            enable: userData?.isNotification == 1,
            onTap: model.onNotificationTap),
        PermissionTiles(
            title: S.current.switchMap,
            subTitle: S.current.switchMapData,
            enable: userData?.showOnMap == 1,
            onTap: model.onShowMeOnMapTap),
        PermissionTiles(
            title: S.current.anonymous,
            subTitle: S.current.anonymousData,
            enable: userData?.anonymous == 1,
            onTap: model.onGoAnonymousTap),
      ],
    );
  }
}

class PermissionTiles extends StatelessWidget {
  final String title;
  final String subTitle;
  final bool enable;
  final VoidCallback onTap;

  const PermissionTiles({super.key,
    required this.title,
    required this.subTitle,
    required this.enable,
    required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: Get.width,
      margin: const EdgeInsets.only(top: 3, bottom: 3),
      padding: const EdgeInsets.fromLTRB(14, 14, 8, 18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        color: ColorRes.grey10,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 15,
                  color: ColorRes.davyGrey,
                  fontFamily: FontRes.semiBold,
                ),
              ),
              const SizedBox(height: 3),
              SizedBox(
                width: Get.width - 90,
                child: Text(
                  subTitle,
                  style: const TextStyle(
                    color: ColorRes.grey20,
                  ),
                ),
              ),
            ],
          ),
          InkWell(
            borderRadius: BorderRadius.circular(30),
            onTap: onTap,
            child: Container(
              height: 25,
              width: 36,
              padding: const EdgeInsets.symmetric(horizontal: 3.5),
              alignment: enable ? Alignment.centerRight : Alignment.centerLeft,
              decoration: BoxDecoration(
                color: ColorRes.grey,
                borderRadius: BorderRadius.circular(30),
                gradient: enable ? StyleRes.linearGradient : null,
              ),
              child: Container(
                height: 19,
                width: 19,
                decoration: const BoxDecoration(
                    color: ColorRes.white, shape: BoxShape.circle),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class TopOptionCard extends StatelessWidget {
  final VoidCallback onTap;
  final String title;
  final String image;
  final bool isCircleImage;
  final double? iconPadding;
  final Color? iconColor;
  final Color? bgColor;

  const TopOptionCard({
    super.key,
    required this.onTap,
    required this.title,
    required this.image,
    this.isCircleImage = false,
    this.iconPadding,
    this.iconColor,
    this.bgColor,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        height: 49,
        margin: const EdgeInsets.symmetric(vertical: 3),
        width: MediaQuery.of(context).size.width,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          color: ColorRes.grey10,
        ),
        child: Row(
          children: [
            Container(
              padding: EdgeInsets.all(iconPadding ?? 6),
              height: 28,
              width: 28,
              alignment: Alignment.center,
              margin: const EdgeInsets.symmetric(horizontal: 10),
              decoration: BoxDecoration(
                  color: bgColor ?? ColorRes.themeColor.withValues(alpha: 0.1),
                  shape: BoxShape.circle),
              child: Image.asset(
                image,
                height: 28,
                width: 28,
                color: iconColor ?? ColorRes.themeColor,
              ),
            ),
            Expanded(
                child: Text(title,
                    style: const TextStyle(
                      color: ColorRes.davyGrey,
                      fontSize: 15,
                      fontFamily: FontRes.semiBold,
                    ),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1)),
          ],
        ),
      ),
    );
  }
}

class EligibilityStatusCard extends StatelessWidget {
  final int status;
  final String icon;
  final String title;
  final String? fontFamily;
  final double? fontSize;

  const EligibilityStatusCard(
      {super.key,
      required this.status,
      required this.icon,
      required this.title,
      this.fontFamily,
      this.fontSize});

  @override
  Widget build(BuildContext context) {
    return Visibility(
      visible: true,
      child: Stack(
        children: [
          Container(
            height: 54,
            width: Get.width,
            margin: const EdgeInsets.only(top: 3, bottom: 3),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(15),
              child: Image.asset(AssetRes.map1),
            ),
          ),
          Container(
            height: 54,
            width: Get.width,
            margin: const EdgeInsets.only(top: 3, bottom: 3),
            decoration: BoxDecoration(
              color: ColorRes.darkGrey5.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(15),
            ),
          ),
          Container(
            height: 54,
            width: Get.width,
            margin: const EdgeInsets.only(top: 3, bottom: 3),
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(15),
              child: BackdropFilter(
                filter: ImageFilter.blur(
                    sigmaY: 15, sigmaX: 15, tileMode: TileMode.mirror),
                child: Row(
                  spacing: 10,
                  children: [
                    Image.asset(icon, height: 28, width: 28),
                    Expanded(
                      child: Text(title,
                          style: TextStyle(
                            color: ColorRes.davyGrey,
                            fontSize: fontSize ?? 15,
                            fontFamily: fontFamily ?? FontRes.semiBold,
                          ),
                          overflow: TextOverflow.ellipsis,
                          maxLines: 1),
                    ),
                    Container(
                      height: 36,
                      width: 112,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(30),
                        color: status == 0
                            ? ColorRes.themeColor.withValues(alpha: 0.20)
                            : status == 1
                                ? ColorRes.lightOrange.withValues(alpha: 0.20)
                                : ColorRes.lightGreen.withValues(alpha: 0.20),
                      ),
                      child: Center(
                        child: Text(
                          status == 0
                              ? S.current.notEligible
                              : status == 1
                                  ? S.current.pending
                                  : S.current.eligible,
                          style: TextStyle(
                            fontSize: 12,
                            color: status == 0
                                ? ColorRes.themeColor
                                : status == 1
                                    ? ColorRes.lightOrange
                                    : ColorRes.green2,
                            fontFamily: FontRes.semiBold,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ),
                    )
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
