import 'dart:io';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/screen/create_post_screen/create_post_screen_view_model.dart';
import 'package:orange_ui/utils/app_res.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';

class ImagePostView extends StatelessWidget {
  final CreatePostScreenViewModel model;

  const ImagePostView({super.key, required this.model});

  @override
  Widget build(BuildContext context) {
    return model.imagesFile.isEmpty
        ? const SizedBox()
        : Padding(
            padding: const EdgeInsets.only(bottom: 10.0),
            child: Stack(
              alignment: Alignment.bottomCenter,
              children: [
                model.imagesFile.length <= 1
                    ? Container(
                        constraints: BoxConstraints(maxHeight: Get.height / 1.7),
                        child: Image.file(File(model.imagesFile.first.path),
                            fit: BoxFit.cover, height: null, width: double.infinity),
                      )
                    : SizedBox(
                        height: 390,
                        child: PageView.builder(
                          controller: model.pageController,
                          itemCount: model.imagesFile.length,
                          onPageChanged: model.onPageChanged,
                          itemBuilder: (context, index) {
                            return Image.file(File(model.imagesFile[index].path),
                                fit: BoxFit.cover, height: 390, width: double.infinity);
                          },
                        ),
                      ),
                model.pageType == 1
                    ? const SizedBox()
                    : Positioned(
                        right: 0,
                        top: 0,
                        child: Padding(
                          padding: const EdgeInsets.all(10),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              (model.imagesFile.length + 1) >
                                      (model.appData?.postUploadImageLimit ?? AppRes.defaultMaxImagesForPost)
                                  ? const SizedBox()
                                  : InkWell(
                                      onTap: model.onPhotoTap,
                                      child: Container(
                                        margin: const EdgeInsets.symmetric(horizontal: 5),
                                        padding: const EdgeInsets.all(10),
                                        decoration: ShapeDecoration(
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                                          color: ColorRes.white.withValues(alpha: 0.3),
                                        ),
                                        alignment: Alignment.center,
                                        child: const Icon(Icons.add_rounded, color: ColorRes.white),
                                      ),
                                    ),
                              InkWell(
                                onTap: model.onImageDelete,
                                child: Container(
                                  margin: const EdgeInsets.symmetric(horizontal: 5),
                                  padding: const EdgeInsets.all(10),
                                  decoration: ShapeDecoration(
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                                    color: ColorRes.white.withValues(alpha: 0.3),
                                  ),
                                  alignment: Alignment.center,
                                  child: Image.asset(AssetRes.icBin, color: ColorRes.white, width: 21, height: 21),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                model.imagesFile.length > 1
                    ? Align(
                        alignment: Alignment.bottomCenter,
                        child: Padding(
                          padding: const EdgeInsets.all(10.0),
                          child: SmoothPageIndicator(
                            controller: model.pageController,
                            effect: CustomizableEffect(
                                dotDecoration: DotDecoration(
                                    width: 31,
                                    height: 2,
                                    color: ColorRes.white.withValues(alpha: 0.3)),
                                activeDotDecoration: const DotDecoration(width: 31, height: 2, color: ColorRes.white)),
                            onDotClicked: (index) {},
                            count: model.imagesFile.length,
                          ),
                        ),
                      )
                    : const SizedBox()
              ],
            ),
          );
  }
}
