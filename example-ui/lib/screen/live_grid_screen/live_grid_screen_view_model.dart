import 'dart:async';
import 'dart:convert';
import 'dart:developer';
import 'dart:io';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/common/common_fun.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/common/confirmation_dialog.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/chat_and_live_stream/live_stream.dart';
import 'package:orange_ui/model/generate_token.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/bottom_diamond_shop/bottom_diamond_shop.dart';
import 'package:orange_ui/screen/explore_screen/widgets/reverse_swipe_dialog.dart';
import 'package:orange_ui/screen/live_grid_screen/widgets/live_stream_end_sheet.dart';
import 'package:orange_ui/screen/person_streaming_screen/person_streaming_screen.dart';
import 'package:orange_ui/screen/random_streming_screen/random_streaming_screen.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/utils/app_res.dart';
import 'package:orange_ui/utils/const_res.dart';
import 'package:orange_ui/utils/firebase_res.dart';
import 'package:orange_ui/utils/urls.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:stacked/stacked.dart';

class LiveGridScreenViewModel extends BaseViewModel {
  UserData? userData;
  String? identity;
  List<LiveStreamUser> liveStreamUsers = [];
  List<String?> userEmail = [];
  bool isLoading = false;
  FirebaseFirestore db = FirebaseFirestore.instance;
  late CollectionReference collection;
  StreamSubscription<QuerySnapshot<LiveStreamUser>>? subscription;
  int walletCoin = 0;
  InterstitialAd? interstitialAd;

  Appdata? settingAppData;

  void init() {
    getProfileAPi();
    getSettingData();

    getLiveUsers();
  }

  void onBackBtnTap() {
    if (interstitialAd == null) {
      Get.back();
    } else {
      interstitialAd?.show().whenComplete(() {
        Get.back();
      });
    }
  }

  void initInterstitialAds() {
    CommonFun.interstitialAd((ad) {
      interstitialAd = ad;
    },
        adMobIntId: Platform.isIOS
            ? settingAppData?.admobIntIos
            : settingAppData?.admobInt);
  }

  void goLiveBtnClick() {
    CommonFun.isBloc(
      userData,
      onCompletion: () {
        Get.dialog(
          ConfirmationDialog(
            onTap: onGoLiveYesBtnTap,
            description: S.current.doYouReallyWantToLive,
            dialogSize: 2,
            textButton: S.current.goLive,
            padding: const EdgeInsets.symmetric(horizontal: 40),
          ),
        );
      },
    );
  }

  Future<void> onGoLiveYesBtnTap() async {
    Get.back();
    ApiProvider().callPost(
        completion: (response) async {
          GenerateToken token = GenerateToken.fromJson(response);
          if (token.status == true) {
            LiveStreamUser liveStreamUser = LiveStreamUser(
                userId: userData?.id,
                fullName: userData?.fullname,
                userImage: userData?.profileImage,
                agoraToken: token.token,
                id: DateTime.now().millisecondsSinceEpoch,
                collectedDiamond: 0,
                hostIdentity: userData?.identity,
                isVerified: false,
                joinedUser: [],
                address: userData?.address,
                age: userData?.age,
                watchingCount: 0);

            // You can request multiple permissions at once.
            Map<Permission, PermissionStatus> statuses =
                await [Permission.camera, Permission.microphone].request();

            if (statuses[Permission.camera]!.isGranted &&
                statuses[Permission.microphone]!.isGranted) {
              Get.to(() => RandomStreamingScreen(
                    userData: userData,
                    liveStreamUser: liveStreamUser,
                    settingData: settingAppData,
                  ))?.then((value) async {
                notifyListeners();
              });
            } else {
              CommonUI.snackBar(
                  message:
                      S.current.userDidNotAllowCameraAndMicrophonePermission);
            }
          } else {
            CommonUI.snackBar(message: token.message ?? '');
          }
        },
        url: Urls.aGenerateAgoraToken,
        param: {Urls.channelName: userData?.identity});
  }

  void getLiveUsers() {
    isLoading = true;
    collection = db.collection(FirebaseRes.liveHostList);
    subscription = collection
        .withConverter(
          fromFirestore: (snapshot, options) =>
              LiveStreamUser.fromJson(snapshot.data()),
          toFirestore: (LiveStreamUser value, options) {
            return value.toJson();
          },
        )
        .snapshots()
        .listen((element) {
      liveStreamUsers = [];
      for (int i = 0; i < element.docs.length; i++) {
        liveStreamUsers.add(element.docs[i].data());
      }
      isLoading = false;
      notifyListeners();
    });
  }

  void onLiveStreamProfileTap(LiveStreamUser? user) {
    CommonFun.isBloc(
      userData,
      onCompletion: () {
        String authString = '${ConstRes.customerId}:${ConstRes.customerSecret}';
        String authToken = base64.encode(authString.codeUnits);
        ApiProvider()
            .agoraListStreamingCheck(
                user?.hostIdentity ?? '', authToken, ConstRes.agoraAppId)
            .then((value) {
          if (value.data?.channelExist == true ||
              value.data!.broadcasters!.isNotEmpty) {
            if (userData?.isFake != 1) {
              if ((settingAppData?.liveWatchingPrice ?? 0) <= 0) {
                onImageTap(user);
              } else {
                if ((settingAppData?.liveWatchingPrice ?? 0) < walletCoin) {
                  Get.dialog(ReverseSwipeDialog(
                      onCancelTap: onBackBtnTap,
                      onContinueTap: (isSelected) {
                        Get.back();
                        minusCoinApi().then((value) {
                          onImageTap(user);
                        });
                      },
                      isCheckBoxVisible: false,
                      walletCoin: walletCoin,
                      title1: S.current.liveCap,
                      title2: S.current.streamCap,
                      dialogDisc: AppRes.liveStreamDisc(
                          settingAppData?.liveWatchingPrice ?? 0),
                      coinPrice: '${settingAppData?.liveWatchingPrice ?? 0}'));
                } else {
                  Get.dialog(
                    EmptyWalletDialog(
                      onCancelTap: onBackBtnTap,
                      onContinueTap: () {
                        Get.back();
                        Get.bottomSheet(
                          const BottomDiamondShop(),
                        );
                      },
                      walletCoin: walletCoin,
                    ),
                  );
                }
              }
            } else {
              onImageTap(user);
            }
          } else {
            Get.bottomSheet(LiveStreamEndSheet(
              name: user?.fullName ?? '',
              onExitBtn: () async {
                Get.back();
                db
                    .collection(FirebaseRes.liveHostList)
                    .doc('${user?.userId}')
                    .delete();
                final batch = db.batch();
                var collection = db
                    .collection(FirebaseRes.liveHostList)
                    .doc('${user?.userId}')
                    .collection(FirebaseRes.comments);
                var snapshots = await collection.get();
                for (var doc in snapshots.docs) {
                  batch.delete(doc.reference);
                }
                await batch.commit();
              },
            ));
          }
        });
      },
    );
  }

  Future<void> getProfileAPi() async {
    userData = SessionManager.instance.getUser();

    ApiProvider()
        .getProfile(userID: SessionManager.instance.getUserID())
        .then((value) async {
      userData = value.data;
      walletCoin = (value.data?.wallet ?? 0);
      notifyListeners();
    });
  }

  Future<void> minusCoinApi() async {
    CommonUI.lottieLoader();
    await ApiProvider()
        .minusCoinFromWallet(settingAppData?.liveWatchingPrice ?? 0);
    Get.back();
    getProfileAPi();
  }

  void onImageTap(LiveStreamUser? liveStreamUser) {
    int price = settingAppData?.liveWatchingPrice ?? 0;
    num finalPriceAfterCommission = price;
    int commissionPercent = settingAppData?.streamAndGiftCommission ?? 0;

    if (price > 0 && commissionPercent > 0) {
      finalPriceAfterCommission -= (price * (commissionPercent / 100));
    }

    userEmail.add(userData?.identity);
    final liveStreamUserId = liveStreamUser?.userId;
    if (liveStreamUserId != null) {
      final newWatchingCount = (liveStreamUser?.watchingCount ?? 0) + 1;
      final newCollectedDiamond =
          (liveStreamUser?.collectedDiamond ?? 0) + finalPriceAfterCommission;

      db.collection(FirebaseRes.liveHostList).doc('$liveStreamUserId').update({
        FirebaseRes.watchingCount: newWatchingCount,
        FirebaseRes.joinedUser: FieldValue.arrayUnion(userEmail),
        FirebaseRes.collectedDiamond: newCollectedDiamond
      }).then((_) {
        Get.to(() => PersonStreamingScreen(
              liveStreamUser: liveStreamUser,
              settingAppData: settingAppData,
            ))?.then(
          (value) {
            getProfileAPi();
          },
        );
      }).catchError((error) {
        log("Error occurred while updating live stream data: $error");
      });
    }
  }

  @override
  void dispose() {
    subscription?.cancel();
    super.dispose();
  }

  void getSettingData() {
    settingAppData = SessionManager.instance.getSettings()?.appdata;
    initInterstitialAds();
    notifyListeners();
  }
}
