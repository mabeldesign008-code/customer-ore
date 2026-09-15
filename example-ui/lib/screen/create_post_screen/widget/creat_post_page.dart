import 'package:detectable_text_field/detectable_text_field.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/create_post_screen/create_post_screen_view_model.dart';
import 'package:orange_ui/screen/create_post_screen/widget/image_post_view.dart';
import 'package:orange_ui/screen/create_post_screen/widget/video_post_view.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class CreatePostPage extends StatelessWidget {
  final CreatePostScreenViewModel model;

  const CreatePostPage({super.key, required this.model});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        model.imagesFile.isEmpty
            ? Container(
                color: ColorRes.lightGrey2,
                padding: const EdgeInsets.symmetric(vertical: 15),
                width: double.infinity,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    InkWell(
                        onTap: model.onPhotoTap, child: RowImageText(image: AssetRes.icPhoto, title: S.current.photo)),
                    Container(height: 20, width: 1, color: ColorRes.lightGrey),
                    InkWell(
                        onTap: model.onVideoTap,
                        child: RowImageText(image: AssetRes.icVideo, title: S.current.videoCap.capitalize ?? ''))
                  ],
                ),
              )
            : model.contentType == 0
                ? ImagePostView(model: model)
                : model.contentType == 1
                    ? VideoPostView(model: model)
                    : const SizedBox(),
        const SizedBox(height: 10),
        Container(
          height: 200,
          color: ColorRes.aquaHaze,
          child: DetectableTextField(
            controller: model.detectableTextFieldController,
            onChanged: model.onChangeDetectableTextField,
            focusNode: model.detectableTextFieldFocusNode,
            maxLines: null,
            minLines: null,
            expands: true,
            maxLength: ((model.appData?.postDescriptionLimit ?? 0) <= 0) ? null : model.appData?.postDescriptionLimit,
            decoration: InputDecoration(
                border: InputBorder.none,
                hintText: S.of(context).writeSomethingHere,
                hintStyle: const TextStyle(fontSize: 17, fontFamily: FontRes.regular, color: ColorRes.dimGrey2),
                contentPadding: const EdgeInsets.all(15)),
            style: const TextStyle(fontSize: 18, color: ColorRes.dimGrey3, fontFamily: FontRes.regular),
          ),
        )
      ],
    );
  }
}

class RowImageText extends StatelessWidget {
  final String image;
  final String title;

  const RowImageText({super.key, required this.image, required this.title});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Image.asset(image, width: 22, height: 22),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8.0),
          child:
              Text(title, style: const TextStyle(fontFamily: FontRes.regular, fontSize: 17, color: ColorRes.dimGrey5)),
        )
      ],
    );
  }
}
