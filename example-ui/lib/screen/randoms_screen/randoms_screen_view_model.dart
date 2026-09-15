
import 'package:get/get.dart';
import 'package:orange_ui/common/common_fun.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/live_grid_screen/live_grid_screen.dart';
import 'package:orange_ui/screen/notification_screen/notification_screen.dart';
import 'package:orange_ui/screen/randoms_search_screen/randoms_search_screen.dart';
import 'package:orange_ui/screen/search_screen/search_screen.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:stacked/stacked.dart';

class RandomsScreenViewModel extends BaseViewModel {
  UserData? userData;
  List<String> genderList = [S.current.boys, S.current.both, S.current.girls];
  int selectedGender = 3;
  bool isLoading = false;

  Appdata? settingAppData;

  void init() {
    getProfileApiCall();
    getSettingData();
  }

  void getSettingData() {
    settingAppData = SessionManager.instance.getSettings()?.appdata;
    notifyListeners();
  }

  void getProfileApiCall() async {
    userData = SessionManager.instance.getUser();
    notifyListeners();
  }

  void onNotificationTap() {
    CommonFun.isBloc(
      userData,
      onCompletion: () {
        Get.to(() => const NotificationScreen());
      },
    );
  }

  void onSearchBtnTap() {
    CommonFun.isBloc(
      userData,
      onCompletion: () {
        Get.to(() => const SearchScreen());
      },
    );
  }

  void onLivesBtnClick() {
    Get.to(() => const LiveGridScreen());
  }

  void onGenderChange(int value) {
    CommonFun.isBloc(
      userData,
      onCompletion: () {
        selectedGender = value;
        notifyListeners();
      },
    );
  }

  void onStartMatchingTap() {
    CommonFun.isBloc(
      userData,
      onCompletion: () {
        Get.to(() => RandomsSearchScreen(
            selectedGender: selectedGender,
            profileImage: userData?.profileImage ?? ''));
      },
    );
  }
}
