import 'package:get/get.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/screen/auth_screen/auth_screen.dart';
import 'package:orange_ui/screen/auth_screen/auth_screen_view_model.dart';
import 'package:orange_ui/screen/on_boarding_screen/on_boarding_screen.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:stacked/stacked.dart';

class SplashScreenViewModel extends BaseViewModel {
  void init() {
    _settingApiCall();
  }

  void _settingApiCall() async {
    await ApiProvider().getSettingData().then((value) async {
      if (value.status == true) {
        bool isLogin =
            SessionManager.instance.getBool(key: SessionKeys.isLogin);

        if (isLogin) {
          fetchProfile();
        } else {
          final List<Onboarding> onBoardingItems =
              value.data?.onboardingScreen ?? [];
          bool isDating = value.data?.appdata?.isDating == 1;
          if (isDating && onBoardingItems.isNotEmpty) {
            Get.off(() => OnBoardingScreen(onBoarding: onBoardingItems));
          } else {
            Get.off(() => const AuthScreen());
          }
        }
      }
    });
  }

  void fetchProfile() async {
    final userData = SessionManager.instance.getUser();

    if (userData == null) {
      Get.off(() => const AuthScreen());
      return;
    }
    try {
      final response = await ApiProvider().fetchMyUserProfile();

      if (response.status == true && response.data?.id != null) {
        AuthScreenViewModel().navigateScreen(userData: userData);
      } else {
        Get.off(() => const AuthScreen());
      }
    } catch (e) {
      // Handle API or unexpected error
      Get.off(() => const AuthScreen());
    }
  }
}
