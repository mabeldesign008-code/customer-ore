import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/custom_image.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/create_story_screen/create_story_screen.dart';
import 'package:orange_ui/screen/feed_screen/feed_screen_view_model.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/style_res.dart';

class FeedStoryBar extends StatelessWidget {
  final FeedScreenViewModel model;

  const FeedStoryBar({super.key, required this.model});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        MyStoryBox(model: model),
        Expanded(
          child: Container(
            height: 90,
            width: 80,
            margin: const EdgeInsets.symmetric(vertical: 15),
            child: ListView.builder(
              itemCount: model.headerStories.length,
              padding: const EdgeInsets.symmetric(horizontal: 0),
              scrollDirection: Axis.horizontal,
              itemBuilder: (context, index) {
                return InkWell(
                  onTap: () => model.onProfilePictureClick(
                      userStories: model.headerStories, userIndex: index),
                  child: SizedBox(
                    width: 80,
                    height: 90,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        StoryProfileView(
                            userData: model.headerStories[index],
                            borderWidth: 2.5),
                        Text(
                          model.headerStories[index].fullname ?? '',
                          style: const TextStyle(
                              color: ColorRes.dimGrey3,
                              fontSize: 13,
                              fontFamily: FontRes.semiBold),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        )
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        )
      ],
    );
  }
}

class MyStoryBox extends StatelessWidget {
  final FeedScreenViewModel model;

  const MyStoryBox({super.key, required this.model});

  @override
  Widget build(BuildContext context) {
    bool isStoryAvailable = (model.myUserData?.story ?? []).isNotEmpty;
    return InkWell(
      onTap: () {
        if (isStoryAvailable) {
          model.onProfilePictureClick(
              userStories: [model.myUserData!], userIndex: 0);
        } else {
          Get.to(() => const CreateStoryScreen())?.then((value) {
            model.getProfile();
          });
        }
      },
      child: Container(
        height: 90,
        width: 80,
        margin: const EdgeInsets.only(top: 15, bottom: 15, left: 10),
        child: Stack(
          alignment: Alignment.topCenter,
          children: [
            StoryProfileView(userData: model.myUserData, borderWidth: 2.5),
            Positioned(
              bottom: 6,
              child: InkWell(
                onTap: () {
                  Get.to(() => const CreateStoryScreen())?.then((value) {
                    model.getProfile();
                  });
                },
                child: Container(
                    decoration: const BoxDecoration(
                        color: Colors.white, shape: BoxShape.circle),
                    child: Image.asset(
                      AssetRes.add,
                      height: 25,
                      width: 25,
                      color: ColorRes.themeColor,
                    )),
              ),
            )
          ],
        ),
      ),
    );
  }
}

class StoryProfileView extends StatelessWidget {
  final UserData? userData;
  final double? widthHeight;
  final double? cornerRadius;
  final double imageCorner;
  final EdgeInsets? margin;
  final double borderWidth;

  const StoryProfileView({super.key,
      required this.userData,
      this.widthHeight = 70,
      this.cornerRadius,
      this.margin,
      this.imageCorner = 13,
      required this.borderWidth});

  @override
  Widget build(BuildContext context) {
    bool isStoryAvailable = (userData?.story ?? []).isNotEmpty;
    return Container(
      width: widthHeight,
      height: widthHeight,
      margin: margin ?? const EdgeInsets.symmetric(horizontal: 5),
      decoration: ShapeDecoration(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(cornerRadius ?? 15.5),
        ),
        gradient: isStoryAvailable
            ? (userData!.isAllStoryShown()
                ? StyleRes.linearDimGrey
                : StyleRes.linearGradient)
            : null,
      ),
      child: Container(
        margin: EdgeInsets.all(isStoryAvailable ? borderWidth : 0),
        decoration: ShapeDecoration(
          color: ColorRes.white,
          shape: RoundedRectangleBorder(
              side: const BorderSide(color: ColorRes.white, width: 1),
              borderRadius: BorderRadius.circular(imageCorner)),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(imageCorner - 1),
          child: CustomImage(
              image: userData?.profileImage,
              width: double.infinity,
              height: double.infinity,
              radius: imageCorner,
              fit: BoxFit.cover,
              fullname: userData?.fullname),
        ),
      ),
    );
  }
}
