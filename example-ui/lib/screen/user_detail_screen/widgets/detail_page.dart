import 'dart:ui';

import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/button/custom_text_button.dart';
import 'package:orange_ui/common/fullname_with_age.dart';
import 'package:orange_ui/common/gradient_icon.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/user_detail_screen/user_detail_screen_view_model.dart';
import 'package:orange_ui/screen/user_detail_screen/widgets/follow_state_section.dart';
import 'package:orange_ui/screen/user_detail_screen/widgets/hide_more_info_button.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/style_res.dart';

class DetailPage extends StatelessWidget {
  final UserDetailScreenViewModel model;

  final VoidCallback onHideBtnTap;

  const DetailPage(
      {super.key, required this.onHideBtnTap, required this.model});

  @override
  Widget build(BuildContext context) {
    UserData? userData = model.otherUserData;
    bool isDating = model.settingAppData?.isDating == 1;
    return Container(
      margin: const EdgeInsets.only(top: 15),
      child: Stack(
        alignment: Alignment.topCenter,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 15),
            child: ClipSmoothRect(
              radius: const SmoothBorderRadius.vertical(
                  top: SmoothRadius(cornerRadius: 30, cornerSmoothing: 1)),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaY: 20, sigmaX: 20),
                child: Container(
                  width: Get.width,
                  height: Get.height,
                  padding: const EdgeInsets.fromLTRB(21, 20, 21, 0),
                  decoration: BoxDecoration(
                    color: ColorRes.black.withValues(alpha: 0.33),
                    borderRadius:
                        const BorderRadius.vertical(top: Radius.circular(30)),
                  ),
                  child: SingleChildScrollView(
                      child: SafeArea(
                    top: false,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      spacing: 20,
                      children: [
                        const SizedBox(height: 10),

                        FollowStatsSection(model: model, userData: userData),
                        UserProfileDetailSection(
                            model: model, userData: userData),

                        // Relationship Goals
                        if (isDating && (userData?.relationshipGoalId ?? 0) > 0)
                          labeledTagList(
                            title: S.current.relationshipGoals,
                            items: [userData?.relationShipGoal ?? ''],
                          ),

                        // Interests
                        if ((userData?.interestList.isNotEmpty ?? false))
                          labeledTagList(
                            title: S.current.interest,
                            items: userData!.interestList,
                          ),

                        // Religion
                        if (isDating &&
                            (userData?.religionKey?.isNotEmpty ?? false))
                          labeledTagList(
                            title: S.current.religion,
                            items: [userData!.religionKey!],
                          ),

                        // Languages
                        if (isDating &&
                            (userData?.languageList.isNotEmpty ?? false))
                          labeledTagList(
                            title: S.of(context).languagesIKnow,
                            items: userData!.languageList,
                          ),

                        // Social Links
                        if (userData?.socialLinks.isNotEmpty ?? false)
                          socialLinksView(
                            title: S.of(context).socialLinks,
                            items: userData!.socialLinks,
                          ),

                        // Chat button
                        if (model.myUserId != userData?.id)
                          CustomTextButton(
                            onTap: model.onChatBtnTap,
                            title:
                                '${S.current.chatWith} ${userData?.fullname?.toUpperCase() ?? ''}',
                            bgColor: ColorRes.white,
                            textColor: ColorRes.themeColor,
                            fontFamily: FontRes.bold,
                            fontSize: 12,
                            cornerRadius: 10,
                          ),

                        // Share Profile
                        CustomTextButton(
                          onTap: model.onShareProfileBtnTap,
                          title:
                              '${S.current.share} ${userData?.fullname?.toUpperCase() ?? ''}\'S ${S.current.profileCap}',
                          bgColor: ColorRes.dimGrey7.withValues(alpha: 0.25),
                          textColor: ColorRes.white,
                          fontFamily: FontRes.bold,
                          fontSize: 12,
                          cornerRadius: 10,
                        ),

                        // Report
                        if (model.myUserId != userData?.id)
                          Center(
                            child: InkWell(
                              onTap: model.onReportTap,
                              child: Text(
                                '${S.current.reportCap} ${userData?.fullname?.toUpperCase() ?? ''}',
                                style: TextStyle(
                                  color: ColorRes.white.withValues(alpha: 0.50),
                                  fontSize: 12,
                                  fontFamily: FontRes.bold,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  )),
                ),
              ),
            ),
          ),
          HideMoreInfoButton(onHideBtnTap: onHideBtnTap, isMoreInfo: true),
        ],
      ),
    );
  }

  Widget labeledTagList({required String title, required List<String> items}) {
    if (items.isEmpty) return const SizedBox();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
              color: ColorRes.white, fontFamily: FontRes.bold, fontSize: 17),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 5,
          runSpacing: 5,
          children: List.generate(items.length, (index) {
            return FittedBox(
              child: Container(
                height: 37,
                padding: const EdgeInsets.symmetric(horizontal: 15),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: ColorRes.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(50),
                ),
                child: Text(
                  items[index].trim(),
                  style: const TextStyle(
                      fontSize: 14,
                      color: ColorRes.white,
                      letterSpacing: 0.5,
                      fontFamily: FontRes.medium),
                ),
              ),
            );
          }),
        ),
      ],
    );
  }

  Widget socialLinksView(
      {required String title, required List<SocialLink> items}) {
    if (items.isEmpty) {
      return const SizedBox();
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      spacing: 10,
      children: [
        Text(
          title,
          style: const TextStyle(
              color: ColorRes.white, fontFamily: FontRes.bold, fontSize: 17),
        ),
        Wrap(
          spacing: 5,
          children: List.generate(
            items.length,
            (index) {
              SocialLink link = items[index];
              return InkWell(
                onTap: () {},
                child: FittedBox(
                  child: Container(
                    height: 37,
                    padding: const EdgeInsets.symmetric(horizontal: 15),
                    decoration: BoxDecoration(
                        color: ColorRes.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(50)),
                    child: Row(
                      spacing: 5,
                      children: [
                        Image.asset(link.icon, height: 15, width: 15),
                        Text(
                          link.title.capitalize ?? '',
                          style: const TextStyle(
                              fontSize: 14,
                              color: ColorRes.white,
                              letterSpacing: 0.5,
                              fontFamily: FontRes.medium),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 10),
      ],
    );
  }
}

class UserProfileDetailSection extends StatelessWidget {
  final UserDetailScreenViewModel model;
  final UserData? userData;

  const UserProfileDetailSection(
      {super.key, required this.model, required this.userData});

  @override
  Widget build(BuildContext context) {
    if (userData == null) return const SizedBox();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      spacing: 20,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: 5,
          children: [
            Row(
              children: [
                Expanded(
                    child: FullnameWithAge(userData: userData, fontSize: 22)),
                if (model.myUserId != userData?.id)
                  InkWell(
                    borderRadius: BorderRadius.circular(30),
                    onTap: model.onSaveTap,
                    child: Container(
                      height: 37,
                      width: 37,
                      padding: const EdgeInsets.all(10),
                      decoration: const BoxDecoration(
                        color: ColorRes.white,
                        shape: BoxShape.circle,
                      ),
                      child: GradientIcon(
                        gradient: model.otherUserData!.isSaved
                            ? null
                            : StyleRes.linearDimGrey,
                        child: Image.asset(
                          AssetRes.save,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            Text(
              userData?.bio ?? '',
              style: TextStyle(
                  color: ColorRes.white.withValues(alpha: 0.80), fontSize: 14),
            ),
          ],
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: 10,
          children: [
            RowIconWithTitle(
                icon: AssetRes.home, title: userData?.address ?? ''),
            if (userData?.id != model.myUserId &&
                model.settingAppData?.isDating == 1)
              RowIconWithTitle(
                  icon: AssetRes.locationPin,
                  title:
                      '${userData?.locationDistance} ${S.of(context).kmsAway}'),
          ],
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: 5,
          children: [
            Text(
              S.current.about,
              style: const TextStyle(
                  color: ColorRes.white,
                  fontFamily: FontRes.bold,
                  fontSize: 17),
            ),
            Text(
              userData?.about ?? S.current.noDataAvailable,
              style: TextStyle(
                  color: ColorRes.white.withValues(alpha: 0.80), fontSize: 14),
            ),
          ],
        )
      ],
    );
  }
}

class RowIconWithTitle extends StatelessWidget {
  final String icon;
  final String title;

  const RowIconWithTitle({super.key, required this.icon, required this.title});

  @override
  Widget build(BuildContext context) {
    if (title.isEmpty) {
      return const SizedBox();
    }
    return Row(
      children: [
        Container(
          height: 28,
          width: 28,
          padding: const EdgeInsets.all(6),
          decoration: const BoxDecoration(
            color: ColorRes.white,
            shape: BoxShape.circle,
          ),
          alignment: Alignment.center,
          child: Image.asset(icon,
              color: ColorRes.themeColor, height: 15, width: 15),
        ),
        const SizedBox(width: 7),
        Flexible(
          child: Text(
            title,
            style: TextStyle(
                color: ColorRes.white.withValues(alpha: 0.80),
                fontSize: 14,
                fontFamily: FontRes.semiBold),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
