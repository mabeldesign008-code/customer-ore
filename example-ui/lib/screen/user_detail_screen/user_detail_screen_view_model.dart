import 'dart:io';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:get/get.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/common/common_fun.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/chat_and_live_stream/chat.dart';
import 'package:orange_ui/model/chat_and_live_stream/live_stream.dart';
import 'package:orange_ui/model/report.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/model/user/follow_user.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/chat_screen/chat_screen.dart';
import 'package:orange_ui/screen/edit_profile_screen/edit_profile_screen.dart';
import 'package:orange_ui/screen/person_streaming_screen/person_streaming_screen.dart';
import 'package:orange_ui/screen/post_screen/post_screen.dart';
import 'package:orange_ui/screen/user_report_screen/report_sheet.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/service/share_manager.dart';
import 'package:orange_ui/utils/firebase_res.dart';
import 'package:orange_ui/utils/urls.dart';
import 'package:stacked/stacked.dart';

class UserDetailScreenViewModel extends BaseViewModel {
  FirebaseFirestore db = FirebaseFirestore.instance;

  UserData? otherUserData;
  UserData? myUserData = SessionManager.instance.getUser();
  LiveStreamUser? liveStreamUser;
  InterstitialAd? interstitialAd;
  Appdata? settingAppData;

  bool isFollowInProgress = false;
  bool isLikeProgress = false;
  bool isSavedProgress = false;

  bool isLoading = false;
  bool moreInfo = false;
  bool showDropdown = false;
  bool isFollow = true;

  List<String?> joinedUsers = [];

  String latitude = '';
  String longitude = '';
  String blockUnBlock = S.current.block;
  String reason = S.current.cyberbullying;

  int? userId;
  int selectedImgIndex = 0;
  int myUserId = SessionManager.instance.getUserID();

  Function(UserData? userData)? onUpdateUser;

  UserDetailScreenViewModel({this.userId, this.otherUserData, this.onUpdateUser});

  void init(bool? showInfo) {
    getSettingData();
    userDetailApiCall();
  }

  void userDetailApiCall() async {
    userProfileApiCall().then((value) {
      registrationUserApiCall();
    });
  }

  Future<void> userProfileApiCall() async {
    isLoading = true;
    final profileResponse = await ApiProvider().getProfile(userID: userId ?? otherUserData?.id);
    isLoading = false;
    if (profileResponse.status == true) {
      otherUserData = profileResponse.data;

      isFollow = otherUserData?.followingStatus == 2 ||
          otherUserData?.followingStatus == 3; // Determine if the user is followed
    } else {
      CommonUI.snackBar(message: profileResponse.message ?? '');
    }
    notifyListeners();
  }

  Future<void> registrationUserApiCall() async {
    // Latest userdata
    await ApiProvider().getProfile(userID: myUserId).then((value) {
      if (value.status == true) {
        myUserData = value.data;
        blockUnBlock =
            value.data?.blockedUsers?.contains('${otherUserData?.id}') == true ? S.current.unBlock : S.current.block;
        notifyListeners();
      }
    });
  }

  void onReasonChange(String value) {
    reason = value;
    showDropdown = false;
    notifyListeners();
  }

  void onReasonTap() {
    showDropdown = !showDropdown;
    notifyListeners();
  }

  void onImageSelect(int index) {
    selectedImgIndex = index;
    notifyListeners();
  }

  void onJoinBtnTap() {
    // Extract user images and add the current user to the joined users list
    final images = otherUserData?.images;
    joinedUsers.add(otherUserData?.identity ?? '');

    // Create a new LiveStreamUser instance
    liveStreamUser = LiveStreamUser(
      userId: otherUserData?.id,
      userImage: images != null && images.isNotEmpty ? images[0].image : '',
      id: DateTime.now().millisecondsSinceEpoch,
      watchingCount: 0,
      joinedUser: [],
      isVerified: otherUserData?.isVerified == 2,
      hostIdentity: otherUserData?.identity,
      collectedDiamond: 0,
      agoraToken: '',
      fullName: otherUserData?.fullname ?? '',
      age: otherUserData?.age ?? 0,
      address: otherUserData?.address ?? '',
    );

    // Update Firestore with joined user and increment the watching count
    db.collection(FirebaseRes.liveHostList).doc('${otherUserData?.id}').update({
      FirebaseRes.joinedUser: FieldValue.arrayUnion(joinedUsers),
      FirebaseRes.watchingCount: FieldValue.increment(1),
    }).then((value) {
      // Navigate to PersonStreamingScreen on success
      Get.to(() => const PersonStreamingScreen(), arguments: {
        Urls.aChannelId: otherUserData?.identity,
        Urls.aIsBroadcasting: false,
        Urls.aUserInfo: liveStreamUser,
      });
    }).catchError((e) {
      // Show error snackBar if the user is not live
      CommonUI.snackBarWidget(S.current.userNotLive);
    });
  }

  void onBackTap() {
    UserData? userData = SessionManager.instance.getUser();
    if (userData?.id == otherUserData?.id) {
      Get.back();
    } else {
      if (interstitialAd != null) {
        interstitialAd?.show().whenComplete(() {
          Get.back();
        });
      } else {
        Get.back();
      }
    }
  }

  void initInterstitialAds() {
    CommonFun.interstitialAd((ad) {
      interstitialAd = ad;
    }, adMobIntId: Platform.isIOS ? settingAppData?.admobIntIos : settingAppData?.admobInt);
  }

  void onMoreBtnTap(String value) {
    if (value == S.current.block) {
      blockUnblockApi(blockProfileId: otherUserData?.id).then((value) {
        registrationUserApiCall();
      });
    } else if (value == S.current.unBlock) {
      blockUnblockApi(blockProfileId: otherUserData?.id).then((value) {
        registrationUserApiCall();
      });
    } else {
      onReportTap();
    }
  }

  Future<void> blockUnblockApi({int? blockProfileId}) async {
    CommonUI.lottieLoader();
    await ApiProvider().updateBlockList(blockProfileId);
    onBackTap();
  }

  Future<void> onLikeBtnTap() async {
    if (isLikeProgress || otherUserData == null) return;

    isLikeProgress = true;

    // Store original state in case rollback is needed
    final bool previousLikedState = otherUserData!.isLiked ?? false;

    // Optimistically toggle like state
    otherUserData!.isLiked = !previousLikedState;
    onUpdateUser?.call(otherUserData);
    notifyListeners();
    Report response;
    if (!previousLikedState) {
      response = await ApiProvider().likedProfile(otherUserData?.id);
    } else {
      response = await ApiProvider().dislikedProfile(otherUserData?.id);
    }

    isLikeProgress = false;

    // Rollback if API call failed
    if (response.status == false) {
      otherUserData!.isLiked = previousLikedState;
      notifyListeners();
    } else {
      if (!previousLikedState) {
        ApiProvider().sendLocalizedPushNotification(
            key: 'hasLikedYourProfile', userData: myUserData, deviceToken: otherUserData?.deviceToken);
      }
    }
  }

  void onSaveTap() async {
    if (otherUserData == null) return;
    if (isSavedProgress) return;
    isSavedProgress = true;
    final bool previousState = otherUserData?.isSaved ?? false;
    if (previousState) {
      otherUserData!.isSaved = false;
    } else {
      otherUserData!.isSaved = true;
    }
    notifyListeners();
    await ApiProvider().updateSaveProfile(otherUserData!.id);
    isSavedProgress = false;
  }

  void onChatBtnTap() {
    ChatUser chatUser = ChatUser(
      age: '${otherUserData?.age ?? ''}',
      city: otherUserData?.address ?? '',
      image: otherUserData?.profileImage,
      userIdentity: otherUserData?.identity,
      userid: otherUserData?.id,
      isNewMsg: false,
      isHost: otherUserData?.isVerified == 2 ? true : false,
      date: DateTime.now().millisecondsSinceEpoch.toDouble(),
      username: otherUserData?.fullname,
    );
    Conversation conversation = Conversation(
      block: myUserData?.blockedUsers?.contains('${otherUserData?.id}') == true ? true : false,
      blockFromOther: otherUserData?.blockedUsers?.contains('${myUserData?.id}') == true ? true : false,
      conversationId: CommonFun.getConversationID(myId: myUserData?.id, otherUserId: otherUserData?.id),
      deletedId: '',
      time: DateTime.now().millisecondsSinceEpoch.toDouble(),
      isDeleted: false,
      isMute: false,
      lastMsg: '',
      newMsg: '',
      user: chatUser,
    );
    Get.to(() => ChatScreen(conversation: conversation))?.then((value) {
      registrationUserApiCall();
    });
  }

  void onShareProfileBtnTap() async {
    ShareManager.shared.shareTheContent(key: ShareKeys.user, value: otherUserData?.id ?? -1);
  }

  void onReportTap() {
    Get.bottomSheet(
      ReportSheet(
          reportId: otherUserData?.id,
          fullName: otherUserData?.fullname,
          profileImage: otherUserData?.profileImage,
          age: otherUserData?.age,
          userData: otherUserData,
          address: otherUserData?.address,
          reportType: 1),
      isScrollControlled: true,
    );
  }

  void onFollowUnfollowBtnClick() {
    isFollowInProgress = true;
    notifyListeners();

    // Determine the appropriate URL based on follow status
    final url = isFollow ? Urls.aUnfollowUser : Urls.aFollowUser;

    // Prepare parameters for the API request
    final params = {Urls.myUserId: myUserId, Urls.userId: otherUserData?.id};

    // Make the API call
    ApiProvider().callPost(
        completion: (response) {
          final followUser = FollowUser.fromJson(response);

          if (followUser.status == true) {
            if (!isFollow) {
              ApiProvider().sendLocalizedPushNotification(
                  key: 'hasFollowedYourProfile', userData: myUserData, deviceToken: otherUserData?.deviceToken);
            }

            // Update follow status and follower count accordingly
            isFollow = !isFollow;
            final followerChange = isFollow ? 1 : -1;
            otherUserData?.followerCount(followerChange);
          }
          isFollowInProgress = false;
          notifyListeners();
        },
        url: url,
        param: params);
  }

  void onEditBtnClick() {
    Get.to<UserData>(() => EditProfileScreen(userData: otherUserData))?.then((value) {
      if (value != null) {
        if (value.id == myUserId) {
          otherUserData = value;
        }
        notifyListeners();
      }
    });
  }

  void onPostBtnClick() {
    Get.to(() => PostScreen(userData: otherUserData));
  }

  void getSettingData() {
    settingAppData = SessionManager.instance.getSettings()?.appdata;
    notifyListeners();
    initInterstitialAds();
  }
}
