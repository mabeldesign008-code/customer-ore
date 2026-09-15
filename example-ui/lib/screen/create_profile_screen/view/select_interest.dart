import 'package:flutter/material.dart';
import 'package:orange_ui/common/button/custom_text_button.dart';
import 'package:orange_ui/common/login_setup_view.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/create_profile_screen/create_profile_screen_view_model.dart';
import 'package:orange_ui/screen/create_profile_screen/widget/border_text_card.dart';
import 'package:orange_ui/screen/create_profile_screen/widget/error_text_widget.dart';
import 'package:stacked/stacked.dart';

class SelectInterest extends StatelessWidget {
  final UserData? userData;
  final CreateProfileScreenViewModel model;

  const SelectInterest({super.key, this.userData, required this.model});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<CreateProfileScreenViewModel>.reactive(
      viewModelBuilder: () => model,
      disposeViewModel: false,
      builder: (context, viewModel, child) => LoginSetupView(
        title: S.of(context).discoverLikemindedPeople,
        description: 'Select Your interests, it helps with matching.',
        child: Column(
          children: [
            Expanded(
                child: viewModel.interestList.isEmpty
                    ? ErrorTextWidget(S
                        .of(context)
                        .pleaseAddInterestsInTheAdminPanelToContinue)
                    : SingleChildScrollView(
                        child: WrapListTiles<Interests>(
                            onTap: viewModel.onSelectInterest,
                            getText: (p0) => p0.title ?? '',
                            items: viewModel.interestList,
                            selectedItems: viewModel.selectedInterest),
                      )),
            CustomTextButton(
              onTap: () =>
                  viewModel.onContinueTap(CreateProfileContinueTap.interest),
            )
          ],
        ),
      ),
    );
  }
}

class WrapListTiles<T> extends StatelessWidget {
  final List<T> items;
  final List<T?> selectedItems;
  final String Function(T) getText;
  final Function(T) onTap;

  const WrapListTiles(
      {super.key,
      required this.items,
      required this.selectedItems,
      required this.getText,
      required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: List.generate(
        items.length,
        (index) {
          bool isSelected = selectedItems.contains(items[index]);
          return FittedBox(
            child: BorderTextCard(
              text: getText(items[index]),
              onTap: () => onTap(items[index]),
              isSelected: isSelected,
              padding: const EdgeInsets.only(left: 12, right: 12),
            ),
          );
        },
      ),
    );
  }
}
