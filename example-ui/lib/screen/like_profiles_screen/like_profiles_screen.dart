import 'package:flutter/material.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/common/top_bar_area.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/like_profiles_screen/like_profiles_screen_view_model.dart';
import 'package:orange_ui/screen/like_profiles_screen/widget/like_card.dart';
import 'package:stacked/stacked.dart';

class LikeProfilesScreen extends StatelessWidget {
  const LikeProfilesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<LikeProfilesScreenViewModel>.reactive(
      onViewModelReady: (viewModel) => viewModel.init(),
      viewModelBuilder: () => LikeProfilesScreenViewModel(),
      builder: (context, viewModel, child) {
        return Scaffold(
          body: SafeArea(
            top: false,
            child: Column(
              children: [
                TopBarArea(title2: S.of(context).likeProfiles),
                Expanded(
                  child: viewModel.isLoading
                      ? CommonUI.lottieWidget()
                      : viewModel.likeUsers.isEmpty
                          ? CommonUI.noData()
                          : ListView.builder(
                              padding: EdgeInsets.zero,
                              itemCount: viewModel.likeUsers.length,
                              itemBuilder: (context, index) {
                                UserData userData = viewModel.likeUsers[index];
                                return LikeCard(userData: userData, viewModel: viewModel);
                              },
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
