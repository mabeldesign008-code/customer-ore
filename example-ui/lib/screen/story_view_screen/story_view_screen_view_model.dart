import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/common/confirmation_dialog.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/social/story/view_story.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/service/session_manager.dart';

import 'package:orange_ui/story_view/controller/story_controller.dart';
import 'package:orange_ui/story_view/widgets/story_view.dart';
import 'package:orange_ui/utils/urls.dart';
import 'package:stacked/stacked.dart';

class StoryViewScreenViewModel extends BaseViewModel {
  StoryController storyController = StoryController();
  List<List<StoryItem>> stories = [];
  List<UserData> users = [];
  PageController pageController;
  int userIndex = 0;

  StoryViewScreenViewModel(this.users, this.userIndex, this.pageController) {
    for (var user in users) {
      List<StoryItem> userStories =
          user.story?.map((e) => e.toStoryItem(storyController)).toList() ?? [];
      stories.add(userStories);
      notifyListeners();
    }
  }

  void init() {}

  void onStoryShow(StoryItem value) {
    if (!value.viewedByUsersIds
        .contains(SessionManager.instance.getUserID().toString())) {
      ApiProvider().callPost(
        completion: (response) {
          Story? s = ViewStory.fromJson(response).data;
          if (s != null) {
            if (userIndex < users.length) {
              List<Story> stories = users[userIndex].story ?? [];
              int storyIndex = stories.indexWhere((element) => element.id == s.id);
              if (storyIndex != -1) {
                s.user = value.story?.user;
                stories[storyIndex] = s;
              }
            }
          }
        },
        url: Urls.aViewStory,
        param: {
          Urls.userId: SessionManager.instance.getUserID().toString(),
          Urls.aStoryId: value.id
        },
      );
    }
  }

  void onPreviousUser() {
    if (userIndex == 0) {
      return;
    }
    pageController.animateToPage(userIndex - 1,
        duration: const Duration(milliseconds: 500), curve: Curves.ease);
    notifyListeners();
  }

  void onNext() {
    if (userIndex == (stories.length - 1)) {
      Get.back(result: users[userIndex]);
      return;
    }
    pageController.animateToPage(userIndex + 1,
        duration: const Duration(milliseconds: 500), curve: Curves.ease);
    notifyListeners();
  }

  void onPageChange(int value) {
    userIndex = value;
    notifyListeners();
  }

  @override
  void dispose() {
    storyController.dispose();
    super.dispose();
  }

  void onStoryDelete(Story? story) {
    Get.dialog(
      ConfirmationDialog(
        onTap: () {
          Get.back();
          ApiProvider().callPost(
            completion: (response) {
              stories[userIndex].removeWhere((element) {
                return element.story?.id == story?.id;
              });
            },
            url: Urls.aDeleteStory,
            param: {
              Urls.myUserId: SessionManager.instance.getUserID().toString(),
              Urls.aStoryId: story?.id
            },
          );

          onNext();
          notifyListeners();
        },
        description: S.current.doYouWantToDeleteThisStoryYouCanNot,
        heading: S.current.deleteThisStory,
        padding: const EdgeInsets.symmetric(horizontal: 40),
      ),
    ).then((value) {
      storyController.play();
    });
  }
}
