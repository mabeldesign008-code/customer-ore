import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/model/social/post/add_comment.dart';
import 'package:orange_ui/screen/feed_screen/feed_screen_view_model.dart';
import 'package:orange_ui/screen/shimmer_screen/shimmer_screen.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/const_res.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';

class ImagePost extends StatelessWidget {
  final List<Content> content;
  final FeedScreenViewModel model;

  const ImagePost({super.key, required this.content, required this.model});

  @override
  Widget build(BuildContext context) {
    PageController pageController = PageController();
    return Padding(
      padding: const EdgeInsets.only(bottom: 10.0),
      child:

          /// For Single sImage
          content.length == 1
              ? Container(
                  constraints: BoxConstraints(maxHeight: Get.height / 1.7),
                  child: CachedNetworkImage(
                    imageUrl:
                        '${ConstRes.aImageBaseUrl}${content.first.content}',
                    cacheKey:
                        '${ConstRes.aImageBaseUrl}${content.first.content}',
                    placeholder: (context, url) {
                      return const CustomShimmer();
                    },
                    fadeInDuration: Duration.zero,
                    fadeOutDuration: Duration.zero,
                    placeholderFadeInDuration: Duration.zero,
                    fit: BoxFit.cover,
                    height: null,
                    width: double.infinity,
                    errorWidget: (context, url, error) =>
                        CommonUI.postPlaceHolder(),
                  ),
                )
              : Stack(
                  alignment: Alignment.bottomCenter,
                  children: [
                    /// For Multiple Image
                    SizedBox(
                      height: 390,
                      child: PageView.builder(
                        controller: pageController,
                        itemCount: content.length,
                        itemBuilder: (context, index) {
                          return CachedNetworkImage(
                            imageUrl:
                                '${ConstRes.aImageBaseUrl}${content[index].content}',
                            cacheKey:
                                '${ConstRes.aImageBaseUrl}${content[index].content}',
                            fit: BoxFit.cover,
                            height: 390,
                            width: double.infinity,
                            errorWidget: (context, url, error) =>
                                CommonUI.postPlaceHolder(),
                            placeholder: (context, url) {
                              return const CustomShimmer();
                            },
                          );
                        },
                      ),
                    ),
                    Align(
                      alignment: Alignment.bottomCenter,
                      child: Padding(
                        padding: const EdgeInsets.all(10.0),
                        child: SmoothPageIndicator(
                          controller: pageController, // PageController
                          effect: CustomizableEffect(
                            dotDecoration: DotDecoration(
                                width: 31,
                                height: 2,
                                color: ColorRes.white.withValues(alpha: 0.3)),
                            activeDotDecoration: const DotDecoration(
                                width: 31, height: 2, color: ColorRes.white),
                          ), // your preferred effect
                          onDotClicked: (index) {}, count: content.length,
                        ),
                      ),
                    )
                  ],
                ),
    );
  }
}
