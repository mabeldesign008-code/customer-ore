import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/custom_image.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/like_profiles_screen/like_profiles_screen_view_model.dart';
import 'package:orange_ui/screen/user_detail_screen/user_detail_screen.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class LikeCard extends StatelessWidget {
  final UserData userData;
  final LikeProfilesScreenViewModel viewModel;

  const LikeCard({super.key, required this.userData, required this.viewModel});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () {
        Get.to(() => UserDetailScreen(
            userData: userData, onUpdateUser: viewModel.onUpdateUser));
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
                width: 40,
                radius: 50),
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
            InkWell(
              onTap: () => viewModel.onLikeBtnTap(userData),
              child: Icon(
                (userData.isLiked ?? false)
                    ? Icons.favorite
                    : Icons.favorite_border,
                color: (userData.isLiked ?? false) ? ColorRes.themeColor : null,
                size: 23,
              ),
            )
          ],
        ),
      ),
    );
  }
}
