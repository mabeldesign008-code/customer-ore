import 'package:get/get.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/common/confirmation_dialog.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:stacked/stacked.dart';

class LikeProfilesScreenViewModel extends BaseViewModel {
  List<UserData> likeUsers = [];
  bool isLoading = true;

  void init() {
    fetchLikedProfiles();
  }

  void fetchLikedProfiles() async {
    isLoading = true;
    ApiProvider().fetchLikedProfiles().then((value) {
      isLoading = false;
      likeUsers.addAll(value.data ?? []);
      notifyListeners();
    });
  }

  onLikeBtnTap(UserData p0) async {
    Get.dialog(ConfirmationDialog(
      onTap: () async {
        Get.back();
        CommonUI.lottieLoader();
        final response = await ApiProvider().dislikedProfile(p0.id);
        Get.back();
        if (response.status == true) {
          likeUsers.removeWhere((element) => element.id == p0.id);
          notifyListeners();
        } else {
          CommonUI.snackBar(message: response.message);
        }
      },
      description: S.current.areYouSureYouWantToDislikeThisUser,
      textButton: 'Dislike',
    ));
  }

  onUpdateUser(UserData? userData) {
    if (userData?.isLiked == false) {
      likeUsers.removeWhere((element) => element.id == userData?.id);
      notifyListeners();
    }
  }
}
