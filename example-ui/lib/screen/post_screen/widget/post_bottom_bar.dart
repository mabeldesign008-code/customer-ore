import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/common/common_fun.dart';
import 'package:orange_ui/model/social/post/add_comment.dart';
import 'package:orange_ui/screen/feed_screen/feed_screen_view_model.dart';
import 'package:orange_ui/service/session_manager.dart';

import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/urls.dart';

class PostBottomBar extends StatelessWidget {
  final Post? post;
  final FeedScreenViewModel model;

  const PostBottomBar({
    super.key,
    required this.post,
    required this.model,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 15.0, right: 15, bottom: 10),
      child: Row(
        children: [
          ImageWithTextRow(
            onTap: (p0) {
              model.onCommentBtnClick(p0);
            },
            post: post,
            image: AssetRes.icComment,
            count: post?.commentsCount,
          ),
          const SizedBox(width: 6),
          LikeButton(post: post),
          Container(height: 20, width: 1, color: ColorRes.lightGrey),
          const SizedBox(width: 6),
          InkWell(
              onTap: () => model.sharePost(post!),
              child: Image.asset(AssetRes.icPostShare, height: 22, width: 22)),
          const Spacer(),
          Text(CommonFun.timeAgo(DateTime.parse(post?.createdAt ?? '')),
              style: const TextStyle(
                  fontFamily: FontRes.medium, fontSize: 12, color: ColorRes.dimGrey3))
        ],
      ),
    );
  }
}

class LikeButton extends StatefulWidget {
  final Post? post;

  const LikeButton({super.key, required this.post});

  @override
  State<LikeButton> createState() => _LikeButtonState();
}

class _LikeButtonState extends State<LikeButton> with SingleTickerProviderStateMixin {
  late final AnimationController _controller =
      AnimationController(duration: const Duration(milliseconds: 200), vsync: this, value: 1.0);

  @override
  void dispose() {
    super.dispose();
    _controller.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: CommonFun.getWidth(widget.post?.likesCount),
      child: InkWell(
        onTap: () {
          HapticFeedback.lightImpact();
          if (widget.post?.isLike == 1) {
            widget.post?.setLikesCount(-1);
            widget.post?.isLike = 0;
            ApiProvider().callPost(
                completion: (response) {},
                url: Urls.aDislikePost,
                param: {
                  Urls.userId: SessionManager.instance.getUserID().toString(),
                  Urls.aPostId: widget.post?.id
                });
          } else {
            widget.post?.setLikesCount(1);
            widget.post?.isLike = 1;
            ApiProvider().callPost(
                completion: (response) {
                  ApiProvider().sendLocalizedPushNotification(
                      key: 'hasLikedYourPost',
                      userData: SessionManager.instance.getUser(),
                      deviceToken: widget.post?.user?.deviceToken);
                },
                url: Urls.aLikePost,
                param: {
                  Urls.userId: SessionManager.instance.getUserID().toString(),
                  Urls.aPostId: widget.post?.id
                });
          }
          setState(() {});
          _controller.reverse().then((value) => _controller.forward());
        },
        child: Row(
          children: [
            ScaleTransition(
              scale: Tween(begin: 0.7, end: 1.0)
                  .animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut)),
              child: Image.asset(
                widget.post?.isLike == 1 ? AssetRes.icFillFav : AssetRes.icFav,
                height: 22,
                width: 22,
                color: widget.post?.isLike == 0 ? ColorRes.davyGrey : null,
              ),
            ),
            const SizedBox(width: 3),
            Text(
              NumberFormat.compact().format(widget.post?.likesCount ?? 0),
              style: const TextStyle(
                  color: ColorRes.davyGrey,
                  fontFamily: FontRes.medium,
                  letterSpacing: 0.5,
                  fontSize: 15),
            ),
          ],
        ),
      ),
    );
  }
}

class ImageWithTextRow extends StatelessWidget {
  final Post? post;
  final Function(Post?) onTap;
  final String image;
  final bool isLineVisible;
  final int? count;

  const ImageWithTextRow({super.key,
      required this.post,
      required this.onTap,
      required this.image,
      this.isLineVisible = true,
      required this.count});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(
          width: CommonFun.getWidth(count),
          child: InkWell(
            onTap: () => onTap(post),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.start,
              children: [
                Image.asset(image, height: 22, width: 22),
                const SizedBox(width: 3),
                Text(
                  NumberFormat.compact().format(count ?? 0),
                  style: const TextStyle(
                      color: ColorRes.davyGrey,
                      fontFamily: FontRes.medium,
                      letterSpacing: 0.5,
                      fontSize: 15),
                ),
              ],
            ),
          ),
        ),
        Visibility(
          visible: isLineVisible,
          child: Container(height: 20, width: 1, color: ColorRes.lightGrey),
        ),
      ],
    );
  }
}
