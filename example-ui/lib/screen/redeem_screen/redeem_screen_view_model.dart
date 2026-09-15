import 'package:get/get.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/model/fetch_redeem_request.dart';
import 'package:orange_ui/model/setting_model.dart';

import 'package:orange_ui/service/session_manager.dart';
import 'package:stacked/stacked.dart';

class RedeemScreenViewModel extends BaseViewModel {
  List<RedeemRequestData>? redeemData;
  bool isLoading = false;

  Appdata? settingAppData;

  void init() {
    getSettingData();
    fetchRedeemRequest();
  }

  void onBackBtnTap() {
    Get.back();
  }

  void fetchRedeemRequest() {
    isLoading = true;
    ApiProvider().fetchRedeemRequest().then((value) {
      redeemData = value.data;
      isLoading = false;
      notifyListeners();
    });
  }

  void getSettingData() {
    settingAppData = SessionManager.instance.getSettings()?.appdata;
    notifyListeners();
  }
}
