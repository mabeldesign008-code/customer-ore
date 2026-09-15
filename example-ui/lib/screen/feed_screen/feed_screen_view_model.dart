import 'dart:developer';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/common/confirmation_dialog.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/model/social/feed.dart';
import 'package:orange_ui/model/social/post/add_comment.dart';
import 'package:orange_ui/model/social/story/fetch_stories.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/comment_sheet/comment_sheet.dart';
import 'package:orange_ui/screen/create_post_screen/create_post_screen.dart';
import 'package:orange_ui/screen/story_view_screen/story_view_screen.dart';
import 'package:orange_ui/screen/user_report_screen/report_sheet.dart';

import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/service/share_manager.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/urls.dart';
import 'package:stacked/stacked.dart';

enum MoreBtnValue { report, delete, share }

class FeedScreenViewModel extends BaseViewModel {
  List<Post> postList = [];
  List<UserData> headerStories = [];
  bool isLoading = true;
  ScrollController scrollController = ScrollController();
  MoreBtnValue moreBtnValue = MoreBtnValue.share;
  UserData? myUserData;

  // init Camera description

  Appdata? settingAppData;

  void init() {
    prefData();
    fetchFeedData();
    fetchScrollData();
  }

  void fetchFeedData() {
    isLoading = true;
    ApiProvider().callPost(
        completion: (response) {
          Feed feed = Feed.fromJson(response);
          if (postList.isEmpty) {
            postList = feed.data?.posts ?? [];
          } else {
            postList.addAll(feed.data?.posts ?? []);
          }
          headerStories = feed.data?.usersStories ?? [];
          headerStories.sort((a, b) {
            if (a.isAllStoryShown()) {
              return 1;
            }
            return -1;
          });
          isLoading = false;
          notifyListeners();
        },
        url: Urls.aFetchHomePageData,
        param: {
          Urls.myUserId: SessionManager.instance.getUserID().toString(),
        });
  }

  void fetchStories({required UserData? userData}) {
    ApiProvider().callPost(
        completion: (response) {
          FetchStories fetchStories = FetchStories.fromJson(response);
          headerStories = fetchStories.data ?? [];
          headerStories.sort((a, b) {
            if (a.isAllStoryShown()) {
              return 1;
            }
            return -1;
          });
          // Update Other PostUser
          for (var element in headerStories) {
            for (var postUser in postList) {
              if (postUser.userId == element.id) {
                postUser.user = element;
              }
            }
          }
          notifyListeners();
        },
        url: Urls.aFetchStories,
        param: {Urls.myUserId: SessionManager.instance.getUserID().toString()});
  }

  void getProfile() {
    ApiProvider()
        .getProfile(userID: SessionManager.instance.getUserID())
        .then((value) {
      myUserData = value.data;
      // Update My PostUser
      for (var element in postList) {
        Post p = element;
        if (myUserData?.id == p.user?.id) {
          element.user = myUserData;
        }
      }
      notifyListeners();
    });
  }

  void fetchScrollData() {
    scrollController.addListener(() {
      if (scrollController.offset ==
          scrollController.position.maxScrollExtent) {
        if (!isLoading) {
          fetchFeedData();
        }
      }
    });
  }

  void onCommentBtnClick(Post? post) {
    Get.bottomSheet(CommentSheet(post: post), isScrollControlled: true)
        .then((value) {
      notifyListeners();
    });
  }

  void onCreatePost() {
    Get.bottomSheet<Post>(
      const CreatePostScreen(),
      isScrollControlled: true,
      backgroundColor: ColorRes.white,
      barrierColor: ColorRes.white,
      enableDrag: false,
    ).then((value) {
      if (value != null) {
        postList.insert(0, value);
        notifyListeners();
      }
    });
  }

  void onMoreBtnClick(
      MoreBtnValue value, Post post, Function(int id)? onDeleteItem) {
    if (MoreBtnValue.share == value) {
      sharePost(post);
    } else if (MoreBtnValue.report == value) {
      Get.bottomSheet(
          ReportSheet(
              reportId: post.id,
              profileImage: post.user?.profileImage,
              age: post.user?.age,
              fullName: post.user?.fullname,
              address: post.user?.address,
              userData: post.user,
              reportType: 2),
          isScrollControlled: true);
    } else if (MoreBtnValue.delete == value) {
      Get.dialog(
        ConfirmationDialog(
          onTap: () {
            onDeleteItem?.call(post.id ?? -1);
            Get.back();
            postList.removeWhere((element) => element.id == post.id);
            notifyListeners();
            ApiProvider().callPost(
              completion: (response) {},
              url: Urls.aDeleteMyPost,
              param: {
                Urls.userId: SessionManager.instance.getUserID().toString(),
                Urls.aPostId: post.id
              },
            );
          },
          description: S.current.areYouSureYouWantToDeleteThePost,
          heading: S.current.deletePost,
          dialogSize: 2,
          padding: const EdgeInsets.all(50),
        ),
      );
    }
  }

  void sharePost(Post post) async {
    ShareManager.shared.shareTheContent(key: ShareKeys.post, value: post.id ?? -1);
  }

  void prefData() async {
    myUserData = SessionManager.instance.getUser();
    settingAppData = SessionManager.instance.getSettings()?.appdata;
    notifyListeners();

    getProfile();
  }

  onProfilePictureClick({required List<UserData> userStories,
    Function(UserData? data)? onCallback,
      required int userIndex}) {
    Get.bottomSheet<UserData?>(
      StoryViewScreen(stories: userStories, userIndex: userIndex),
      isScrollControlled: true,
      barrierColor: ColorRes.black,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(0)),
    ).then((value) {
      getProfile();
      if (value != null) {
        for (var element in postList) {
          if (element.userId == value.id) {
            element.user = value;
          }
        }
        if (myUserData?.id == value.id) {
          myUserData = value;
        }
        int index =
            headerStories.indexWhere((element) => element.id == value.id);

        if (index != -1) {
          headerStories[index] = value;
          log('${headerStories[index].toJson()}');
        }

        notifyListeners();
        onCallback?.call(value);
      }
    });
  }
}
