import 'dart:io';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/live_stream_application_screen/live_stream_application_screen_view_model.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class CenterAreaLiveStream extends StatelessWidget {
  final LiveStreamApplicationScreenViewModel model;

  const CenterAreaLiveStream({super.key, required this.model});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: SingleChildScrollView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 7),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(left: 5, top: 15, bottom: 9),
                child: Text(
                  S.current.something,
                  style: const TextStyle(
                    fontFamily: FontRes.extraBold,
                    fontSize: 15,
                    color: ColorRes.davyGrey,
                  ),
                ),
              ),
              Container(
                height: 103,
                decoration: BoxDecoration(
                    color: ColorRes.lightGrey2,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                        color: model.isAbout
                            ? ColorRes.themeColor
                            : ColorRes.transparent)),
                child: TextField(
                  controller: model.aboutController,
                  onTapOutside: (event) =>
                      FocusManager.instance.primaryFocus?.unfocus(),
                  textCapitalization: TextCapitalization.sentences,
                  expands: true,
                  minLines: null,
                  maxLines: null,
                  style: const TextStyle(
                    color: ColorRes.dimGrey3,
                  ),
                  decoration: InputDecoration(
                    hintText: S.current.shortIntro,
                    contentPadding: const EdgeInsets.all(15),
                    border: InputBorder.none,
                    hintStyle:
                        const TextStyle(color: ColorRes.dimGrey3, fontSize: 14),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(left: 5, top: 10, bottom: 6),
                child: Text(
                  S.current.languagesYouEtc,
                  style: const TextStyle(
                    fontSize: 15,
                    fontFamily: FontRes.extraBold,
                    color: ColorRes.davyGrey,
                  ),
                ),
              ),
              Container(
                height: 71,
                decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    color: ColorRes.lightGrey2,
                    border: Border.all(
                        color: model.isLanguages
                            ? ColorRes.themeColor
                            : ColorRes.transparent)),
                child: TextField(
                  controller: model.languageController,
                  onTapOutside: (event) =>
                      FocusManager.instance.primaryFocus?.unfocus(),
                  textCapitalization: TextCapitalization.sentences,
                  expands: true,
                  minLines: null,
                  maxLines: null,
                  style: const TextStyle(color: ColorRes.dimGrey3),
                  decoration: InputDecoration(
                    hintText: S.current.languagesDetail,
                    contentPadding: const EdgeInsets.all(15),
                    border: InputBorder.none,
                    hintStyle: const TextStyle(
                      color: ColorRes.dimGrey3,
                    ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(left: 5, top: 12, bottom: 6),
                child: Text(
                  S.current.intro,
                  style: const TextStyle(
                      fontSize: 15,
                      fontFamily: FontRes.extraBold,
                      color: ColorRes.davyGrey),
                ),
              ),
              Visibility(
                visible: model.isVideoAttach,
                child: InkWell(
                  onTap: model.imagePicker,
                  child: Container(
                    height: 67,
                    decoration: BoxDecoration(
                        color: ColorRes.lightGrey2,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                            color: model.isIntroVideo
                                ? ColorRes.themeColor
                                : ColorRes.transparent)),
                    child: Center(
                      child: Text(
                        S.current.attach,
                        style: const TextStyle(
                            color: ColorRes.dimGrey3, fontSize: 14),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 5),
              Visibility(
                visible: model.videoImageFile == null ||
                        model.videoImageFile!.isEmpty
                    ? false
                    : true,
                child: Container(
                  height: 75,
                  width: Get.width - 14,
                  padding: const EdgeInsets.symmetric(horizontal: 5),
                  decoration: BoxDecoration(
                      color: ColorRes.lightGrey2,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                          color: model.isIntroVideo
                              ? ColorRes.themeColor
                              : ColorRes.transparent)),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      InkWell(
                        onTap: model.onVideoPlayBtnTap,
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(10),
                              child: Image.file(File('${model.videoImageFile}'),
                                  width: 65, height: 65, fit: BoxFit.cover),
                            ),
                            Container(
                              height: 31,
                              width: 31,
                              decoration: BoxDecoration(
                                  color: ColorRes.white.withValues(alpha: 0.30),
                                  shape: BoxShape.circle),
                              child: Center(
                                child: Image.asset(AssetRes.playButton,
                                    height: 16,
                                    width: 15,
                                    color: ColorRes.white),
                              ),
                            ),
                          ],
                        ),
                      ),
                      InkWell(
                        onTap: model.imagePicker,
                        child: Text(
                          S.of(context).change,
                          style: const TextStyle(
                              color: ColorRes.dimGrey3, fontSize: 14),
                        ),
                      )
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(left: 5, top: 17, bottom: 6),
                child: Text(
                  S.current.social,
                  style: const TextStyle(
                    color: ColorRes.davyGrey,
                    fontSize: 15,
                    fontFamily: FontRes.extraBold,
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(left: 5, bottom: 12),
                child: Text(
                  S.current.socialData,
                  style: const TextStyle(color: ColorRes.grey20),
                ),
              ),
              Container(
                height: 48,
                width: Get.width,
                padding: const EdgeInsets.symmetric(horizontal: 7),
                margin: const EdgeInsets.all(2),
                decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    color: ColorRes.lightGrey2,
                    border: Border.all(
                        color: model.isSocialLink
                            ? ColorRes.themeColor
                            : ColorRes.transparent)),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: model.socialProfileController,
                        onTapOutside: (event) =>
                            FocusManager.instance.primaryFocus?.unfocus(),
                        decoration: const InputDecoration(
                            contentPadding:
                                EdgeInsets.symmetric(horizontal: 10),
                            border: InputBorder.none),
                        style: const TextStyle(color: ColorRes.dimGrey3),
                      ),
                    ),
                    InkWell(
                      onTap: model.onPlusBtnTap,
                      borderRadius: BorderRadius.circular(30),
                      child: Container(
                        height: 32,
                        width: 32,
                        decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: ColorRes.lightOrange),
                        child: const Center(
                            child: Icon(Icons.add, color: ColorRes.white)),
                      ),
                    )
                  ],
                ),
              ),
              ListView.builder(
                primary: false,
                shrinkWrap: true,
                reverse: true,
                padding:
                    EdgeInsets.only(bottom: AppBar().preferredSize.height / 2),
                itemCount: model.socialLinks.length,
                itemBuilder: (context, index) {
                  return Container(
                    height: 48,
                    width: Get.width,
                    padding: const EdgeInsets.symmetric(horizontal: 7),
                    margin: const EdgeInsets.all(2),
                    decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(10),
                        color: ColorRes.lightGrey2,
                        border: Border.all(
                            color: model.isSocialLink
                                ? ColorRes.themeColor
                                : ColorRes.transparent)),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            model.socialLinks[index],
                            style: const TextStyle(color: ColorRes.dimGrey3),
                            textAlign: TextAlign.start,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        InkWell(
                          onTap: () =>
                              model.onRemoveBtnTap(model.socialLinks[index]),
                          borderRadius: BorderRadius.circular(30),
                          child: Container(
                            height: 32,
                            width: 32,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: ColorRes.salmon,
                            ),
                            child: const Center(
                              child: Icon(Icons.remove, color: ColorRes.white),
                            ),
                          ),
                        )
                      ],
                    ),
                  );
                },
              )
            ],
          ),
        ),
      ),
    );
  }
}
