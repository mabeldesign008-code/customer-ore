import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/fullname_with_age.dart';
import 'package:orange_ui/common/gradient_widget.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';

class ProfileDetailCard extends StatelessWidget {
  final VoidCallback onImageTap;
  final UserData? userData;

  const ProfileDetailCard(
      {super.key, required this.userData, required this.onImageTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onImageTap,
      child: Padding(
        padding: const EdgeInsets.only(left: 10, right: 10, bottom: 10, top: 7),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
            child: Container(
              width: Get.width,
              padding: const EdgeInsets.fromLTRB(13, 9, 13, 12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(10),
                color: ColorRes.black.withValues(alpha: 0.33),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  FullnameWithAge(userData: userData),
                  Row(
                    children: [
                      GradientWidget(
                        child: Image.asset(
                          AssetRes.locationPin,
                          height: 13.5,
                          width: 10.5,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          userData?.address ?? '',
                          style: const TextStyle(
                            color: ColorRes.white,
                            fontSize: 11,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6.25),
                  Text(
                    userData?.bio ?? '',
                    style: const TextStyle(
                      color: ColorRes.white,
                      fontSize: 11,
                    ),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 3,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
