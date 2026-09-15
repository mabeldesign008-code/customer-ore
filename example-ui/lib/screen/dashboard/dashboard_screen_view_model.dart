import 'package:app_badge_plus/app_badge_plus.dart';
import 'package:get/get.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/common/common_fun.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/model/social/post/add_post.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/create_profile_screen/create_profile_screen_view_model.dart';
import 'package:orange_ui/screen/live_grid_screen/live_grid_screen.dart';
import 'package:orange_ui/screen/notification_screen/notification_screen.dart';
import 'package:orange_ui/screen/search_screen/search_screen.dart';
import 'package:orange_ui/screen/single_post_screen/single_post_screen.dart';
import 'package:orange_ui/screen/subscription_sheet/subscription_sheet_controller.dart';
import 'package:orange_ui/screen/user_detail_screen/user_detail_screen.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/service/share_manager.dart';
import 'package:orange_ui/service/subscription/subscription_manager.dart';
import 'package:orange_ui/utils/urls.dart';
import 'package:stacked/stacked.dart';

class DashboardScreenViewModel extends BaseViewModel {
  int pageIndex = 0;
  UserData? userData;

  Appdata? settingAppData = SessionManager.instance.getSettings()?.appdata;
  BannerAd? bannerAd;

  void init() {
    AppBadgePlus.updateBadge(0);
    initBranch();
    getProfileApiCall();
  }

  void getProfileApiCall() {
    ApiProvider()
        .getProfile(userID: SessionManager.instance.getUserID())
        .then((value) {
      userData = value.data;
      notifyListeners();
    });
    notifyListeners();
    final isRegister = Get.isRegistered<CreateProfileScreenViewModel>();
    if (isRegister) {
      Get.delete<CreateProfileScreenViewModel>();
    }
    SubscriptionManager.shared.subscriptionListener();
    Get.put(SubscriptionSheetController());
  }

  void onBottomBarTap(int index) {
    if (userData?.isBlock == 1 && index == 4) {
      pageIndex = index;
    } else {
      CommonFun.isBloc(
        userData,
        onCompletion: () {
          pageIndex = index;
        },
      );
    }
    notifyListeners();
  }

  void initBranch() {
    ShareManager.shared.listen((key, value) {
      switch (key) {
        case ShareKeys.post:
          ApiProvider().callPost(
              completion: (response) {
                AddPost post = AddPost.fromJson(response);
                if (post.status == true) {
                  Get.to(() => SinglePostScreen(post: post.data));
                } else {
                  CommonUI.snackBar(message: post.message ?? '');
                }
              },
              url: Urls.aFetchPostByPostId,
              param: {Urls.userId: SessionManager.instance.getUserID().toString(), Urls.aPostId: value});
        case ShareKeys.user:
          Get.to(() => UserDetailScreen(userId: value));
      }
    });
  }

  void onNotificationTap() {
    CommonFun.isBloc(
      userData,
      onCompletion: () {
        Get.to(() => const NotificationScreen());
      },
    );
  }

  void onLivesBtnClick() {
    Get.to(() => const LiveGridScreen());
  }

  void onSearchTap() {
    CommonFun.isBloc(
      userData,
      onCompletion: () {
        Get.to(() => const SearchScreen());
      },
    );
  }
}

class ImageText {
  final String image;
  final String title;

  ImageText(this.image, this.title);
}
