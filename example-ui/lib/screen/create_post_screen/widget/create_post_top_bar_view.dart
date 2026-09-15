import 'package:flutter/material.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/create_post_screen/create_post_screen_view_model.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/style_res.dart';

class CreatePostTopBarView extends StatelessWidget {
  final int type;
  final CreatePostScreenViewModel model;

  const CreatePostTopBarView(
      {super.key, required this.type, required this.model});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: [
                InkWell(onTap: model.onBackTap, child: const Icon(Icons.arrow_back_rounded, color: ColorRes.davyGrey)),
                Expanded(
                  child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 10.0),
                      child: Text(S.of(context).createPost,
                          style:
                              const TextStyle(fontFamily: FontRes.semiBold, fontSize: 18, color: ColorRes.davyGrey))),
                ),
                InkWell(
                  onTap: () {
                    if (model.imagesFile.isNotEmpty || model.detectableTextFieldController.text.isNotEmpty) {
                      model.onNextClick(type);
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 17),
                    decoration: ShapeDecoration(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                        color: model.imagesFile.isNotEmpty ||
                                model.detectableTextFieldController.text.isNotEmpty ||
                                model.pageType == 1
                            ? null
                            : ColorRes.aquaHaze,
                        gradient: model.imagesFile.isNotEmpty ||
                                model.detectableTextFieldController.text.isNotEmpty ||
                                model.pageType == 1
                            ? StyleRes.linearGradient
                            : null),
                    child: Text(
                      (type == 0 ? S.of(context).next : S.of(context).post).toUpperCase(),
                      style: TextStyle(
                          color: model.imagesFile.isNotEmpty ||
                                  model.detectableTextFieldController.text.isNotEmpty ||
                                  model.pageType == 1
                              ? ColorRes.white
                              : ColorRes.dimGrey5,
                          fontFamily: FontRes.semiBold,
                          fontSize: 14),
                    ),
                  ),
                )
              ],
            ),
          ),
          const SizedBox(height: 10),
          const Divider(height: 1, thickness: 0.5, color: ColorRes.lightGrey)
        ],
      ),
    );
  }
}
