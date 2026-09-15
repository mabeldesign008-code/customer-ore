import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/webview_screen/webview_screen.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/urls.dart';
import 'package:stacked/stacked.dart';

class ReportSheetViewModel extends BaseViewModel {
  int reportID = -1;
  int type;

  void init() {}

  ReportSheetViewModel(this.reportID, this.type);

  TextEditingController explainController = TextEditingController();
  FocusNode explainMoreFocus = FocusNode();
  String explainMoreError = '';
  String reason = S.current.cyberbullying;
  bool isExplainError = false;
  List<String> reasonList = [
    S.current.cyberbullying,
    S.current.harassment,
    S.current.personalHarassment,
    S.current.inappropriateContent
  ];

  bool? isCheckBox = false;

  void onCheckBoxChange(bool? value) {
    isCheckBox = value;
    explainMoreFocus.unfocus();
    notifyListeners();
  }

  void onReasonTap() {
    explainMoreFocus.unfocus();
    notifyListeners();
  }

  void onTermAndConditionClick() {
    Get.to(() => WebViewScreen(appBarTitle: S.current.termsOfUse, url: Urls.aTermsOfUse));
  }

  bool isValid() {
    int i = 0;
    explainMoreFocus.unfocus();
    isExplainError = false;

    if (explainController.text == '') {
      isExplainError = true;
      explainMoreError = S.current.enterFullReason;
      i++;
      return false;
    }
    if (isCheckBox == false) {
      Get.rawSnackbar(
        message: S.current.pleaseCheckTerm,
        backgroundColor: ColorRes.black,
        snackStyle: SnackStyle.FLOATING,
        duration: const Duration(seconds: 2),
        borderRadius: 10,
        margin: const EdgeInsets.all(10),
        dismissDirection: DismissDirection.horizontal,
      );
      i++;
    }
    notifyListeners();
    return i == 0 ? true : false;
  }

  void onSubmitBtnTap() {
    bool validation = isValid();
    if (type == 1) {
      if (reportID == -1) {
        CommonUI.snackBar(message: S.current.userNotFound);
        return;
      }
      notifyListeners();
      if (validation) {
        ApiProvider().addReport(reason, explainController.text, reportID).then(
          (value) {
            CommonUI.snackBarWidget(S.current.reportedSuccessfully);
            Get.back();
          },
        );
      }
    } else if (type == 2) {
      CommonUI.lottieLoader();
      ApiProvider().callPost(
          completion: (response) {
            Get.back();
            Get.back();
            CommonUI.snackBarWidget(S.current.reportedSubmitted);
          },
          url: Urls.aReportPost,
          param: {Urls.aPostId: reportID, Urls.aReason: reason, Urls.aDescription: explainController.text.trim()});
    }
  }

  void onReasonChange(String? value) {
    reason = value!;
    notifyListeners();
  }
}
