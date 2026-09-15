import 'dart:async';
import 'dart:developer';

import 'package:agora_rtc_engine/agora_rtc_engine.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/chat_and_live_stream/live_stream.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/bottom_diamond_shop/bottom_diamond_shop.dart';
import 'package:orange_ui/screen/explore_screen/widgets/reverse_swipe_dialog.dart';
import 'package:orange_ui/screen/person_streaming_screen/widgets/bottom_purchase_shit.dart';
import 'package:orange_ui/screen/user_detail_screen/user_detail_screen.dart';
import 'package:orange_ui/screen/user_report_screen/report_sheet.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/utils/app_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/const_res.dart';
import 'package:orange_ui/utils/firebase_res.dart';
import 'package:stacked/stacked.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

class PersonStreamingScreenViewModel extends BaseViewModel {
  FirebaseFirestore db = FirebaseFirestore.instance;

  String channelId = '';
  String token = '';

  int streamId = -1;
  int? _remoteUid;
  int countDownValue = 0;
  int currentWalletAmount = 0;

  List<LiveStreamComment> commentList = [];
  List<int> users = <int>[];
  List<Gifts> giftList = [];
  List<int> gemsList = [];

  Timer? timer;

  // bool isBroadcasting = false;
  bool muted = false;
  bool isCheckboxSelected = false;
  bool isLoading = false;

  late RtcEngine _engine;

  LiveStreamUser? liveStreamUser;
  CollectionReference? collectionReference;
  UserData? myUserData;
  TextEditingController commentController = TextEditingController();
  FocusNode commentFocus = FocusNode();
  StringBuffer concatenate = StringBuffer();
  Appdata? settingAppData;

  PersonStreamingScreenViewModel(
      {required this.liveStreamUser, this.settingAppData});

  void init() {
    WakelockPlus.enable();
    channelId = liveStreamUser?.hostIdentity ?? '';
    token = liveStreamUser?.agoraToken ?? '';
    initializeAgora();
    giftApiCall();
  }

  void countDown() async {
    if (myUserData?.isFake != 1) {
      if ((settingAppData?.liveWatchingPrice ?? 0) > 0) {
        timer = Timer.periodic(
          const Duration(seconds: 1),
          (timer) {
            countDownValue++;
            if (countDownValue == 60) {
              !isCheckboxSelected ? timer.cancel() : null;
              if ((settingAppData?.liveWatchingPrice ?? 0) <=
                      currentWalletAmount &&
                  currentWalletAmount != 0) {
                isCheckboxSelected
                    ? autoDebitCoin()
                    : Get.dialog(
                        ReverseSwipeDialog(
                            onCancelTap: () {
                              updateWatchingCount();
                              if (Get.isBottomSheetOpen == true) {
                                Get.back();
                              }
                              Get.back();
                              Get.back();
                              _engine.leaveChannel();
                              _engine.release();
                            },
                            onContinueTap: (isSelected) async {
                              SessionManager.instance.setBool(
                                  key: SessionKeys.liveStream,
                                  value: isSelected);
                              minusCoinApi(
                                  price:
                                      settingAppData?.liveWatchingPrice ?? 0);
                              countDownValue = 0;
                              this.timer?.cancel();
                              countDown();
                              Get.back();
                            },
                            isCheckBoxVisible: true,
                            walletCoin: currentWalletAmount,
                            title1: S.current.liveCap,
                            title2: S.current.streamCap,
                            dialogDisc: AppRes.liveStreamDisc(
                                settingAppData?.liveWatchingPrice ?? 0),
                            coinPrice:
                                '${settingAppData?.liveWatchingPrice ?? 0}'),
                        barrierColor: ColorRes.black.withValues(alpha: 0.44),
                      );
              } else {
                timer.cancel();
                Get.dialog(
                  EmptyWalletDialog(
                    walletCoin: currentWalletAmount,
                    onContinueTap: () {
                      Get.back();
                      Get.bottomSheet<int>(
                        const BottomDiamondShop(),
                        backgroundColor: ColorRes.transparent,
                      ).then((value) {
                        if (Get.isBottomSheetOpen == true) {
                          //
                        } else {
                          updateWatchingCount();
                          Get.back();
                        }
                        if (value != null) {
                          currentWalletAmount += value;
                          myUserData?.wallet =
                              (myUserData?.wallet ?? 0) + value;
                          notifyListeners();
                        }
                      });
                    },
                    onCancelTap: () {
                      updateWatchingCount();
                      if (Get.isBottomSheetOpen == true) {
                        Get.back();
                      }
                      Get.back();
                      Get.back();
                    },
                  ),
                );
              }
            }
            notifyListeners();
          },
        );
      }
    }
  }

  Future<void> minusCoinApi({required int price}) async {
    await ApiProvider().minusCoinFromWallet(price).then((value) {
      num finalPriceAfterCommission = price;
      int commissionPercent = settingAppData?.streamAndGiftCommission ?? 0;

      if (price > 0 && commissionPercent > 0) {
        finalPriceAfterCommission -= (price * (commissionPercent / 100));
      }

      if (value.status == true) {
        db
            .collection(FirebaseRes.liveHostList)
            .doc('${liveStreamUser?.userId}')
            .update({
          FirebaseRes.collectedDiamond:
              (liveStreamUser?.collectedDiamond ?? 0) +
                  finalPriceAfterCommission
        }).catchError((e) {
          debugPrint(e);
        }).then((value) {
          myUserData?.wallet = (myUserData?.wallet ?? 0) - price;
          SessionManager.instance.setUser(myUserData);
          currentWalletAmount -= price;
          notifyListeners();
        });
      }
    });
  }

  void autoDebitCoin() {
    minusCoinApi(price: settingAppData?.liveWatchingPrice ?? 0).then((value) {
      countDownValue = 0;
      timer?.cancel();
      countDown();
    });
  }

  void giftApiCall() async {
    ApiProvider().getSettingData().then((value) {
      giftList = value.data?.gifts ?? [];
      settingAppData = value.data?.appdata;
      notifyListeners();
    });
    isCheckboxSelected =
        SessionManager.instance.getBool(key: SessionKeys.liveStream);
    getProfileApiCall();
  }

  // void getDiamondPackApiCall() {
  //   ApiProvider().getDiamondPack().then((value) {
  //     notifyListeners();
  //   });
  // }

  Future<void> getProfileApiCall() async {
    ApiProvider()
        .getProfile(userID: SessionManager.instance.getUserID())
        .then((value) async {
      currentWalletAmount = value.data?.wallet ?? 0;
      notifyListeners();
    });
  }

  Future<void> initializeAgora() async {
    isLoading = true;
    notifyListeners();

    // Create RtcEngine instance
    _engine = createAgoraRtcEngine();

    // Initialize RtcEngine and set the channel profile to live broadcasting
    await _engine.initialize(const RtcEngineContext(
      appId: ConstRes.agoraAppId,
      channelProfile: ChannelProfileType.channelProfileLiveBroadcasting,
    ));
    // Enable the video module
    await _engine.enableVideo();
    // Enable local video preview
    await _engine.startPreview();
    await _engine.joinChannel(
      token: token,
      channelId: channelId,
      options: const ChannelMediaOptions(
        clientRoleType: ClientRoleType.clientRoleAudience,
        audienceLatencyLevel:
            AudienceLatencyLevelType.audienceLatencyLevelUltraLowLatency,
      ),
      uid: 0,
    );
    isLoading = false;
    notifyListeners();
    // Add an event handler
    _engine.registerEventHandler(
      RtcEngineEventHandler(
        // Occurs when the local user joins the channel successfully
        onJoinChannelSuccess: (RtcConnection connection, int elapsed) {
          notifyListeners();
        },
        // Occurs when a remote user join the channel
        onUserJoined: (RtcConnection connection, int remoteUid, int elapsed) {
          _remoteUid = remoteUid;
          notifyListeners();
        },
        // Occurs when a remote user leaves the channel
        onUserOffline: (RtcConnection connection, int remoteUid,
            UserOfflineReasonType reason) {
          _remoteUid = null;
          notifyListeners();

          if (Get.isDialogOpen == true) {
            Get.back();
          }
          if (Get.isBottomSheetOpen == true) {
            Get.back();
          }
          Get.back();
        },
      ),
    );
    initFirebase();
  }

  // Widget to display remote video
  Widget remoteVideo() {
    if (_remoteUid != null) {
      return AgoraVideoView(
        controller: VideoViewController.remote(
          rtcEngine: _engine,
          canvas: VideoCanvas(uid: _remoteUid),
          connection: RtcConnection(channelId: channelId),
        ),
      );
    } else {
      return CommonUI.lottieWidget();
    }
  }

  void onViewTap() {}

  void onMoreBtnTap() {
    Get.bottomSheet(
        ReportSheet(
          reportId: liveStreamUser?.id,
          fullName: liveStreamUser?.fullName,
          profileImage: liveStreamUser?.userImage,
          age: liveStreamUser?.age,
          address: liveStreamUser?.address,
          reportType: 1,
        ),
        isScrollControlled: true);
  }

  void onCommentSend() {
    if (commentController.text.trim().isNotEmpty) {
      collectionReference?.add(LiveStreamComment(
        id: DateTime.now().millisecondsSinceEpoch,
        userImage: myUserData?.profileImage,
        userId: myUserData?.id,
        city: myUserData?.address ?? '',
        isHost: false,
        comment: commentController.text.trim(),
        commentType: FirebaseRes.msg,
        userName: myUserData?.fullname ?? '',
      ).toJson());
    }
    commentController.clear();
    commentFocus.unfocus();
  }

  void onGiftBtnTap() {
    log('$currentWalletAmount');
    Get.bottomSheet(
        BottomPurchaseShirt(
          giftList: giftList,
          onAddDiamonds: onAddDiamonds,
          onGiftTap: onGiftTap,
          diamond: currentWalletAmount,
          userData: myUserData,
        ),
        isScrollControlled: true);
  }

  void onAddDiamonds() {
    Get.back();
    Get.bottomSheet<int>(
      const BottomDiamondShop(),
      backgroundColor: ColorRes.transparent,
    ).then((value) {
      if (value != null) {
        currentWalletAmount += value;
        myUserData?.wallet = (myUserData?.wallet ?? 0) + value;
        notifyListeners();
      }
    });
  }

  Future<void> onGiftTap(Gifts? data) async {
    collectionReference?.add(LiveStreamComment(
      id: DateTime.now().millisecondsSinceEpoch,
      userImage: myUserData?.profileImage,
      userId: myUserData?.id,
      city: myUserData?.address ?? '',
      isHost: false,
      comment: data?.image ?? '',
      commentType: FirebaseRes.image,
      userName: myUserData?.fullname ?? '',
    ).toJson());

    minusCoinApi(price: data?.coinPrice ?? 0);
    Get.back();
  }

  void initFirebase() async {
    myUserData = SessionManager.instance.getUser();
    notifyListeners();
    countDown();
    db
        .collection(FirebaseRes.liveHostList)
        .doc('${liveStreamUser?.userId}')
        .withConverter(
          fromFirestore: (snapshot, options) =>
              LiveStreamUser.fromJson(snapshot.data()),
          toFirestore: (value, options) {
            return LiveStreamUser().toJson();
          },
        )
        .snapshots()
        .any((element) {
      liveStreamUser = element.data();
      notifyListeners();
      return false;
    });

    collectionReference = db
        .collection(FirebaseRes.liveHostList)
        .doc('${liveStreamUser?.userId}')
        .collection(FirebaseRes.comments);

    collectionReference
        ?.orderBy(FirebaseRes.id, descending: true)
        .withConverter(
          fromFirestore: LiveStreamComment.fromFirestore,
          toFirestore: (LiveStreamComment value, options) {
            return value.toFirestore();
          },
        )
        .snapshots()
        .any((element) {
      commentList = [];
      for (int i = 0; i < element.docs.length; i++) {
        commentList.add(element.docs[i].data());
        notifyListeners();
      }
      return false;
    });
  }

  void onUserTap() {
    updateWatchingCount();
    Get.off(() => UserDetailScreen(userId: liveStreamUser?.userId));
  }

  void onExitTap() async {
    CommonUI.lottieLoader();
    updateWatchingCount();
    Get.back();
    Get.back();
  }

  void updateWatchingCount() async {
    try {
      // Check if liveStreamUser and liveStreamUser.watchingCount are not null
      int watchingCount = (liveStreamUser?.watchingCount ?? 0) - 1;

      // Ensure the count does not go below 0
      if (watchingCount < 0) {
        watchingCount = 0;
      }

      // Update the Firestore document
      await db
          .collection(FirebaseRes.liveHostList)
          .doc('${liveStreamUser?.userId}')
          .update(
        {FirebaseRes.watchingCount: watchingCount},
      );
    } catch (e) {
      log("Failed to update watching count: $e");
    }
  }

  @override
  void dispose() {
    WakelockPlus.disable();
    // clear users
    users.clear();
    // destroy sdk and leave channel
    timer?.cancel();
    _dispose();
    super.dispose();
  }

  Future<void> _dispose() async {
    await _engine.leaveChannel(); // Leave the channel
    await _engine.release(); // Release resources
  }
}
