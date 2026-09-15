import 'package:get/get.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/bottom_diamond_shop/bottom_diamond_shop.dart';
import 'package:orange_ui/screen/live_stream_application_screen/live_stream_application_screen.dart';
import 'package:orange_ui/screen/live_stream_history_screen/live_stream_history_screen.dart';
import 'package:orange_ui/screen/redeem_screen/redeem_screen.dart';
import 'package:orange_ui/screen/submit_redeem_screen/submit_redeem_screen.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:stacked/stacked.dart';

class LiveStreamDashBoardViewModel extends BaseViewModel {
  bool isLoading = false;
  UserData? userData;
  int coinValue = 0;

  Appdata? settingAppData;

  void init() {
    getPrefData();

    getSettingData();
  }

  void getPrefData() {
    userData = SessionManager.instance.getUser();
    coinValue = userData?.wallet ?? 0;
    notifyListeners();
  }

  void onRedeemTap() {
    Get.to(() => const SubmitRedeemScreen(), arguments: coinValue)
        ?.then((value) {
      if (value != null) {
        userData?.wallet = 0;
        notifyListeners();
        SessionManager.instance.setUser(userData);
      }
    });
  }

  void onAddCoinsBtnTap() {
    Get.bottomSheet<int>(
      const BottomDiamondShop(),
      backgroundColor: ColorRes.transparent,
    ).then((value) {
      if (value != null) {
        coinValue += value;
        userData?.totalCollected = (userData?.totalCollected ?? 0) + value;
        userData?.wallet = (userData?.wallet ?? 0) + value;
        notifyListeners();
        SessionManager.instance.setUser(userData);
      }
    });
  }

  void onBackBtnTap() {
    Get.back();
  }

  void onHistoryBtnTap() {
    Get.to(() => const LiveStreamHistory());
  }

  void onRedeemBtnTap() {
    Get.to(() => const RedeemScreen());
  }

  void onApplyBtnTap() {
    Get.to(() => const LiveStreamApplicationScreen())?.then((value) {
      if (value != null) {
        userData?.canGoLive = value;
        notifyListeners();
        SessionManager.instance.setUser(userData);
      }
    });
  }

  void getSettingData() {
    settingAppData = SessionManager.instance.getSettings()?.appdata;
    notifyListeners();
  }
}
