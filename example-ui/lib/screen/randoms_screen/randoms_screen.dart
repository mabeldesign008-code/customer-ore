import 'package:flutter/material.dart';
import 'package:orange_ui/common/top_bar_area.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/randoms_screen/randoms_screen_view_model.dart';
import 'package:orange_ui/screen/randoms_screen/widgets/bottom_buttons.dart';
import 'package:orange_ui/screen/randoms_screen/widgets/profile_pic_area.dart';
import 'package:stacked/stacked.dart';

class RandomsScreen extends StatelessWidget {
  const RandomsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<RandomsScreenViewModel>.reactive(
      onViewModelReady: (model) {
        model.init();
      },
      viewModelBuilder: () => RandomsScreenViewModel(),
      builder: (context, model, child) {
        return Scaffold(
          body: SafeArea(
            child: Column(
              children: [
                TopBarArea(title2: S.of(context).randomScreen),
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      ProfilePicArea(
                          data: model.userData, isLoading: model.isLoading),
                      BottomButtons(
                          genderList: model.genderList,
                          selectedGender: model.selectedGender,
                          onGenderSelect: model.onGenderChange,
                          onMatchingStart: model.onStartMatchingTap),
                    ],
                  ),
                )
              ],
            ),
          ),
        );
      },
    );
  }
}
