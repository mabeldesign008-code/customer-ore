import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_card_swiper/flutter_card_swiper.dart';
import 'package:get/get.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/common/common_fun.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/common/location_sheet.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/report.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/bottom_diamond_shop/bottom_diamond_shop.dart';
import 'package:orange_ui/screen/map_screen/map_screen.dart';
import 'package:orange_ui/screen/subscription_sheet/subscription_sheet_controller.dart';
import 'package:orange_ui/screen/user_detail_screen/user_detail_screen.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/service/subscription/subscription_manager.dart';
import 'package:orange_ui/utils/app_res.dart';
import 'package:stacked/stacked.dart';
import 'package:url_launcher/url_launcher.dart';

import 'widgets/reverse_swipe_dialog.dart';

class ExploreScreenViewModel extends BaseViewModel {
  bool isLoading = false;
  int walletCoin = 0;
  UserData? userData;
  bool isCheckboxSelected = false;
  InterstitialAd? interstitialAd;
  int count = 0;
  int suggestSwipeStatus = 0;
  int suggestPhotoTapStatus = 0;
  bool isSwipeDisable = true;
  int currentCombinedIndex = 0;
  Appdata? settingAppData;
  int likeStatus = 0;
  CardSwiperController cardController = CardSwiperController();
  bool isLikeDisLikeStatus = false;
  final controller = Get.find<SubscriptionSheetController>();
  List<UserData> combinedList = [];

  void init() {
    initialCalling();
  }

  // your existing fields...
  final Map<int, PageController> _pageControllers = {};

  /// Returns the page controller for the given card index.
  PageController getPageController(int index) {
    return _pageControllers.putIfAbsent(
        index, () => PageController(initialPage: 0));
  }

  /// Dispose all controllers when screen is disposed
  void disposePageControllers() {
    for (var controller in _pageControllers.values) {
      controller.dispose();
    }
    _pageControllers.clear();
  }

  /// Reset page to 0 when card becomes visible
  void resetPageAt(int index) {
    if (_pageControllers.containsKey(index)) {
      _pageControllers[index]!.jumpToPage(0);
    }
  }

  void initialCalling() {
    prefSetting();
    exploreScreenApiCall();
    getProfileAPi();
    controller.purchaseCallBack = () {
      combinedList.removeWhere((element) => element.id == -1);
      notifyListeners();
    };
  }

  void prefSetting() async {
    settingAppData = SessionManager.instance.getSettings()?.appdata;
    initInterstitialAds();
    notifyListeners();
    suggestSwipeStatus =
        SessionManager.instance.getInt(key: SessionKeys.suggestSwipe);
    suggestPhotoTapStatus =
        SessionManager.instance.getInt(key: SessionKeys.suggestPhotoTap);
    if (suggestSwipeStatus == 1 && suggestPhotoTapStatus == 1) {
      isSwipeDisable = false;
      notifyListeners();
    }
  }

  Future<void> exploreScreenApiCall() async {
    if (combinedList.isEmpty) {
      isLoading = true;
    }
    ApiProvider().getExplorePageProfileList().then((value) async {
      var newData = value.data ?? [];
      combinedList.addAll(newData);
      if (isPurchaseConfig) {
        for (int i = 0; i < combinedList.length; i++) {
          if (isPurchaseConfig &&
              SubscriptionManager.shared.packages.isNotEmpty &&
              !isSubscribe.value &&
              (i + 1) % 5 == 0 &&
              combinedList[i].id != -1) {
            combinedList.insert(i, UserData(id: -1));
          }
        }
      }
      isLoading = false;
      notifyListeners();
    });
  }

  Future<void> getProfileAPi() async {
    ApiProvider()
        .getProfile(userID: SessionManager.instance.getUserID())
        .then((value) async {
      userData = value.data;
      walletCoin = value.data?.wallet ?? 0;
      notifyListeners();
      if (settingAppData?.isDating == 1) {
        final hasOpenedLocationSheet = SessionManager.instance
            .getBool(key: SessionKeys.hasOpenedLocationSheet);

        final isUserLocationMissing =
            userData?.latitude == null || userData?.longitude == null;

        if (!hasOpenedLocationSheet || isUserLocationMissing) {
          locationSheet();
          SessionManager.instance
              .setBool(key: SessionKeys.hasOpenedLocationSheet, value: true);
        } else {
          await CommonFun.getUserCurrentLocation();
        }
      }
    });
    isCheckboxSelected =
        SessionManager.instance.getBool(key: SessionKeys.isDialogDialog);
  }

  void locationSheet() {
    Get.bottomSheet(const LocationSheet(),
        isScrollControlled: true, enableDrag: false);
  }

  bool isSocialBtnVisible(String? socialLink) {
    if (socialLink != null) {
      return socialLink.contains(AppRes.isHttp) ||
          socialLink.contains(AppRes.isHttps);
    } else {
      return false;
    }
  }

  Future<void> minusCoinApi() async {
    walletCoin -= (settingAppData?.reverseSwipePrice ?? 0);
    await ApiProvider()
        .minusCoinFromWallet(settingAppData?.reverseSwipePrice)
        .then((value) {
      if (value.status == false) {
        walletCoin += (settingAppData?.reverseSwipePrice ?? 0);
        notifyListeners();
      }
    });
  }

  void _launchUrl(String url) async {
    if (!await launchUrl(Uri.parse(url),
        mode: LaunchMode.externalApplication)) {
      throw '${S.current.couldNotLaunch} ';
    }
  }

  void onSocialBtnTap(int type) {
    if (type == 0) {
      _launchUrl(combinedList[currentCombinedIndex].youtube ?? '');
    } else if (type == 1) {
      _launchUrl(combinedList[currentCombinedIndex].facebook ?? '');
    } else if (type == 2) {
      _launchUrl(combinedList[currentCombinedIndex].instagram ?? '');
    }
  }

  void _suggestView() {
    if (suggestSwipeStatus == 0) {
      onTapSwipeView();
    } else if (suggestSwipeStatus == 1 && suggestPhotoTapStatus == 0) {
      onSuggestPhotoTap(true);
    } else if (suggestSwipeStatus == 1 && suggestPhotoTapStatus == 1) {
      isSwipeDisable = false;
      notifyListeners();
    }
  }

  void onReverseBtnTap() async {
    bool isSubscription = combinedList[currentCombinedIndex - 1].id == -1;

    if (isSubscription) {
      return cardController.undo();
    }

    _suggestView();

    if (isSwipeDisable || userData == null) return;

    CommonFun.isBloc(
      userData,
      onCompletion: () async {
        if (currentCombinedIndex == 0) return;

        final reverseSwipePrice = settingAppData?.reverseSwipePrice ?? 0;
        if (userData?.isFake != 1 && !isSubscribe.value) {
          if (reverseSwipePrice <= walletCoin && walletCoin != 0) {
            if (!isCheckboxSelected) {
              await Get.dialog(ReverseSwipeDialog(
                  isCheckBoxVisible: true,
                  walletCoin: walletCoin,
                  title1: S.current.reverse,
                  title2: S.current.swipe,
                  dialogDisc: AppRes.reverseSwipeDisc(reverseSwipePrice),
                  coinPrice: '$reverseSwipePrice',
                  onContinueTap: (isSelected) {
                    Get.back();
                    SessionManager.instance.setBool(
                        key: SessionKeys.isDialogDialog, value: isSelected);
                    cardController.undo();
                    minusCoinApi();
                  }));
              getProfileAPi();
            } else {
              cardController.undo();
              minusCoinApi();
            }
          } else {
            // Show empty wallet dialog when user doesn't have enough coins
            Get.dialog(
              EmptyWalletDialog(
                onCancelTap: () => Get.back(),
                onContinueTap: () {
                  Get.back();
                  Get.bottomSheet(const BottomDiamondShop());
                },
                walletCoin: walletCoin,
              ),
            );
          }
        } else {
          cardController.undo();
        }
      },
    );
  }

  void initInterstitialAds() {
    CommonFun.interstitialAd(
      (ad) {
        interstitialAd = ad;
      },
      adMobIntId: Platform.isIOS
          ? settingAppData?.admobIntIos
          : settingAppData?.admobInt,
    );
  }

  void onIndexChange(int index) {
    currentCombinedIndex = index;
    notifyListeners();
  }

  void onTitleTap() {
    CommonFun.isBloc(
      userData,
      onCompletion: () {
        Get.to(() => const MapScreen());
      },
    );
  }

  void onImageTap() {
    CommonFun.isBloc(
      userData,
      onCompletion: () {
        Get.to(() => UserDetailScreen(
            userData: combinedList[currentCombinedIndex],
            onUpdateUser: (userData) {
              _toggleLikeStatus(userData?.isLiked ?? false);
            }));
      },
    );
  }

  bool onUndo(
      int? previousIndex, int currentIndex, CardSwiperDirection direction) {
    currentCombinedIndex = currentIndex;
    notifyListeners();
    return true;
  }

  FutureOr<bool> onSwipe(
      int previousIndex, int? currentIndex, CardSwiperDirection direction) {
    // Handle user block status
    if (userData?.isBlock == 1) {
      CommonUI.snackBarWidget(S.current.userBlock);
      return false;
    }

    // Update the profile index and count, but avoid unnecessary UI refresh
    int newProfileIndex = currentIndex ?? 0;

    if (currentCombinedIndex != newProfileIndex) {
      currentCombinedIndex = newProfileIndex;
      notifyListeners();
    }

    // Trigger API call if near the end of the list
    if (combinedList.length - 3 == currentCombinedIndex ||
        combinedList.length - 1 == currentCombinedIndex) {
      exploreScreenApiCall();
    }
    return true;
  }

  void onLikeDislikeTap(bool isLikeAction) async {
    _suggestView();

    if (isSwipeDisable) return;

    if (likeStatus == 1) return;

    // Set the like/dislike status based on the action
    isLikeDisLikeStatus = isLikeAction;
    likeStatus = 1;
    notifyListeners();

    // Delay to perform the swipe action and reset status
    Future.delayed(const Duration(milliseconds: 250), () {
      likeStatus = 0;
      notifyListeners();
      cardController.swipe(
          isLikeAction ? CardSwiperDirection.right : CardSwiperDirection.left);
    });

    UserData currentUser = combinedList[currentCombinedIndex];

    // Avoid redundant API call if the status is already set
    if (currentUser.isLiked == isLikeAction) return;

    Report response;
    if (isLikeAction) {
      response = await ApiProvider().likedProfile(currentUser.id);
    } else {
      response = await ApiProvider().dislikedProfile(currentUser.id);
    }

    if (response.status == false) {
      currentUser.isLiked = !isLikeAction;
    } else {
      if (!isLikeAction) {
        ApiProvider().sendLocalizedPushNotification(
            key: 'hasLikedYourProfile', userData: userData, deviceToken: currentUser.deviceToken);
      }
    }
    // Toggle the like status in the list
    _toggleLikeStatus(isLikeAction);
  }

  void _toggleLikeStatus(bool isLike) {
    for (var element in combinedList) {
      if (element.id == combinedList[currentCombinedIndex].id) {
        element.isLiked = isLike;
      }
    }
    notifyListeners();
  }

  void onSuggestPhotoTap(bool value, {bool isSwipe = false}) {
    isSwipeDisable = value;
    suggestPhotoTapStatus = 1;
    if (isSwipe) {
      isSwipeDisable = false;
    }
    notifyListeners();
    SessionManager.instance.setInt(key: SessionKeys.suggestPhotoTap, value: 1);
  }

  void onTapSwipeView() {
    suggestSwipeStatus = 1;
    notifyListeners();
    SessionManager.instance.setInt(key: SessionKeys.suggestSwipe, value: 1);
  }

  void onImageLeftTap(PageController pageController, int currentImageIndex) {
    if (currentImageIndex == 0) return;
    pageController.previousPage(
      duration: const Duration(milliseconds: 200),
      curve: Curves.linear,
    );
  }

  void onImageRightTap(
      PageController pageController, int currentImageIndex, int imageLength) {
    if (imageLength - 1 == currentImageIndex) return;
    pageController.nextPage(
        duration: const Duration(milliseconds: 200), curve: Curves.linear);
  }

  @override
  void dispose() {
    cardController.dispose();
    disposePageControllers();

    super.dispose();
  }
}
