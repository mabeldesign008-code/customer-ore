import 'dart:async';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/map_screen/map_screen.dart';
import 'package:orange_ui/screen/randoms_screen/randoms_screen.dart';
import 'package:orange_ui/screen/user_detail_screen/user_detail_screen.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:stacked/stacked.dart';

class SearchScreenViewModel extends BaseViewModel {
  String selectedTab = '';
  int selectedTabId = 0;
  TextEditingController searchController = TextEditingController();
  List<Interests> tabList = [];
  List<UserData> searchUsers = [];
  bool isLoading = false;
  ScrollController scrollController = ScrollController();
  UserData? myUserData = SessionManager.instance.getUser();

  Appdata? settingAppData;
  Timer? _timer;

  RxList<UserData> filterUsers = <UserData>[].obs;
  RxInt currentFilterUserIndex = 0.obs;

  void init() {
    getInterestApiCall();
    getSearchByUser();
    fetchScrollData();
  }

  void getInterestApiCall() {
    SettingData? settingData = SessionManager.instance.getSettings();
    settingAppData = settingData?.appdata;
    tabList = settingData?.interests ?? [];
    notifyListeners();
  }

  void fetchScrollData() {
    scrollController.addListener(
      () {
        if (scrollController.offset >=
                scrollController.position.maxScrollExtent &&
            !isLoading) {
          if (selectedTab.isEmpty) {
            getSearchByUser();
          } else {
            getSearchById(selectedTabId);
          }
        }
      },
    );
  }

  void getSearchByUser() async {
    isLoading = true;
    notifyListeners();

    _timer?.cancel();
    _timer = Timer(const Duration(milliseconds: 300), () async {
      final response = await ApiProvider().searchUser(
        searchKeyword: searchController.text,
        start: searchUsers.length,
      );
      if (response.data != null) {
        for (var element in response.data!) {
          if (!searchUsers.any((user) => user.id == element.id)) {
            searchUsers.add(element);
          }
        }
      }

      isLoading = false;
      notifyListeners();
    });
  }

  void getSearchById(int interestId) async {
    isLoading = true;
    notifyListeners();
    _timer?.cancel();
    _timer = Timer(const Duration(milliseconds: 300), () async {
      ApiProvider()
          .searchUserById(
              searchKeyword: searchController.text,
              interestId: interestId,
              start: searchUsers.length)
          .then((value) {
        List<String> list =
            searchUsers.map((e) => e.id?.toString() ?? '').toList();
        value.data?.forEach((element) {
          if (!list.contains(element.id?.toString())) {
            searchUsers.add(element);
          }
        });
        isLoading = false;
        notifyListeners();
      });
    });
  }

  void onBackBtnTap() {
    if (selectedTab == '') {
      Get.back();
    } else {
      selectedTab = '';
      searchUsers = [];
      getSearchByUser();
      notifyListeners();
    }
  }

  void onSearchingUser(String value) {
    searchUsers = [];
    if (searchController.text.isEmpty) {
      searchController.clear();
    }
    if (selectedTab.isNotEmpty) {
      getSearchById(selectedTabId);
    } else {
      getSearchByUser();
    }
  }

  void onLocationTap() {
    Get.to(() => const MapScreen());
  }

  void onTabSelect(Interests value) {
    selectedTab = value.title ?? '';
    selectedTabId = value.id ?? -1;
    searchUsers = [];
    getSearchById(selectedTabId);
    notifyListeners();
  }

  void onUserTap(UserData? data) {
    Get.to(() => UserDetailScreen(userData: data));
  }


  @override
  void dispose() {
    scrollController.dispose();
    _timer?.cancel();
    super.dispose();
  }

  void onFilterTap() {
    Get.to(() => const RandomsScreen());
    // Get.bottomSheet(FilterSheet(model: this), isScrollControlled: true);
  }
}
