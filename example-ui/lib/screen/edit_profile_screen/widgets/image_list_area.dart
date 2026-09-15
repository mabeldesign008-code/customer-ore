import 'dart:io';

import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/common/custom_image.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/edit_profile_screen/edit_profile_screen_view_model.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/const_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class ImageListArea extends StatelessWidget {
  final EditProfileScreenViewModel model;

  const ImageListArea({super.key, required this.model});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 20.0),
          child: Text(
            S.current.photosCap,
            style: const TextStyle(
              color: ColorRes.davyGrey,
              fontSize: 15,
              fontFamily: FontRes.extraBold,
            ),
          ),
        ),
        const SizedBox(height: 7),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Row(
            children: [
              SizedBox(
                width: Get.width - 105,
                height: 58,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: model.imageList.length,
                  physics: const BouncingScrollPhysics(),
                  itemBuilder: (context, index) {
                    Images? image = model.imageList[index];
                    return InkWell(
                      onTap: () {
                        model.onImageRemove(image, index);
                      },
                      child: Padding(
                        padding: const EdgeInsets.only(right: 10),
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            ClipSmoothRect(
                              radius: SmoothBorderRadius(
                                  cornerRadius: 10, cornerSmoothing: 1),
                              child: image.id != -1
                                  ? CustomImage(
                                      image:
                                          '${ConstRes.aImageBaseUrl}${image.image}',
                                      height: 58,
                                      width: 58,
                                    )
                                  : Image.file(
                                      File(image.image ?? ''),
                                      fit: BoxFit.cover,
                                      height: 58,
                                      width: 58,
                                      errorBuilder:
                                          (context, error, stackTrace) {
                                        return CommonUI.profileImagePlaceHolder(
                                            name: CommonUI.fullName(
                                                model.userData?.fullname),
                                            heightWidth: 58,
                                            borderRadius: 10);
                                      },
                                    ),
                            ),
                            Container(
                              height: 31,
                              width: 31,
                              decoration: BoxDecoration(
                                color: ColorRes.white.withValues(alpha: 0.30),
                                shape: BoxShape.circle,
                              ),
                              child: Center(
                                child: Image.asset(
                                  AssetRes.bin,
                                  height: 16,
                                  width: 15,
                                  color: ColorRes.white,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
              SizedBox(
                //width: 130,
                height: 58,
                child: Row(
                  children: [
                    const SizedBox(width: 7),
                    InkWell(
                      onTap: model.selectImages,
                      child: Container(
                        height: 58,
                        width: 58,
                        decoration: BoxDecoration(
                          color: ColorRes.lightGrey3,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Center(
                          child:
                              Image.asset(AssetRes.plus, height: 17, width: 17),
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
    );
  }
}
