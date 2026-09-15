import 'package:get/get.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:stacked/stacked.dart';

class SavedProfilesScreenViewModel extends BaseViewModel {
  List<UserData> userData = [];
  bool isLoading = true;

  void init() {
    fetchSavedProfiles();
  }

  void fetchSavedProfiles() async {
    isLoading = true;
    ApiProvider().fetchSavedProfiles().then((value) {
      isLoading = false;
      userData = value.data ?? [];
      notifyListeners();
    });
  }

  onSavedClick(UserData user) async {
    CommonUI.lottieLoader();
    final bool previousState = user.isSaved;
    if (previousState) {
      user.isSaved = false;
      userData.removeWhere((element) => element.id == user.id);
    } else {
      user.isSaved = true;
    }
    notifyListeners();
    await ApiProvider().updateSaveProfile(user.id);
    Get.back();
  }

  void onSavedCardBack() {
    List<String> savedIds =
        (SessionManager.instance.getUser()?.savedProfile ?? '').split(',');
    userData.removeWhere((element) => !savedIds.contains('${element.id}'));
    notifyListeners();
  }
}
