import 'dart:developer';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/cupertino.dart';
import 'package:get/get.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/common/common_fun.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/common/confirmation_dialog.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/auth_screen/auth_screen.dart';
import 'package:orange_ui/screen/languages_screen/languages_screen.dart';
import 'package:orange_ui/screen/livestream_dashboard_screen/livestream_dashboard_screen.dart';
import 'package:orange_ui/screen/verification_screen/verification_screen.dart';
import 'package:orange_ui/screen/webview_screen/webview_screen.dart';
import 'package:orange_ui/service/firebase_notification_manager.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/utils/firebase_res.dart';
import 'package:orange_ui/utils/urls.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:stacked/stacked.dart';

class OptionalScreenViewModel extends BaseViewModel {
  bool isLoading = false;
  UserData? userData = SessionManager.instance.getUser();
  SettingData? settingData = SessionManager.instance.getSettings();
  FirebaseAuth auth = FirebaseAuth.instance;
  final db = FirebaseFirestore.instance;
  Rx<PackageInfo?> packageInfo = Rx(null);

  void init() async {
    packageInfo.value = await PackageInfo.fromPlatform();

    log("${packageInfo.value?.version} ${packageInfo.value?.data} ${packageInfo.value?.appName} ${packageInfo.value?.buildNumber}");
  }

  void onLiveStreamTap() {
    CommonFun.isBloc(
      userData,
      onCompletion: () {
        Get.to(() => const LiveStreamDashBoard());
      },
    );
  }

  void onApplyForVerTap() {
    CommonFun.isBloc(
      userData,
      onCompletion: () {
        Get.to(() => const VerificationScreen(), arguments: userData)
            ?.then((value) {
          if (value != null) {
            userData?.isVerified = 1;
            notifyListeners();
            SessionManager.instance.setUser(userData);
          }
        });
      },
    );
  }

  void _toggleSetting({
    required int currentStatus,
    required void Function(int newStatus) updateLocalStatus,
    required Future<UserModel> Function(int newStatus) apiCall,
    void Function(int newStatus)? onSuccess,
  }) {
    CommonFun.isBloc(
      userData,
      onCompletion: () {
        final newStatus = currentStatus == 0 ? 1 : 0;
        updateLocalStatus(newStatus);
        notifyListeners();

        apiCall(newStatus).then((value) async {
          if (value.status == true) {
            onSuccess?.call(newStatus);
            SessionManager.instance.setUser(value.data);
          } else {
            // Revert local status on failure
            updateLocalStatus(currentStatus);
            notifyListeners();
          }
        });
      },
    );
  }

  void onNotificationTap() {
    _toggleSetting(
      currentStatus: userData?.isNotification ?? 0,
      updateLocalStatus: (newStatus) => userData?.isNotification = newStatus,
      apiCall: (newStatus) => ApiProvider().onOffNotification(newStatus),
      onSuccess: (newStatus) {
        if (newStatus == 1) {
          FirebaseNotificationManager.shared.subscribeToTopic();
        } else {
          FirebaseNotificationManager.shared.unsubscribeToTopic();
        }
      },
    );
  }

  void onShowMeOnMapTap() {
    _toggleSetting(
      currentStatus: userData?.showOnMap ?? 0,
      updateLocalStatus: (newStatus) => userData?.showOnMap = newStatus,
      apiCall: (newStatus) => ApiProvider().onOffShowMeOnMap(newStatus),
    );
  }

  void onGoAnonymousTap() {
    _toggleSetting(
      currentStatus: userData?.anonymous ?? 0,
      updateLocalStatus: (newStatus) => userData?.anonymous = newStatus,
      apiCall: (newStatus) => ApiProvider().onOffAnonymous(newStatus),
    );
  }

  void onNavigateWebViewScreen(int type) {
    Get.to(
      () => WebViewScreen(
          appBarTitle:
              type == 0 ? S.current.privacyPolicy : S.current.termsOfUse,
          url: type == 0 ? Urls.aPrivacyPolicy : Urls.aTermsOfUse),
    );
  }

  Future<void> onLogOutYesBtnClick() async {
    if (userData?.loginType == 1) {
      await googleSignOut();
    }
    if (userData?.loginType == 4) {
      await FirebaseAuth.instance.signOut();
    }
    ApiProvider().logoutUser().then((value) {
      SessionManager.instance.setBool(key: SessionKeys.isLogin, value: false);
      CommonUI.snackBarWidget('${value.message}');
      Get.offAll(() => const AuthScreen());
    });
  }

  void onLogoutTap() async {
    Get.dialog(ConfirmationDialog(
      onTap: onLogOutYesBtnClick,
      description: S.current.logOutDis,
      textButton: '${S.current.logOut} ',
      dialogSize: 1.9,
      padding: const EdgeInsets.symmetric(horizontal: 40),
    ));
  }

  Future googleSignOut() async {
    await GoogleSignIn.instance.signOut();
    await FirebaseAuth.instance.signOut();
  }

  void onDeleteYesBtnClick() async {
    Get.back();
    CommonUI.lottieLoader();
    ApiProvider().deleteAccount(userData?.id).then((value) async {
      if (value.status == true) {
        await deleteFirebaseUser();
        CommonUI.snackBarWidget(value.message ?? '');
        SessionManager.instance.setBool(key: SessionKeys.isLogin, value: false);
        deleteCurrentUser();
        Get.offAll(() => const AuthScreen());
      }
      notifyListeners();
    });
  }

  Future<void> deleteCurrentUser() async {
    try {
      User? user = FirebaseAuth.instance.currentUser;

      if (user != null) {
        await user.delete(); // Deletes the account
        log("User account deleted successfully.");
      } else {
        log("No user is signed in.");
      }
    } on FirebaseAuthException catch (e) {
      if (e.code == 'requires-recent-login') {
        log('⚠️ The user must re-authenticate before deleting their account.');
        reAuthenticateAndDelete(userData?.identity ?? '');
        // Prompt for re-authentication here
      } else {
        log('❌ Error: ${e.message}');
      }
    }
  }

  Future<void> reAuthenticateAndDelete(String email) async {
    try {
      User? user = FirebaseAuth.instance.currentUser;

      if (user != null) {
        String? password =
            SessionManager.instance.getString(key: SessionKeys.password);
        if (password == null) return;
        AuthCredential credential =
            EmailAuthProvider.credential(email: email, password: password);

        await user.reauthenticateWithCredential(credential);
        await user.delete();

        log("User re-authenticated and deleted.");
      }
    } catch (e) {
      log("Error: $e");
    }
  }

  Future<void> deleteFirebaseUser() async {
    String deletedTimeId = '${DateTime.now().millisecondsSinceEpoch}';

    Map<String, dynamic> map = {
      FirebaseRes.isDeleted: true,
      FirebaseRes.deletedId: deletedTimeId,
      FirebaseRes.block: false,
      FirebaseRes.blockFromOther: false,
    };

    await db
        .collection(FirebaseRes.userChatList)
        .doc('${userData?.id}')
        .collection(FirebaseRes.userList)
        .get()
        .then((value) {
      for (var element in value.docs) {
        db
            .collection(FirebaseRes.userChatList)
            .doc(element.id)
            .collection(FirebaseRes.userList)
            .doc('${userData?.id}')
            .update(map);

        db
            .collection(FirebaseRes.userChatList)
            .doc('${userData?.id}')
            .collection(FirebaseRes.userList)
            .doc(element.id)
            .update(map);
      }
    });
  }

  void onDeleteAccountTap() {
    Get.dialog(ConfirmationDialog(
      onTap: onDeleteYesBtnClick,
      description: S.current.deleteDialogDis,
      dialogSize: 1.6,
      padding: const EdgeInsets.symmetric(horizontal: 40),
    ));
  }

  void navigateLanguage() {
    Get.to(() => const LanguagesScreen());
  }
}
