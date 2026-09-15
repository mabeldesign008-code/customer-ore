import 'package:get/get.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/common/confirmation_dialog.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/fetch_users.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/utils/app_res.dart';
import 'package:orange_ui/utils/urls.dart';
import 'package:stacked/stacked.dart';

class HiddenProfileScreenViewModel extends BaseViewModel {
  List<UserData> users = [];
  bool isLoading = false;

  init() {
    fetchHiddenProfile();
  }

  void fetchHiddenProfile() {
    isLoading = true;
    ApiProvider().callPost(
        completion: (response) {
          FetchUsers result = FetchUsers.fromJson(response);
          isLoading = false;
          if (result.status == true) {
            users = result.data!;
            notifyListeners();
          } else {
            CommonUI.snackBar(message: result.message ?? '');
          }
        },
        url: Urls.aFetchMyHiddenProfiles,
        param: {
          Urls.aStart: users.length,
          Urls.aLimit: AppRes.paginationLimit,
          Urls.myUserId: SessionManager.instance.getUserID()
        });
  }

  onActionButtonTap(UserData user) async {
    Get.dialog(ConfirmationDialog(
      onTap: () async {
        Get.back();
        CommonUI.lottieLoader(isBarrierDismissible: false);
        UserData? myUser = SessionManager.instance.getUser();
        if (myUser == null) return;
        List<String> hiddenUserIds = myUser.hiddenUserIds?.split(',') ?? [];

        if (hiddenUserIds.contains(user.id.toString())) {
          hiddenUserIds.removeWhere((element) => element == '${user.id}');
        }
        ApiProvider()
            .updateProfile(hiddenUserIds: hiddenUserIds.join(','))
            .then((value) {
          Get.back();
          if (value.status == true) {
            users.removeWhere((element) => element.id == user.id);
            notifyListeners();
          } else {
            CommonUI.snackBar(message: value.message ?? '');
          }
        });
      },
      description: S.current.areYouSureYouWantToShowThisProfileAgain,
      textButton: S.current.show,
    ));
  }
}
