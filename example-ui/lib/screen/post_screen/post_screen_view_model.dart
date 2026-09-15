import 'package:flutter/material.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/model/social/post/add_comment.dart';
import 'package:orange_ui/model/social/post/fetch_post_by_user.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/service/session_manager.dart';

import 'package:orange_ui/utils/app_res.dart';
import 'package:orange_ui/utils/urls.dart';
import 'package:stacked/stacked.dart';

class PostScreenViewModel extends BaseViewModel {
  UserData? userData;
  List<Post> posts = [];
  bool isLoading = true;
  ScrollController scrollController = ScrollController();
  bool hasNoMoreData = false;

  init() {
    fetchPostByUse();
    fetchScrollData();
  }

  PostScreenViewModel(this.userData);

  void fetchPostByUse() {
    if (hasNoMoreData) {
      return;
    }
    isLoading = true;
    ApiProvider().callPost(
        completion: (response) {
          FetchPostByUser fetchPostByUser = FetchPostByUser.fromJson(response);
          if (posts.isEmpty) {
            posts = fetchPostByUser.data ?? [];
          } else {
            posts.addAll(fetchPostByUser.data ?? []);
          }
          if (AppRes.paginationLimit > (fetchPostByUser.data ?? []).length) {
            hasNoMoreData = true;
          }
          isLoading = false;
          notifyListeners();
        },
        url: Urls.aFetchPostByUser,
        param: {
          Urls.myUserId: SessionManager.instance.getUserID().toString(),
          Urls.userId: userData?.id,
          Urls.aStart: posts.length,
          Urls.aLimit: AppRes.paginationLimit
        });
  }

  void fetchScrollData() {
    scrollController.addListener(() {
      if (scrollController.offset == scrollController.position.maxScrollExtent) {
        if (!isLoading) {
          fetchPostByUse();
        }
      }
    });
  }

  onDeleteItem(int id) {
    posts.removeWhere((element) => element.id == id);
    notifyListeners();
  }

  updateAllPost(UserData? data) {
    for (var element in posts) {
      if (element.userId == data?.id) {
        element.user = data;
      }
    }
    notifyListeners();
  }
}
