import 'package:flutter/material.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/common/top_bar_area.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/saved_profiles_screen/saved_profiles_screen_view_model.dart';
import 'package:orange_ui/screen/saved_profiles_screen/widget/saved_card.dart';
import 'package:stacked/stacked.dart';

class SavedProfilesScreen extends StatelessWidget {
  const SavedProfilesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<SavedProfilesScreenViewModel>.reactive(
      onViewModelReady: (viewModel) => viewModel.init(),
      viewModelBuilder: () => SavedProfilesScreenViewModel(),
      builder: (context, viewModel, child) {
        return Scaffold(
          body: SafeArea(
            top: false,
            child: Column(
              children: [
                TopBarArea(title2: S.of(context).savedProfiles),
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
                                return SavedCard(
                                    userData: userData, viewModel: viewModel);
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
