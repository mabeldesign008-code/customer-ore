import 'package:flutter/material.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/model/social/post/add_comment.dart';
import 'package:orange_ui/model/social/post/fetch_post_by_user.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/service/session_manager.dart';

import 'package:orange_ui/utils/app_res.dart';
import 'package:orange_ui/utils/urls.dart';
import 'package:stacked/stacked.dart';

class HashtagScreenViewModel extends BaseViewModel {
  String hashTag;

  ScrollController scrollController = ScrollController();
  List<Post> posts = [];
  bool isLoading = true;
  HashtagScreenViewModel(this.hashTag);

  init() {
    fetchPostByHashTag();
  }

  void fetchPostByHashTag() {
    isLoading = true;
    ApiProvider().callPost(
        completion: (response) {
          isLoading = false;
          FetchPostByUser fetchPostByUser = FetchPostByUser.fromJson(response);
          if (posts.isEmpty) {
            posts = fetchPostByUser.data ?? [];
          } else {
            posts.addAll(fetchPostByUser.data ?? []);
          }
          notifyListeners();
        },
        url: Urls.aFetchPostsByHashtag,
        param: {
          Urls.userId: SessionManager.instance.getUserID().toString(),
          Urls.aStart: posts.length,
          Urls.aLimit: AppRes.paginationLimit,
          Urls.aHashtag: hashTag.replaceAll('#', '')
        });
  }

  onDeleteItem(int id) {
    posts.removeWhere((element) => element.id == id);
    notifyListeners();
  }

  updateAllPost(UserData data) {
    for (var element in posts) {
      if (element.userId == data.id) {
        element.user = data;
      }
    }
    notifyListeners();
  }
}
