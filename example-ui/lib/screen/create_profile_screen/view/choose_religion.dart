import 'package:flutter/material.dart';
import 'package:orange_ui/common/button/custom_text_button.dart';
import 'package:orange_ui/common/login_setup_view.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/create_profile_screen/create_profile_screen_view_model.dart';
import 'package:orange_ui/screen/create_profile_screen/widget/border_text_card.dart';
import 'package:orange_ui/screen/create_profile_screen/widget/error_text_widget.dart';
import 'package:stacked/stacked.dart';

class ChooseReligion extends StatelessWidget {
  final UserData? userData;
  final CreateProfileScreenViewModel model;

  const ChooseReligion({super.key, this.userData, required this.model});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<CreateProfileScreenViewModel>.reactive(
      viewModelBuilder: () => model,
      disposeViewModel: false,
      builder: (context, viewModel, child) => LoginSetupView(
        title: S.of(context).findReligion,
        description: 'This helps others to understand what you believe..',
        child: Column(
          children: [
            Expanded(
                child: viewModel.religions.isEmpty
                    ? ErrorTextWidget(S
                        .of(context)
                        .pleaseAddReligionInTheAdminPanelToContinue)
                    : SingleChildScrollView(
                        child: Wrap(
                          spacing: 10,
                          runSpacing: 10,
                          children: List.generate(
                            viewModel.religions.length,
                            (index) {
                              bool isSelected = viewModel.selectedReligion ==
                                  viewModel.religions[index];

                              return FittedBox(
                                child: BorderTextCard(
                                  text: viewModel.religions[index].title ?? '',
                                  onTap: () => viewModel.onSelectReligion(
                                      viewModel.religions[index]),
                                  isSelected: isSelected,
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 15),
                                ),
                              );
                            },
                          ),
                        ),
                      )),
            CustomTextButton(
              onTap: () =>
                  viewModel.onContinueTap(CreateProfileContinueTap.religion),
            )
          ],
        ),
      ),
    );
  }
}
