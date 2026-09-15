import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/common/common_fun.dart';
import 'package:orange_ui/common/confirmation_dialog.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/chat_and_live_stream/chat.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/chat_screen/chat_screen.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/utils/firebase_res.dart';
import 'package:stacked/stacked.dart';

class MessageScreenViewModel extends BaseViewModel {
  FirebaseFirestore db = FirebaseFirestore.instance;
  List<Conversation> userList = [];
  Conversation? conversation;
  bool isLoading = false;
  StreamSubscription<QuerySnapshot<Conversation>>? subscription;
  UserData? userData;
  Appdata? settingAppData;

  void init() {
    getSettingData();
    getChatUsers();
    getProfileApi();
  }


  void getProfileApi() {
    ApiProvider()
        .getProfile(userID: SessionManager.instance.getUserID())
        .then((value) {
      userData = value.data;
      notifyListeners();
    });
  }

  void onUserTap(Conversation conversation) {
    CommonFun.isBloc(
      userData,
      onCompletion: () {
        Get.to(() => ChatScreen(conversation: conversation));
      },
    );
  }

  void getChatUsers() {
    isLoading = true;
    int userId = SessionManager.instance.getUser()?.id ?? -1;
    subscription = db
        .collection(FirebaseRes.userChatList)
        .doc('$userId')
        .collection(FirebaseRes.userList)
        .orderBy(FirebaseRes.time, descending: true)
        .withConverter(
            fromFirestore: Conversation.fromFirestore,
            toFirestore: (Conversation value, options) => value.toFirestore())
        .snapshots()
        .listen((element) {
      userList = [];
      for (int i = 0; i < element.docs.length; i++) {
        if (element.docs[i].data().isDeleted == false) {
          userList.add(element.docs[i].data());
          notifyListeners();
        }
      }
      isLoading = false;
      notifyListeners();
    });
  }

  @override
  void dispose() {
    subscription?.cancel();
    super.dispose();
  }

  void onLongPress(Conversation? conversation) {
    Get.dialog(ConfirmationDialog(
      onTap: () {
        Get.back();
        db
            .collection(FirebaseRes.userChatList)
            .doc(userData?.id.toString())
            .collection(FirebaseRes.userList)
            .doc(conversation?.user?.userid.toString())
            .update({
          FirebaseRes.isDeleted: true,
          FirebaseRes.deletedId: '${DateTime.now().millisecondsSinceEpoch}',
          FirebaseRes.block: false,
          FirebaseRes.blockFromOther: false,
        });
      },
      description: S.current.messageWillOnlyBeRemoved,
      dialogSize: 1.9,
      padding: const EdgeInsets.symmetric(horizontal: 40),
    ));
    notifyListeners();
  }

  void getSettingData() {
    settingAppData = SessionManager.instance.getSettings()?.appdata;
    notifyListeners();
  }
}
