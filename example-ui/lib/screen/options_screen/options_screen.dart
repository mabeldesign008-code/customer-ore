import 'package:flutter/material.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/common/top_bar_area.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/options_screen/widgets/bottom_legal_area.dart';
import 'package:orange_ui/screen/options_screen/widgets/options_center_area.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:stacked/stacked.dart';

import 'options_screen_view_model.dart';

class OptionScreen extends StatelessWidget {
  const OptionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<OptionalScreenViewModel>.reactive(
      onViewModelReady: (model) {
        model.init();
      },
      viewModelBuilder: () => OptionalScreenViewModel(),
      builder: (context, model, child) {
        return Scaffold(
          backgroundColor: ColorRes.white,
          body: SafeArea(
            top: false,
            child: Column(
              children: [
                TopBarArea(title2: S.current.options),
                Expanded(
                  child: model.isLoading
                      ? Center(child: CommonUI.lottieWidget())
                      : Padding(
                          padding: const EdgeInsets.only(left: 8, right: 9),
                          child: SingleChildScrollView(
                            physics: const BouncingScrollPhysics(),
                            child: Column(
                              spacing: 20,
                              children: [
                                OptionsCenterArea(model: model),
                                BottomLegalArea(
                                  onPrivacyPolicyTap: () =>
                                      model.onNavigateWebViewScreen(0),
                                  onTermsOfUseTap: () =>
                                      model.onNavigateWebViewScreen(1),
                                  onLogoutTap: model.onLogoutTap,
                                  onDeleteAccountTap: model.onDeleteAccountTap,
                                    model: model),
                              ],
                            ),
                          ),
                        ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class OptionsScreenHeading extends StatelessWidget {
  final String title;

  const OptionsScreenHeading({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    return Text(
      title.toUpperCase(),
      style: const TextStyle(
          fontFamily: FontRes.bold, color: ColorRes.grey23, letterSpacing: 0.8),
    );
  }
}
