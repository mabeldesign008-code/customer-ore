import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/button/custom_text_button.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/follow_following_screen/follow_following_screen.dart';
import 'package:orange_ui/screen/follow_following_screen/follow_following_screen_view_model.dart';
import 'package:orange_ui/screen/user_detail_screen/user_detail_screen_view_model.dart';
import 'package:orange_ui/service/extention/int_extention.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/style_res.dart';

class FollowStatsSection extends StatelessWidget {
  final UserDetailScreenViewModel model;
  final UserData? userData;

  const FollowStatsSection(
      {super.key, required this.model, required this.userData});

  @override
  Widget build(BuildContext context) {
    if (model.settingAppData?.isSocialMedia == 0) {
      return const SizedBox();
    }
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10.0, sigmaY: 10.0),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 10),
          decoration: BoxDecoration(
              color: ColorRes.davyGrey.withValues(alpha: 0.15),
              border:
                  Border.all(color: ColorRes.dimGrey7.withValues(alpha: 0.15)),
              borderRadius: BorderRadius.circular(50)),
          child: Row(
            spacing: 20,
            children: [
              VerticalColumnText(
                count: (userData?.following ?? 0).numberFormat,
                title: S.of(context).following,
                onTap: () {
                  Get.to(() => FollowFollowingScreen(
                      followFollowingType: FollowFollowingType.following,
                      userId: userData?.id ?? -1));
                },
              ),
              VerticalColumnText(
                count: (userData?.followers ?? 0).numberFormat,
                title: S.of(context).followers,
                onTap: () {
                  Get.to(() => FollowFollowingScreen(
                      followFollowingType: FollowFollowingType.follower,
                      userId: userData?.id ?? -1));
                },
              ),
              Expanded(
                child: userData?.id == model.myUserId
                    ? CustomTextButton(
                        onTap: model.onEditBtnClick,
                        title: S.current.edit.toUpperCase(),
                        cornerRadius: 30,
                        fontFamily: FontRes.bold,
                        bgColor: ColorRes.dimGrey7.withValues(alpha: 0.15),
                        fontSize: 12,
                      )
                    : FollowUnFollowBtn(model: model),
              )
            ],
          ),
        ),
      ),
    );
  }
}

class FollowUnFollowBtn extends StatelessWidget {
  final UserDetailScreenViewModel model;

  const FollowUnFollowBtn({super.key, required this.model});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: model.isFollowInProgress ? null : model.onFollowUnfollowBtnClick,
      child: Container(
        height: 50,
        padding: const EdgeInsets.symmetric(horizontal: 15),
        alignment: Alignment.center,
        decoration: ShapeDecoration(
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
            gradient: !model.isFollow ? StyleRes.linearGradient : null,
            color: model.isFollow
                ? ColorRes.dimGrey7.withValues(alpha: 0.15)
                : null),
        child: model.isFollowInProgress
            ? CommonUI.cupertinoIndicator()
            : Text(
                (model.isFollow ? S.current.unfollow : S.current.follow)
                    .toUpperCase(),
                style: const TextStyle(
                    fontFamily: FontRes.bold,
                    color: ColorRes.white,
                    fontSize: 12,
                    letterSpacing: 1.33),
              ),
      ),
    );
  }
}

class VerticalColumnText extends StatelessWidget {
  final String count;
  final String title;
  final VoidCallback onTap;

  const VerticalColumnText(
      {super.key,
      required this.count,
      required this.title,
      required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Column(
        children: [
          Text(count,
              style: TextStyle(
                  color: ColorRes.white.withValues(alpha: 0.8),
                  fontFamily: FontRes.bold,
                  fontSize: 22)),
          Text(title,
              style: TextStyle(
                  color: ColorRes.white.withValues(alpha: 0.8),
                  fontFamily: FontRes.medium,
                  fontSize: 15)),
        ],
      ),
    );
  }
}
