import 'dart:io';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/eula/eula_sheet.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/screen/auth_screen/auth_screen.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:stacked/stacked.dart';

class OnBoardingScreenViewModel extends BaseViewModel {
  int selectedPage = 0;
  PageController pageController = PageController();

  init() {
    openEULASheet();
  }

  void onSkip() {
    Get.off(() => const AuthScreen());
  }

  void onNextTap(List<Onboarding> onBoarding) {
    if (selectedPage < onBoarding.length - 1) {
      selectedPage++;
      pageController.animateToPage(
        selectedPage,
        duration: const Duration(milliseconds: 250),
        curve: Curves.linear,
      );
      notifyListeners();
    } else if (selectedPage == onBoarding.length - 1) {
      Get.off(() => const AuthScreen());
    }
  }

  void openEULASheet() {
    bool isNotOpen = SessionManager.instance.getBool(key: SessionKeys.eULA);
    if (Platform.isIOS && !isNotOpen) {
      Future.delayed(
        const Duration(milliseconds: 250),
        () {
          Get.bottomSheet(const EulaSheet(),
              isScrollControlled: true, enableDrag: false);
        },
      );
    }
  }
}
