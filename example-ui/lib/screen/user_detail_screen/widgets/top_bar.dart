import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/fullname_with_age.dart';
import 'package:orange_ui/screen/user_detail_screen/user_detail_screen_view_model.dart';
import 'package:orange_ui/service/session_manager.dart';

import 'package:orange_ui/utils/app_res.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class TopBar extends StatelessWidget {
  final UserDetailScreenViewModel model;

  const TopBar({super.key, required this.model});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 15),
          height: 55,
          decoration: ShapeDecoration(
              shape: SmoothRectangleBorder(
                  borderRadius:
                      SmoothBorderRadius(cornerRadius: 10, cornerSmoothing: 1)),
              color: ColorRes.black.withValues(alpha: 0.33)),
          child: Row(
            children: [
              IconButton(
                onPressed: model.onBackTap,
                icon:
                    const Icon(CupertinoIcons.back, color: ColorRes.themeColor),
              ),
              const SizedBox(width: 10),
              Flexible(
                child: FullnameWithAge(
                  userData: model.otherUserData,
                  fontSize: 16,
                  mainAxisAlignment: MainAxisAlignment.center,
                ),
              ),
              const SizedBox(width: 20),
              Visibility(
                visible: SessionManager.instance.getUserID() !=
                    model.otherUserData?.id,
                replacement: const SizedBox(width: 24, height: 24),
                child: Visibility(
                  visible: !model.moreInfo,
                  replacement: IconButton(
                    onPressed: Get.back,
                    icon: const Icon(
                      CupertinoIcons.back,
                      color: ColorRes.transparent,
                    ),
                  ),
                  child: PopupMenuButton<String>(
                    onSelected: (value) => model.onMoreBtnTap(value),
                    color: ColorRes.black.withValues(alpha: 0.9),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                    itemBuilder: (BuildContext context) {
                      return {model.blockUnBlock, AppRes.report}.map(
                        (String choice) {
                          return PopupMenuItem<String>(
                            value: choice,
                            textStyle: const TextStyle(
                                fontFamily: FontRes.medium,
                                color: ColorRes.white),
                            child: Text(
                              choice,
                              style: const TextStyle(
                                  fontFamily: FontRes.medium,
                                  color: ColorRes.white),
                            ),
                          );
                        },
                      ).toList();
                    },
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 9),
                      child: Image.asset(AssetRes.moreHorizontal,
                          height: 10, width: 30, fit: BoxFit.cover),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
