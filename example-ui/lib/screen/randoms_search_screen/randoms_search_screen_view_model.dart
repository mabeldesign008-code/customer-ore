import 'dart:math';

import 'package:flutter/cupertino.dart';
import 'package:get/get.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/user_detail_screen/user_detail_screen.dart';
import 'package:stacked/stacked.dart';
import 'package:url_launcher/url_launcher.dart';

class RandomsSearchScreenViewModel extends BaseViewModel {
  bool isLoading = false;
  UserData? userData;
  int selectedGender = 3;
  PageController pageController = PageController();
  int currentPageIndex = 0;

  void init() {
    pageController = PageController(initialPage: 0, viewportFraction: 1.01)
      ..addListener(() {
        changeMainImage();
      });
    getRandomApiCall();
  }

  RandomsSearchScreenViewModel(this.selectedGender);

  void getRandomApiCall() async {
    isLoading = true;
    await Future.delayed(Duration(seconds: Random().nextInt(5)));
    ApiProvider()
        .getRandomProfile(
            gender: selectedGender == 1
                ? 1
                : selectedGender == 2
                    ? 2
                    : 3)
        .then((value) {
      isLoading = false;
      if (value.status == true) {
        userData = value.data;
      }
      notifyListeners();
    });
  }

  void onCancelTap() {
    Get.back();
  }

  void onNextTap() {
    getRandomApiCall();
    notifyListeners();
  }

  void onBackBtnTap() {
    Get.back();
  }

  void onLeftBtnClick() {
    if (currentPageIndex == 0) return;
    currentPageIndex--;
    pageController.animateToPage(currentPageIndex,
        duration: const Duration(milliseconds: 200), curve: Curves.easeIn);
    notifyListeners();
  }

  void onRightBtnClick() {
    if ((userData?.images ?? []).length - 1 == currentPageIndex) return;
    currentPageIndex++;
    pageController.animateToPage(currentPageIndex,
        duration: const Duration(milliseconds: 200), curve: Curves.easeIn);
    notifyListeners();
  }

  void changeMainImage() {
    if (pageController.page!.round() != currentPageIndex) {
      currentPageIndex = pageController.page!.round();
      notifyListeners();
    }
  }

  void onLiveBtnTap() {
    // Get.to(() => const PremiumScreen());
  }

  void onImageTap() {
    Get.to(
      () => UserDetailScreen(
        userData: userData,
      ),
    );
  }

  void _launchUrl(String url) async {
    if (!await launchUrl(Uri.parse(url))) throw 'Could not launch ';
  }

  bool isSocialBtnVisible(String? socialLink) {
    if (socialLink != null) {
      return socialLink.contains("http://") || socialLink.contains("https://");
    } else {
      return false;
    }
  }

  void onInstagramTap() {
    _launchUrl(userData?.instagram ?? '');
  }

  void onFBTap() {
    _launchUrl(userData?.facebook ?? '');
  }

  void onYoutubeTap() {
    _launchUrl(userData?.youtube ?? '');
  }
}
