import 'package:flutter/material.dart';
import 'package:orange_ui/common/custom_image.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class UserCard extends StatelessWidget {
  final UserActionType actionType;
  final UserData userData;
  final Function(UserData user)? onUserTap;
  final Function(UserData user)? onActionButtonTap;

  const UserCard({
    super.key,
    required this.userData,
    this.onUserTap,
    this.onActionButtonTap,
    required this.actionType,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () {
        onUserTap?.call(userData);
      },
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 2),
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 10),
        decoration: const BoxDecoration(color: ColorRes.lightGrey2),
        child: Row(
          children: [
            CustomImage(
                image: userData.profileImage,
                fullname: userData.fullname,
                height: 40,
                radius: 50,
                width: 40),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(userData.fullname ?? 'Unknown',
                            style: const TextStyle(
                              color: ColorRes.darkGrey,
                              fontSize: 18,
                              overflow: TextOverflow.ellipsis,
                              fontFamily: FontRes.bold,
                            ),
                            maxLines: 1),
                      ),
                      const SizedBox(width: 3),
                      Text(
                        "${userData.age}",
                        style: const TextStyle(
                            color: ColorRes.darkGrey,
                            fontSize: 18,
                            overflow: TextOverflow.ellipsis),
                        maxLines: 1,
                      ),
                      const SizedBox(width: 3),
                      userData.isVerified == 2
                          ? Image.asset(AssetRes.tickMark,
                              height: 18, width: 18)
                          : const SizedBox(),
                    ],
                  ),
                  Text(userData.address,
                      style: const TextStyle(
                          color: ColorRes.darkGrey9,
                          fontSize: 13,
                          overflow: TextOverflow.ellipsis),
                      maxLines: 1),
                ],
              ),
            ),
            const SizedBox(width: 10),
            TextButton(
              onPressed: () {
                onActionButtonTap?.call(userData);
              },
              style: ButtonStyle(
                maximumSize: WidgetStateProperty.all(const Size(100, 100)),
                backgroundColor: WidgetStateProperty.all(
                  ColorRes.themeColor.withValues(alpha: 0.1),
                ),
                shape: WidgetStateProperty.all(
                  RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8)),
                ),
              ),
              child: Text(
                getActionText,
                style: const TextStyle(
                  fontFamily: FontRes.bold,
                  color: ColorRes.themeColor,
                ),
              ),
            )
          ],
        ),
      ),
    );
  }

  String get getActionText {
    switch (actionType) {
      case UserActionType.block:
        return S.current.unBlock;
      case UserActionType.hide:
        return S.current.show;
    }
  }
}

enum UserActionType {
  block,
  hide;
}
