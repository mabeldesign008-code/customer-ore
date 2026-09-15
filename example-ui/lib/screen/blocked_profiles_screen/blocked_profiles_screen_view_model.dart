import 'package:get/get.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:stacked/stacked.dart';

class BlockedProfilesScreenViewModel extends BaseViewModel {
  List<UserData> userData = [];
  bool isLoading = true;

  void init() {
    fetchLikedProfiles();
  }

  void fetchLikedProfiles() async {
    isLoading = true;
    ApiProvider().fetchBlockedProfiles().then((value) {
      isLoading = false;
      userData = value.data ?? [];
      notifyListeners();
    });
  }

  onUnblockClick(UserData user) async {
    CommonUI.lottieLoader();

    await ApiProvider().updateBlockList(user.id).then((value) {
      Get.back();
      if (value.status == true) {
        bool isBlock = user.isBlocked;
        if (!isBlock) {
          userData.removeWhere((element) => element.id == user.id);
        }
        notifyListeners();
      } else {
        CommonUI.snackBar(message: value.message ?? '');
      }
    });
  }

  void onBackBlockIds() {
    List<String> blockedIds =
        (SessionManager.instance.getUser()?.blockedUsers ?? '').split(',');
    userData.removeWhere((element) => !blockedIds.contains('${element.id}'));
    notifyListeners();
  }
}
