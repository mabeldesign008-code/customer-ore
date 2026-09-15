import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/common/top_bar_area.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/blocked_profiles_screen/widget/blocked_card.dart';
import 'package:orange_ui/screen/hidden_profile_screen/hidden_profile_screen_view_model.dart';
import 'package:orange_ui/screen/user_detail_screen/user_detail_screen.dart';
import 'package:stacked/stacked.dart';

class HiddenProfileScreen extends StatelessWidget {
  const HiddenProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<HiddenProfileScreenViewModel>.reactive(
      onViewModelReady: (viewModel) => viewModel.init(),
      viewModelBuilder: () => HiddenProfileScreenViewModel(),
      builder: (context, viewModel, child) {
        return Scaffold(
          body: SafeArea(
            top: false,
            child: Column(
              children: [
                TopBarArea(title2: S.of(context).hiddenProfiles),
                Expanded(
                  child: viewModel.isLoading && viewModel.users.isEmpty
                      ? CommonUI.lottieWidget()
                      : !viewModel.isLoading && viewModel.users.isEmpty
                          ? CommonUI.noData()
                          : ListView.builder(
                              padding: EdgeInsets.zero,
                              itemCount: viewModel.users.length,
                              itemBuilder: (context, index) {
                                UserData userData = viewModel.users[index];
                                return UserCard(
                                  actionType: UserActionType.hide,
                                  userData: userData,
                                  onUserTap: (user) {
                                    Get.to(() =>
                                        UserDetailScreen(userData: userData));
                                  },
                                  onActionButtonTap:
                                      viewModel.onActionButtonTap,
                                );
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
