import 'dart:ui';

import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/common/custom_image.dart';
import 'package:orange_ui/common/fullname_with_age.dart';
import 'package:orange_ui/common/gradient_widget.dart';
import 'package:orange_ui/common/top_story_line.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/shimmer_screen/shimmer_screen.dart';
import 'package:orange_ui/service/extention/string_extention.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:shimmer/shimmer.dart';

class ProfileImageArea extends StatelessWidget {
  final UserData? userData;
  final PageController pageController;
  final VoidCallback onEditProfileTap;
  final VoidCallback onImageTap;
  final VoidCallback onMoreBtnTap;
  final VoidCallback onInstagramTap;
  final VoidCallback onFacebookTap;
  final VoidCallback onYoutubeTap;
  final bool isLoading;
  final bool isVerified;
  final bool Function(String? value) isSocialBtnVisible;

  const ProfileImageArea(
      {super.key,
      this.userData,
      required this.pageController,
      required this.onEditProfileTap,
      required this.onMoreBtnTap,
      required this.onImageTap,
      required this.onInstagramTap,
      required this.onFacebookTap,
      required this.onYoutubeTap,
      required this.isLoading,
      required this.isVerified,
      required this.isSocialBtnVisible});

  @override
  Widget build(BuildContext context) {
    return isLoading && userData == null
        ? fullImageView()
        : Container(
            margin:
                const EdgeInsets.only(left: 21, top: 10, right: 21, bottom: 20),
            child: InkWell(
              onTap: onImageTap,
              child: Stack(
                children: [
                  (userData?.images ?? []).isEmpty
                      ? CommonUI.profileImagePlaceHolder(
                          name: userData?.fullname,
                          heightWidth: MediaQuery.of(context).size.height,
                          borderRadius: 20)
                      : ClipSmoothRect(
                          radius: SmoothBorderRadius(
                              cornerRadius: 20, cornerSmoothing: 1),
                          child: PageView.builder(
                            controller: pageController,
                            itemCount: userData?.images?.length ?? 0,
                            physics: const ClampingScrollPhysics(),
                            itemBuilder: (context, index) {
                              Images image = (userData?.images ?? [])[index];
                              return CustomImage(
                                  image: image.image?.addBaseURL() ?? '',
                                  fullname: userData?.fullname,
                                  height: Get.height - 256,
                                  width: Get.width,
                                  radius: 20);
                            },
                          ),
                        ),
                  Column(
                    children: [
                      const SizedBox(height: 14),
                      TopStoryLine(
                          imageLength: (userData?.images ?? []).length,
                          pageController: pageController),
                      const Spacer(),
                      Padding(
                        padding: const EdgeInsets.only(left: 10),
                        child: Row(
                          children: [
                            socialIcon(
                                AssetRes.instagramLogo,
                                15,
                                onInstagramTap,
                                isSocialBtnVisible(userData?.instagram)),
                            socialIcon(
                                AssetRes.facebookLogo,
                                21.0,
                                onFacebookTap,
                                isSocialBtnVisible(userData?.facebook)),
                            socialIcon(
                                AssetRes.youtubeLogo,
                                20.16,
                                onYoutubeTap,
                                isSocialBtnVisible(userData?.youtube)),
                          ],
                        ),
                      ),
                      Padding(
                        padding:
                            const EdgeInsets.only(left: 10, right: 10, top: 7),
                        child: ClipSmoothRect(
                          radius: SmoothBorderRadius(
                              cornerRadius: 1, cornerSmoothing: 1),
                          child: BackdropFilter(
                            filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
                            child: Container(
                              width: Get.width,
                              padding: const EdgeInsets.fromLTRB(13, 9, 13, 12),
                              decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(10),
                                  color: ColorRes.black.withValues(alpha: 0.4)),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  FullnameWithAge(
                                      userData: userData,
                                      fontSize: 20,
                                      iconSize: 20),
                                  Row(
                                    children: [
                                      GradientWidget(
                                        child: Image.asset(AssetRes.locationPin,
                                            height: 13.5, width: 10.5),
                                      ),
                                      const SizedBox(width: 6),
                                      Expanded(
                                        child: Text(
                                          userData?.address ?? '',
                                          style: const TextStyle(
                                              color: ColorRes.white,
                                              fontSize: 11,
                                              fontFamily: FontRes.regular),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 7),
                                  Text(userData?.bio ?? '',
                                      style: const TextStyle(
                                          color: ColorRes.white, fontSize: 12),
                                      overflow: TextOverflow.ellipsis,
                                      maxLines: 3),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: onEditProfileTap,
                              child: Container(
                                margin:
                                    const EdgeInsets.symmetric(horizontal: 10),
                                child: ClipSmoothRect(
                                  radius: SmoothBorderRadius(
                                      cornerRadius: 10, cornerSmoothing: 1),
                                  child: BackdropFilter(
                                    filter:
                                        ImageFilter.blur(sigmaY: 6, sigmaX: 6),
                                    child: Container(
                                      height: 48,
                                      decoration: BoxDecoration(
                                          borderRadius:
                                              BorderRadius.circular(10),
                                          color: ColorRes.black
                                              .withValues(alpha: 0.4)),
                                      alignment: Alignment.center,
                                      child: Text(
                                        S.current.editProfile,
                                        style: TextStyle(
                                          color: ColorRes.white
                                              .withValues(alpha: 0.86),
                                          letterSpacing: 0.8,
                                          fontFamily: FontRes.bold,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.only(right: 10),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(10),
                              onTap: onMoreBtnTap,
                              child: ClipSmoothRect(
                                radius: SmoothBorderRadius(
                                    cornerRadius: 10, cornerSmoothing: 1),
                                child: BackdropFilter(
                                  filter:
                                      ImageFilter.blur(sigmaY: 6, sigmaX: 6),
                                  child: Container(
                                    height: 48,
                                    width: 56,
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(10),
                                      color:
                                          ColorRes.black.withValues(alpha: 0.4),
                                    ),
                                    child: Center(
                                      child: Image.asset(
                                        AssetRes.moreHorizontal,
                                        color: ColorRes.white,
                                        fit: BoxFit.cover,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 9),
                    ],
                  ),
                ],
              ),
            ),
          );
  }

  Widget socialIcon(
      String icon, double size, VoidCallback onSocialIconTap, bool isVisible) {
    return Visibility(
      visible: isVisible,
      child: InkWell(
        onTap: onSocialIconTap,
        child: Container(
          height: 29,
          width: 29,
          margin: const EdgeInsets.only(right: 7),
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            color: ColorRes.white,
          ),
          child: Center(
            child: Image.asset(icon, height: size, width: size),
          ),
        ),
      ),
    );
  }

  Widget fullImageView() {
    return Container(
      margin: const EdgeInsets.only(left: 21, top: 10, right: 21, bottom: 20),
      child: Stack(
        children: [
          ShimmerScreen.rectangular(
            width: double.infinity,
            height: Get.height,
            shapeBorder: SmoothRectangleBorder(
                borderRadius:
                    SmoothBorderRadius(cornerRadius: 21, cornerSmoothing: 1)),
          ),
          Align(
            alignment: Alignment.topCenter,
            child: Padding(
              padding: const EdgeInsets.only(top: 10, left: 15, right: 15),
              child: Shimmer(
                gradient: const LinearGradient(
                  colors: [
                    Colors.white24,
                    Colors.white38,
                    Colors.white54,
                  ],
                  stops: [
                    0.3,
                    0.6,
                    0.9,
                  ],
                  begin: Alignment(-1.0, -0.3),
                  end: Alignment(1.0, 0.3),
                  tileMode: TileMode.mirror,
                ),
                direction: ShimmerDirection.ltr,
                child: Container(
                  width: double.infinity,
                  height: 5,
                  decoration: ShapeDecoration(
                      color: ColorRes.white,
                      shape: SmoothRectangleBorder(
                          borderRadius: SmoothBorderRadius(
                              cornerRadius: 4, cornerSmoothing: 1))),
                ),
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Column(
              children: [
                const Spacer(),
                Align(
                  alignment: Alignment.bottomCenter,
                  child: Container(
                    height: 90,
                    margin:
                        const EdgeInsets.only(right: 15, left: 15, bottom: 10),
                    padding: const EdgeInsets.all(5),
                    width: double.infinity,
                    decoration: BoxDecoration(
                        color: ColorRes.white.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(10)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(top: 5),
                          child: ShimmerScreen.rectangular(
                            height: 20,
                            width: 200,
                            shapeBorder: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(4)),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.only(top: 5, bottom: 5),
                          child: ShimmerScreen.rectangular(
                            height: 15,
                            width: 175,
                            shapeBorder: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(4)),
                          ),
                        ),
                        const Padding(
                          padding: EdgeInsets.only(right: 5),
                          child: ShimmerScreen.rectangular(
                            height: 10,
                            width: double.infinity,
                            shapeBorder: RoundedRectangleBorder(
                              borderRadius: BorderRadius.only(
                                topLeft: Radius.circular(5),
                                topRight: Radius.circular(5),
                                bottomRight: Radius.circular(5),
                              ),
                            ),
                          ),
                        ),
                        const ShimmerScreen.rectangular(
                          height: 10,
                          width: 200,
                          shapeBorder: RoundedRectangleBorder(
                            borderRadius: BorderRadius.all(
                              Radius.circular(0),
                            ),
                          ),
                        ),
                        const ShimmerScreen.rectangular(
                          height: 10,
                          width: 250,
                          shapeBorder: RoundedRectangleBorder(
                            borderRadius: BorderRadius.only(
                              bottomLeft: Radius.circular(5),
                              topRight: Radius.circular(5),
                              bottomRight: Radius.circular(5),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Align(
                  alignment: Alignment.bottomCenter,
                  child: Row(
                    children: [
                      Expanded(
                        flex: 3,
                        child: Container(
                          height: 40,
                          margin: const EdgeInsets.only(left: 15, bottom: 15),
                          padding: const EdgeInsets.all(5),
                          decoration: BoxDecoration(
                            color: ColorRes.white.withValues(alpha: 0.5),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Padding(
                            padding: EdgeInsets.only(
                              left: 0,
                            ),
                            child: ShimmerScreen.rectangular(
                              height: 0,
                              width: double.infinity,
                              shapeBorder: RoundedRectangleBorder(
                                borderRadius: BorderRadius.only(
                                  bottomLeft: Radius.circular(5),
                                  topRight: Radius.circular(5),
                                  bottomRight: Radius.circular(5),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: Container(
                          height: 40,
                          margin: const EdgeInsets.only(
                              left: 15, right: 15, bottom: 15),
                          padding: const EdgeInsets.all(5),
                          decoration: BoxDecoration(
                              color: ColorRes.white.withValues(alpha: 0.5),
                              borderRadius: BorderRadius.circular(10)),
                          child: const Padding(
                            padding: EdgeInsets.only(
                              left: 0,
                            ),
                            child: ShimmerScreen.rectangular(
                              height: 0,
                              width: double.infinity,
                              shapeBorder: RoundedRectangleBorder(
                                borderRadius: BorderRadius.only(
                                  bottomLeft: Radius.circular(5),
                                  topRight: Radius.circular(5),
                                  bottomRight: Radius.circular(5),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
