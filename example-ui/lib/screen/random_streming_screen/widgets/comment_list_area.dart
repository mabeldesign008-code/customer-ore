import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/model/chat_and_live_stream/live_stream.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/const_res.dart';
import 'package:orange_ui/utils/firebase_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class CommentListArea extends StatelessWidget {
  final List<LiveStreamComment> commentList;
  final BuildContext pageContext;

  const CommentListArea({
    super.key,
    required this.commentList,
    required this.pageContext,
  });

  @override
  Widget build(BuildContext context) {
    double tempSize =
        MediaQuery.of(pageContext).viewInsets.bottom == 0 ? 0 : MediaQuery.of(pageContext).viewInsets.bottom;
    return SizedBox(
      height: (tempSize == 0) ? (Get.height - 270) / 2 : (Get.height - 270) - tempSize - 50,
      width: Get.width,
      child: ShaderMask(
        shaderCallback: (Rect bounds) {
          return const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              ColorRes.themeColor,
              Colors.transparent,
              Colors.transparent,
            ],
            stops: [0.0, 0.3, 1.0],
          ).createShader(bounds);
        },
        blendMode: BlendMode.dstOut,
        child: ListView.builder(
          physics: const BouncingScrollPhysics(),
          itemCount: commentList.length,
          reverse: true,
          padding: EdgeInsets.zero,
          itemBuilder: (context, index) {
            LiveStreamComment? comment = commentList[index];
            return Container(
              margin: const EdgeInsets.only(left: 10),
              padding: const EdgeInsets.only(bottom: 14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(30),
                    child: Image.network(
                      '${comment.userImage}',
                      fit: BoxFit.cover,
                      height: 34,
                      width: 34,
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: Get.width / 1.5,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          comment.userName ?? '',
                          style: const TextStyle(color: ColorRes.white, fontSize: 13, fontFamily: FontRes.semiBold),
                        ),
                        comment.commentType == FirebaseRes.msg
                            ? Text(
                                comment.comment ?? '',
                                style: const TextStyle(color: ColorRes.white, fontSize: 12, fontFamily: FontRes.medium),
                              )
                            : ClipRRect(
                                borderRadius: BorderRadius.circular(15),
                                child: BackdropFilter(
                                  filter: ImageFilter.blur(sigmaY: 15, sigmaX: 15),
                                  child: Container(
                                    height: 54,
                                    width: 54,
                                    padding: const EdgeInsets.all(5),
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(15),
                                      color: ColorRes.black.withValues(alpha: 0.33),
                                    ),
                                    child: Image.network(
                                      '${ConstRes.aImageBaseUrl}${comment.comment}',
                                      width: 40,
                                      height: 35,
                                      fit: BoxFit.cover,
                                    ),
                                  ),
                                ),
                              ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
