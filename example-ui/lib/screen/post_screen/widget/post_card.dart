import 'package:flutter/material.dart';
import 'package:orange_ui/model/social/post/add_comment.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/feed_screen/feed_screen_view_model.dart';
import 'package:orange_ui/screen/post_screen/post_screen_view_model.dart';
import 'package:orange_ui/screen/post_screen/widget/image_post.dart';
import 'package:orange_ui/screen/post_screen/widget/post_bottom_bar.dart';
import 'package:orange_ui/screen/post_screen/widget/post_top_area.dart';
import 'package:orange_ui/screen/post_screen/widget/text_post.dart';
import 'package:orange_ui/screen/post_screen/widget/video_post.dart';
import 'package:orange_ui/utils/color_res.dart';

class PostCard extends StatelessWidget {
  final Post post;
  final FeedScreenViewModel model;
  final PostScreenViewModel? viewModel;
  final Function(int id)? onDeleteItem;
  final int? postIndex;
  final Function(UserData data)? updatePost;

  const PostCard({
    super.key,
    required this.post,
    required this.model,
    this.onDeleteItem,
    this.postIndex,
    this.viewModel,
    this.updatePost,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        PostTopArea(
            userData: post.user,
            onSelected: (value) {
              model.onMoreBtnClick(value, post, onDeleteItem);
            },
            onProfilePictureClick: (userData) {
              if (userData?.id != -1) {
                model.onProfilePictureClick(
                    userStories: [userData!],
                    onCallback: (data) {
                      updatePost?.call(data!);
                    },
                    userIndex: 0);
              }
            }),
        TextPost(description: post.description),
        post.content == null || post.content!.isEmpty
            ? const SizedBox()
            : post.content?.first.contentType == 0
                ? ImagePost(content: post.content ?? [], model: model)
                : post.content?.first.contentType == 1
                    ? VideoPost(post: post)
                    : const SizedBox(),
        PostBottomBar(post: post, model: model),
        const Divider(color: ColorRes.borderColor, indent: 15, endIndent: 15),
        const SizedBox(height: 10),
      ],
    );
  }
}
