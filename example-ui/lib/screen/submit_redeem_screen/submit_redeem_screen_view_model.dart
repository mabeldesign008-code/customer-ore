import 'dart:io';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/common/common_fun.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/place_redeem_request.dart';
import 'package:orange_ui/model/setting_model.dart';

import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/utils/urls.dart';
import 'package:stacked/stacked.dart';

class SubmitRedeemScreenViewModel extends BaseViewModel {
  int coinValue = 0;
  TextEditingController accountDetailController = TextEditingController();
  String? paymentGateway = S.current.paypal;
  String accountError = '';
  bool isEmpty = false;
  InterstitialAd? interstitialAd;
  List<String> paymentList = [S.current.paypal, S.current.bankTransfer];

  Appdata? settingAppData;

  void init() {
    coinValue = Get.arguments;
    getPrefData();
  }

  void onBackBtnTap() {
    Get.back();
  }

  void initInterstitialAds() {
    CommonFun.interstitialAd((ad) {
      interstitialAd = ad;
    }, adMobIntId: Platform.isIOS ? settingAppData?.admobIntIos : settingAppData?.admobInt);
  }

  void onPaymentChange(String? value) {
    paymentGateway = value;
    notifyListeners();
  }

  void onSubmitBtnTap() async {
    if (!isValid()) return;
    CommonUI.lottieLoader();

    ApiProvider().callPost(
        completion: (response) {
          PlaceRedeemRequest placeRedeemRequest = PlaceRedeemRequest.fromJson(response);
          Get.back();
          if (placeRedeemRequest.status == true) {
            if (interstitialAd != null) {
              interstitialAd?.show().then((value) {
                Get.back(result: true);
              });
            } else {
              Get.back(result: true);
            }
          } else {
            CommonUI.snackBar(message: '${placeRedeemRequest.message}');
          }
        },
        url: Urls.aPlaceRedeemRequest,
        param: {
          Urls.userId: SessionManager.instance.getUserID().toString(),
          Urls.aAccountDetails: paymentGateway,
          Urls.aPaymentGateway: accountDetailController.text.trim(),
        });
  }

  bool isValid() {
    int i = 0;
    if (accountDetailController.text == '') {
      accountError = S.current.enterAccountDetails;
      isEmpty = true;
      i++;
    }
    notifyListeners();
    return i == 0 ? true : false;
  }

  void getPrefData() {
    settingAppData = SessionManager.instance.getSettings()?.appdata;
    notifyListeners();
    initInterstitialAds();
  }
}
