import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/common/top_bar_area.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/blocked_profiles_screen/blocked_profiles_screen_view_model.dart';
import 'package:orange_ui/screen/blocked_profiles_screen/widget/blocked_card.dart';
import 'package:orange_ui/screen/user_detail_screen/user_detail_screen.dart';
import 'package:stacked/stacked.dart';

class BlockedProfilesScreen extends StatelessWidget {
  const BlockedProfilesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<BlockedProfilesScreenViewModel>.reactive(
      onViewModelReady: (viewModel) => viewModel.init(),
      viewModelBuilder: () => BlockedProfilesScreenViewModel(),
      builder: (context, viewModel, child) {
        return Scaffold(
          body: SafeArea(
            top: false,
            child: Column(
              children: [
                TopBarArea(title2: S.of(context).blockedProfiles),
                Expanded(
                  child: viewModel.isLoading
                      ? CommonUI.lottieWidget()
                      : viewModel.userData.isEmpty
                          ? CommonUI.noData()
                          : ListView.builder(
                              padding: EdgeInsets.zero,
                              itemCount: viewModel.userData.length,
                              itemBuilder: (context, index) {
                                UserData userData = viewModel.userData[index];
                                return UserCard(
                                  actionType: UserActionType.block,
                                  userData: userData,
                                  onActionButtonTap: viewModel.onUnblockClick,
                                  onUserTap: (user) {
                                    Get.to(() =>
                                            UserDetailScreen(userData: user))
                                        ?.then((value) {
                                      viewModel.onBackBlockIds();
                                    });
                                  },
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
