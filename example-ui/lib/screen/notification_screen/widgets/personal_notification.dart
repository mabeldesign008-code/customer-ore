import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/common/common_fun.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/common/custom_image.dart';
import 'package:orange_ui/common/fullname_with_age.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/notification/user_notification_model.dart';
import 'package:orange_ui/model/social/post/add_post.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/single_post_screen/single_post_screen.dart';
import 'package:orange_ui/screen/user_detail_screen/user_detail_screen.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/urls.dart';

class PersonalNotificationPage extends StatelessWidget {
  final List<UserNotificationData> userNotification;
  final ScrollController controller;
  final Function(UserData? data) onUserTap;

  const PersonalNotificationPage(
      {super.key,
      required this.userNotification,
      required this.controller,
      required this.onUserTap});

  @override
  Widget build(BuildContext context) {
    return userNotification.isEmpty
        ? CommonUI.noData()
        : ListView.builder(
            controller: controller,
            padding: const EdgeInsets.only(top: 15),
            itemCount: userNotification.length,
            itemBuilder: (context, index) {
              UserNotificationData notification = userNotification[index];
              UserData? user = notification.user;
              return InkWell(
                onTap: () {
                  onUserTap(user);
                },
                child: Container(
                  margin:
                      const EdgeInsets.only(left: 16, right: 19, bottom: 18),
                  child: Row(
                    spacing: 10,
                    children: [
                      InkWell(
                        onTap: () {
                          Get.to(() => UserDetailScreen(userData: user));
                        },
                        child: CustomImage(
                            image: user?.profileImage,
                            height: 40,
                            width: 40,
                            radius: 30,
                            fullname: user?.fullname),
                      ),
                      InkWell(
                        onTap: () {
                          switch (notification.type) {
                            case 1:
                              navigateUser(notification);
                              break;
                            case 2:
                              navigatePost(notification);
                              break;
                            case 3:
                              navigatePost(notification);
                              break;
                            case 4:
                              navigateUser(notification);
                              break;
                            default:
                              break;
                          }
                        },
                        child: SizedBox(
                          width: Get.width - 94,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                      child: FullnameWithAge(
                                          userData: user,
                                          fontColor: ColorRes.davyGrey,
                                          fontSize: 15,
                                          fontFamily: FontRes.bold)),
                                  Text(
                                    CommonFun.timeAgo(
                                      DateTime.parse('${user?.createdAt}'),
                                    ),
                                    style: const TextStyle(
                                        fontSize: 11, color: ColorRes.grey2),
                                  ),
                                ],
                              ),
                              Text(getNotificationType(userNotification[index]),
                                  style: const TextStyle(
                                      fontSize: 13,
                                      color: ColorRes.darkGrey9,
                                      overflow: TextOverflow.ellipsis),
                                  maxLines: 2)
                            ],
                          ),
                        ),
                      )
                    ],
                  ),
                ),
              );
            },
          );
  }

  String getNotificationType(UserNotificationData? notificationData) {
    return notificationData?.type == 1
        ? '${notificationData?.user?.fullname} ${S.current.hasFollowedYourProfile}'
        : notificationData?.type == 2
            ? '${notificationData?.user?.fullname} ${S.current.hasCommentedOnYourPost}'
            : notificationData?.type == 3
                ? '${notificationData?.user?.fullname} ${S.current.hasLikedYourPost}'
                : notificationData?.type == 4
                    ? '${notificationData?.user?.fullname} ${S.current.hasLikedYourProfile}'
                    : '';
  }

  void navigateUser(UserNotificationData data) {
    Get.to(() => UserDetailScreen(userData: data.user));
  }

  void navigatePost(UserNotificationData notification) {
    CommonUI.lottieLoader();
    ApiProvider().callPost(
        completion: (response) {
          Get.back();
          AddPost post = AddPost.fromJson(response);
          if (post.status == true) {
            Get.to(() => SinglePostScreen(post: post.data));
          } else {
            CommonUI.snackBar(message: post.message ?? '');
          }
        },
        url: Urls.aFetchPostByPostId,
        param: {
          Urls.userId: SessionManager.instance.getUserID().toString(),
          Urls.aPostId: notification.itemId
        });
  }
}
