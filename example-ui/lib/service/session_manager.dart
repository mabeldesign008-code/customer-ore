import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:orange_ui/model/chat_and_live_stream/chat.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/utils/firebase_res.dart';

class SessionManager {
  static var instance = SessionManager();
  var storage = GetStorage('Orange');
  var conversationId = '';
  RxInt notifyCount = 0.obs;
  RxInt isModerator = 0.obs;

  void setUser(UserData? user) {
    if (user != null) {
      UserData newUser = UserData.fromJson(user.toJson());
      storage.write(SessionKeys.user, newUser.toJson());
    }
  }

  UserData? getUser() {
    var user = storage.read(SessionKeys.user);

    if (user == null || user is UserData?) {
      return user;
    } else if (user is Map<String, dynamic>) {
      return UserData.fromJson(user);
    } else {
      return null;
    }
  }

  int getUserID() {
    return (getUser()?.id ?? 0).toInt();
  }

  void setSettings(SettingData? settings) {
    if (settings == null) return;
    storage.write(SessionKeys.setting, settings.toJson());
  }

  SettingData? getSettings() {
    var data = storage.read(SessionKeys.setting);
    if (data is Map<String, dynamic>) {
      return SettingData.fromJson(data);
    } else if (data is SettingData) {
      return data;
    }
    return null;
  }

  bool getBool({required String key}) {
    return storage.read(key) ?? false;
  }

  void setBool({required String key, required bool value}) {
    storage.write(key, value);
  }

  void setInt({required String key, required int value}) {
    storage.write(key, value);
  }

  int getInt({required String key}) {
    return storage.read(key) ?? 0;
  }

  void setString({required String key, required String value}) {
    storage.write(key, value);
  }

  String? getString({required String key}) {
    return storage.read(key);
  }

  void setLatLng({required LatLng value}) {
    storage.write(SessionKeys.latLng, value);
  }

  LatLng? getLatLng() {
    return storage.read(SessionKeys.latLng);
  }

  bool get isDating {
    return getSettings()?.appdata?.isDating == 1;
  }

  void updateFirebase() async {
    FirebaseFirestore db = FirebaseFirestore.instance;
    UserData? registrationUserData = getUser();
    if (registrationUserData == null) return;

    db
        .collection(FirebaseRes.userChatList)
        .doc('${registrationUserData.id}')
        .collection(FirebaseRes.userList)
        .withConverter(
          fromFirestore: Conversation.fromFirestore,
          toFirestore: (Conversation value, options) {
            return value.toFirestore();
          },
        )
        .get()
        .then((value) {
      for (var element in value.docs) {
        db
            .collection(FirebaseRes.userChatList)
            .doc("${element.data().user?.userid}")
            .collection(FirebaseRes.userList)
            .doc('${registrationUserData.id}')
            .withConverter(
              fromFirestore: Conversation.fromFirestore,
              toFirestore: (Conversation value, options) => value.toFirestore(),
            )
            .get()
            .then((value) {
          ChatUser? user = value.data()?.user;
          user?.username = registrationUserData.fullname ?? '';
          user?.age = registrationUserData.age.toString();
          user?.image = registrationUserData.profileImage;
          user?.city = registrationUserData.address;
          db
              .collection(FirebaseRes.userChatList)
              .doc('${element.data().user?.userid}')
              .collection(FirebaseRes.userList)
              .doc('${registrationUserData.id}')
              .update({FirebaseRes.user: user?.toJson()});
        });
      }
    });
  }

  void clear() {
    storage.erase();
  }

  void clearSomeKey() {
    storage.remove(SessionKeys.isLogin);
    storage.remove(SessionKeys.user);
    storage.remove(SessionKeys.authToken);
    storage.remove(SessionKeys.password);
  }
}

class SessionKeys {
  static const isLogin = "login";
  static const setting = "setting";
  static const user = "user";
  static const authToken = "authToken";
  static const suggestPhotoTap = "suggest_photo_tap";
  static const suggestSwipe = 'suggest_swipe';
  static const String languageCode = 'languageCode';
  static const String password = 'password';
  static const String latLng = 'lat_lng';
  static const String isMessageDialog = 'is_message_dialog';
  static const String liveStream = 'liveStream';
  static const String isDialogDialog = 'is_dialog_show';
  static const String eULA = 'EULA';
  static const String hasOpenedLocationSheet = 'has_opened_location_sheet';
}
