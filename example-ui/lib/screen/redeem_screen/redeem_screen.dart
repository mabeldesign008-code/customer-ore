import 'package:flutter/material.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/common/top_bar_area.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/redeem_screen/redeem_screen_view_model.dart';
import 'package:orange_ui/screen/redeem_screen/widgets/center_area_redeem_screen.dart';
import 'package:stacked/stacked.dart';

class RedeemScreen extends StatelessWidget {
  const RedeemScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<RedeemScreenViewModel>.reactive(
      onViewModelReady: (model) {
        model.init();
      },
      viewModelBuilder: () => RedeemScreenViewModel(),
      builder: (context, model, child) {
        return Scaffold(
          body: Column(
            children: [
              // TopBarRedeemScreen(onBackBtnTap: model.onBackBtnTap),
              TopBarArea(
                title: S.current.redeem, title2: S.current.requests),
              !model.isLoading
                  ? CenterAreaRedeemScreen(redeemData: model.redeemData, settingAppData: model.settingAppData)
                  : Expanded(child: CommonUI.lottieWidget()),
            ],
          ),
        );
      },
    );
  }
}
