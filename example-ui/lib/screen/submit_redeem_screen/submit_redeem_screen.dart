import 'package:flutter/material.dart';
import 'package:orange_ui/common/top_bar_area.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/submit_redeem_screen/submit_redeem_screen_view_model.dart';
import 'package:orange_ui/screen/submit_redeem_screen/widgets/center_area_submit_redeem_screen.dart';
import 'package:stacked/stacked.dart';

class SubmitRedeemScreen extends StatelessWidget {
  const SubmitRedeemScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<SubmitRedeemScreenViewModel>.reactive(
        onViewModelReady: (model) {
          model.init();
        },
        viewModelBuilder: () => SubmitRedeemScreenViewModel(),
        builder: (context, model, child) {
          return Scaffold(
            body: Column(
              children: [
                TopBarArea(
                  title: S.current.submit, title2: S.current.redeem),
                CenterAreaSubmitRedeemScreen(
                  wallet: model.coinValue,
                  onSubmitBtnTap: model.onSubmitBtnTap,
                  accountDetailController: model.accountDetailController,
                  onPaymentChange: model.onPaymentChange,
                  paymentList: model.paymentList,
                  payment: model.paymentGateway,
                  accountError: model.accountError,
                  isEmpty: model.isEmpty,
                  model: model,
                ),
              ],
            ),
          );
        });
  }
}
