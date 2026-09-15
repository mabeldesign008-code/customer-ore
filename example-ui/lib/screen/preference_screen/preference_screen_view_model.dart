import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/create_profile_screen/create_profile_screen_view_model.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/utils/app_res.dart';
import 'package:stacked/stacked.dart';

class PreferenceScreenViewModel extends BaseViewModel {
  GenderType selectedGenderPref = GenderType.male;
  RangeValues selectedAgeRange = const RangeValues(18, 35);
  double selectedDistance = AppRes.defaultDistancePreference;

  UserData? userData = SessionManager.instance.getUser();
  SettingData? settingData = SessionManager.instance.getSettings();

  void init() {
    getPrefSettings();
  }

  void getPrefSettings() async {
    getLocalData();
    notifyListeners();
  }

  void getLocalData() {
    if (userData == null) return;

    selectedGenderPref = userData!.genderPreferred;
    selectedAgeRange = RangeValues(
      (userData?.agePreferredMin ?? AppRes.ageMin).toDouble(),
      (userData?.agePreferredMax ?? AppRes.ageMax).toDouble(),
    );
    selectedDistance = (userData?.distancePreference ?? 0).toDouble();

    notifyListeners();
  }

  void onChangeAgeRange(RangeValues value) {
    selectedAgeRange = value;
    notifyListeners();
  }

  void onChangeDistance(double value) {
    selectedDistance = value;
    notifyListeners();
  }

  void onChangeGenderPref(GenderType type) {
    selectedGenderPref = type;
    notifyListeners();
  }

  void onSaveTap() {
    CommonUI.lottieLoader();
    ApiProvider()
        .updateProfile(
      genderPreferred: selectedGenderPref.value,
      ageMin: selectedAgeRange.start,
      ageMax: selectedAgeRange.end,
      distancePreference: selectedDistance,
    )
        .then((value) async {
      Get.back();
      if (value.status == true) {
        Get.back();
        SessionManager.instance.setUser(value.data);
      } else {
        CommonUI.snackBar(message: value.message ?? '');
      }
    });
  }
}
