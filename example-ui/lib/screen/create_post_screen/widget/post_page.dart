import 'package:flutter/material.dart';
import 'package:orange_ui/common/detectable_text_custom.dart';
import 'package:orange_ui/screen/create_post_screen/create_post_screen_view_model.dart';
import 'package:orange_ui/screen/create_post_screen/widget/image_post_view.dart';
import 'package:orange_ui/screen/create_post_screen/widget/interest_widget.dart';
import 'package:orange_ui/screen/create_post_screen/widget/video_post_view.dart';

class PostPage extends StatelessWidget {
  final CreatePostScreenViewModel model;

  const PostPage({super.key, required this.model});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        model.detectableTextFieldController.text.isEmpty
            ? const SizedBox()
            : Padding(
                padding: const EdgeInsets.symmetric(
                    horizontal: 15.0, vertical: 10.0),
                child: DetectableTextCustom(
                    text: model.detectableTextFieldController.text),
              ),
        model.contentType == 0
            ? ImagePostView(model: model)
            : model.contentType == 1
                ? VideoPostView(model: model)
                : const SizedBox(),
        InterestWidget(model: model)
      ],
    );
  }
}
