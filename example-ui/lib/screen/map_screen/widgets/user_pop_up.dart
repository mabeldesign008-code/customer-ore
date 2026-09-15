import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/common/custom_image.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/user_detail_screen/user_detail_screen.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/style_res.dart';

class UserPopUp extends StatelessWidget {
  final UserData? user;

  const UserPopUp({super.key, required this.user});

  @override
  Widget build(BuildContext context) {
    return Dialog(
        elevation: 1,
        insetPadding: const EdgeInsets.symmetric(horizontal: 70),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: AspectRatio(
          aspectRatio: 0.8,
          child: Container(
            decoration: BoxDecoration(
                color: Colors.grey.shade200.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(20)),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 10.0, sigmaY: 10.0),
                child: Column(
                  children: [
                    const Spacer(flex: 2),
                    CustomImage(
                        image: user?.profileImage,
                        fullname: user?.fullname,
                        height: 50,
                        width: 50,
                        radius: 50),
                    const Spacer(),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20.0),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Flexible(
                            child: Text(
                              CommonUI.fullName(user?.fullname),
                              style: const TextStyle(
                                color: ColorRes.darkGrey5,
                                fontSize: 18,
                                fontFamily: FontRes.bold,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Text(
                            '  ${user?.age ?? 0}',
                            style: const TextStyle(
                              color: ColorRes.darkGrey5,
                              fontSize: 18,
                            ),
                          ),
                          const SizedBox(width: 3),
                          user?.isVerified == 0
                              ? const SizedBox()
                              : Image.asset(AssetRes.tickMark,
                                  height: 16.5, width: 16.5),
                        ],
                      ),
                    ),
                    Text(
                      user?.address ?? '',
                      style: const TextStyle(
                        color: ColorRes.grey19,
                        fontSize: 14,
                      ),
                      overflow: TextOverflow.ellipsis,
                      maxLines: 1,
                    ),
                    const Spacer(),
                    InkWell(
                      borderRadius: BorderRadius.circular(20),
                      onTap: () {
                        Get.back();
                        Get.to(() => UserDetailScreen(userData: user));
                      },
                      child: Container(
                        height: 38,
                        width: 127,
                        padding: const EdgeInsets.only(top: 2),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(20),
                          gradient: StyleRes.linearGradient,
                        ),
                        child: Center(
                          child: Text(
                            S.current.moreInfo,
                            style: const TextStyle(
                              color: ColorRes.white,
                              fontFamily: FontRes.bold,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const Spacer(),
                    InkWell(
                      onTap: () {
                        Get.back();
                      },
                      child: Text(
                        S.current.cancel,
                        style: const TextStyle(
                            color: ColorRes.grey20, fontSize: 15),
                      ),
                    ),
                    const Spacer(flex: 2),
                  ],
                ),
              ),
            ),
          ),
        ));
  }
}
