import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/feed_screen/feed_screen_view_model.dart';
import 'package:orange_ui/screen/feed_screen/widget/feed_story_bar.dart';
import 'package:orange_ui/screen/user_detail_screen/user_detail_screen.dart';
import 'package:orange_ui/service/session_manager.dart';

import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class PostTopArea extends StatelessWidget {
  final UserData? userData;
  final Function(MoreBtnValue value)? onSelected;
  final Function(UserData? userData) onProfilePictureClick;

  const PostTopArea(
      {super.key,
      required this.userData,
      required this.onSelected,
      required this.onProfilePictureClick});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 15, right: 15, bottom: 10),
      child: Row(
        children: [
          InkWell(
            onTap: () {
              if ((userData?.story ?? []).isEmpty) {
                Get.to(() => UserDetailScreen(userData: userData));
              } else {
                onProfilePictureClick(userData);
              }
            },
            child: StoryProfileView(
                userData: userData,
                widthHeight: 45,
                margin: EdgeInsets.zero,
                cornerRadius: 12,
                imageCorner: 10,
                borderWidth: 2),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: InkWell(
              onTap: () {
                Get.to(() => UserDetailScreen(userData: userData));
              },
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            Flexible(
                              child: Text(CommonUI.fullName(userData?.fullname),
                                  style: const TextStyle(
                                      color: ColorRes.darkGrey, fontFamily: FontRes.bold, fontSize: 18, height: 0),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis),
                            ),
                            const SizedBox(width: 5),
                            userData?.isVerified == 2 ? Image.asset(AssetRes.tickMark, height: 17.5) : const SizedBox(),
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),
                      Theme(
                        data: Theme.of(context).copyWith(
                          dividerTheme: const DividerThemeData(color: Colors.black, thickness: 10),
                          dividerColor: ColorRes.black,
                          iconTheme: const IconThemeData(color: Colors.white),
                          textTheme: const TextTheme().apply(bodyColor: Colors.white),
                        ),
                        child: PopupMenuButton<MoreBtnValue>(
                          onSelected: onSelected,
                          itemBuilder: (context) {
                            return <PopupMenuEntry<MoreBtnValue>>[
                              PopupMenuItem(
                                value: MoreBtnValue.share,
                                padding: const EdgeInsets.symmetric(vertical: 0),
                                child: Center(
                                  child: Text(S.of(context).share.capitalize ?? '',
                                      style: const TextStyle(
                                          fontFamily: FontRes.medium, fontSize: 15, color: ColorRes.dimGrey3)),
                                ),
                              ),
                              const PopupMenuItem(
                                height: 1,
                                padding: EdgeInsets.zero,
                                child: Divider(
                                    height: 1,
                                    thickness: 1,
                                    color: ColorRes.borderColor),
                              ),
                              PopupMenuItem(
                                value: userData?.id ==
                                        SessionManager.instance.getUserID()
                                    ? MoreBtnValue.delete
                                    : MoreBtnValue.report,
                                child: Center(
                                  child: Text(
                                    userData?.id ==
                                            SessionManager.instance.getUserID()
                                        ? S.of(context).delete
                                        : S.current.report,
                                    style: const TextStyle(
                                        fontFamily: FontRes.medium,
                                        fontSize: 15,
                                        color: ColorRes.themeColor),
                                  ),
                                ),
                              ),
                            ];
                          },
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(6),
                              side: const BorderSide(
                                  color: ColorRes.borderColor)),
                          surfaceTintColor: ColorRes.white,
                          color: ColorRes.white,
                          position: PopupMenuPosition.under,
                          child: Image.asset(AssetRes.icHorizontalThreeDot, height: 20, width: 20),
                        ),
                      )
                    ],
                  ),
                  Text(
                    CommonUI.userName(userData?.username),
                    style: const TextStyle(
                      color: ColorRes.lightGrey5,
                      fontFamily: FontRes.light,
                      fontSize: 15,
                    ),
                  )
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
