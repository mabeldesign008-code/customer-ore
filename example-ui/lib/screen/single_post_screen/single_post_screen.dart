import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/social/post/add_comment.dart';
import 'package:orange_ui/screen/feed_screen/feed_screen_view_model.dart';
import 'package:orange_ui/screen/post_screen/widget/post_card.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:stacked/stacked.dart';

class SinglePostScreen extends StatefulWidget {
  final Post? post;

  const SinglePostScreen({super.key, required this.post});

  @override
  State<SinglePostScreen> createState() => _SinglePostScreenState();
}

class _SinglePostScreenState extends State<SinglePostScreen> {
  Post? post;

  @override
  void initState() {
    post = widget.post;

    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.all(10.0),
              child: Stack(
                children: [
                  InkWell(
                    onTap: () {
                      Get.back();
                    },
                    child: const Icon(
                      Icons.arrow_back_rounded,
                      color: ColorRes.davyGrey,
                    ),
                  ),
                  Align(
                    alignment: Alignment.center,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 40.0),
                      child: Text(
                        S.of(context).post,
                        style: const TextStyle(
                            fontFamily: FontRes.bold,
                            fontSize: 18,
                            color: ColorRes.themeColor),
                        overflow: TextOverflow.ellipsis,
                        maxLines: 1,
                      ),
                    ),
                  )
                ],
              ),
            ),
          ),
          ViewModelBuilder<FeedScreenViewModel>.nonReactive(
            viewModelBuilder: () => FeedScreenViewModel(),
            builder: (context, viewModel, child) => PostCard(
              post: post!,
              model: viewModel,
              onDeleteItem: (id) {},
              updatePost: (data) {
                if (post?.userId == data.id) {
                  post?.user = data;
                  setState(() {});
                }
              },
            ),
          )
        ],
      ),
    );
  }
}
