import 'package:flutter/material.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/model/user/fetch_users.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/utils/app_res.dart';
import 'package:orange_ui/utils/urls.dart';
import 'package:stacked/stacked.dart';

enum FollowFollowingType { follower, following }

class FollowFollowingScreenViewModel extends BaseViewModel {
  List<UserData> users = [];
  FollowFollowingType followFollowingType;
  int userId;
  ScrollController scrollController = ScrollController();

  FollowFollowingScreenViewModel(this.followFollowingType, this.userId);

  bool hasNoMoreData = false;
  bool isLoading = true;

  void init() {
    fetchFollowingList();
    fetchScrollList();
  }

  void fetchFollowingList() {
    if (hasNoMoreData) {
      return;
    }
    isLoading = true;

    Map<String, dynamic> param = {};

    param[Urls.userId] = userId;
    param[Urls.aStart] = users.length;
    param[Urls.aLimit] = AppRes.paginationLimit;

    ApiProvider().callPost(
        completion: (response) {
          FetchUsers fetchUsers = FetchUsers.fromJson(response);
          if (users.isEmpty) {
            users = fetchUsers.data ?? [];
          } else {
            users.addAll(fetchUsers.data ?? []);
          }
          if (AppRes.paginationLimit > (fetchUsers.data ?? []).length) {
            hasNoMoreData = true;
          }
          isLoading = false;
          notifyListeners();
        },
        url: followFollowingType == FollowFollowingType.following
            ? Urls.aFetchFollowingList
            : Urls.aFetchFollowersList,
        param: param);
  }

  fetchScrollList() {
    scrollController.addListener(
      () {
        if (scrollController.offset ==
            scrollController.position.maxScrollExtent) {
          if (!isLoading) {
            fetchFollowingList();
          }
        }
      },
    );
  }
}
