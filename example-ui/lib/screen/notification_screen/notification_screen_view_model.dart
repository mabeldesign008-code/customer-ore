import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/notification/admin_notification.dart';
import 'package:orange_ui/model/notification/user_notification_model.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/user_detail_screen/user_detail_screen.dart';
import 'package:stacked/stacked.dart';

class NotificationScreenViewModel extends BaseViewModel {
  String notification = S.current.notification;
  int tabIndex = 0;
  int start = 0;
  int adminStart = 0;
  ScrollController userScrollController = ScrollController();
  ScrollController adminScrollController = ScrollController();
  bool isLoading = false;
  bool isUserLoading = false;
  List<AdminNotificationData> adminNotification = [];
  List<UserNotificationData> userNotification = [];

  void init() {
    getUserNotificationApiCall();
    fetchScrollData();
  }

  @override
  void dispose() {
    userScrollController.dispose();
    adminScrollController.dispose();
    super.dispose();
  }

  void getAdminNotificationApiCall() async {
    isLoading = true;
    await ApiProvider().adminNotification(adminStart).then((value) {
      if (adminStart == 0) {
        adminNotification = value.data ?? [];
      } else {
        adminNotification.addAll(value.data!);
      }
      adminStart = adminNotification.length;
      isLoading = false;
      notifyListeners();
    });
  }

  void fetchScrollData() {
    adminScrollController.addListener(
      () {
        if (adminScrollController.offset == adminScrollController.position.maxScrollExtent) {
          if (!isLoading) {
            getAdminNotificationApiCall();
          }
        }
      },
    );
    userScrollController.addListener(
      () {
        if (userScrollController.offset == userScrollController.position.maxScrollExtent) {
          if (!isUserLoading) {
            getUserNotificationApiCall();
          }
        }
      },
    );
  }

  void getUserNotificationApiCall() {
    isUserLoading = true;
    ApiProvider().getUserNotification(start).then((value) async {
      value.data?.forEach((element) {});
      if (start == 0) {
        userNotification = value.data ?? [];
      } else {
        userNotification.addAll(value.data!);
      }
      start = userNotification.length;
      isUserLoading = false;
      notifyListeners();
    });
  }

  void onUserTap(UserData? data) {
    Get.to(() => UserDetailScreen(userData: data));
  }

  void onTabChange(int index) {
    tabIndex = index;
    tabIndex == 0 ? getUserNotificationApiCall() : getAdminNotificationApiCall();
    notifyListeners();
  }
}
