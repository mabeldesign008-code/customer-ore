import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:orange_ui/common/button/custom_text_button.dart';
import 'package:orange_ui/common/login_setup_view.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/create_profile_screen/create_profile_screen_view_model.dart';
import 'package:orange_ui/screen/create_profile_screen/widget/error_text_widget.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:stacked/stacked.dart';

class RelationshipGoal extends StatelessWidget {
  final UserData? userData;
  final CreateProfileScreenViewModel model;

  const RelationshipGoal({super.key, this.userData, required this.model});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<CreateProfileScreenViewModel>.reactive(
      viewModelBuilder: () => model,
      disposeViewModel: false,
      builder: (context, viewModel, child) => LoginSetupView(
        title: S.of(context).relationshipGoals,
        description: S.of(context).findSomeoneWhoTrulyUnderstandsYou,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: viewModel.relationshipGoals.isEmpty
                  ? ErrorTextWidget(S
                      .of(context)
                      .pleaseAddRelationshipGoalsInTheAdminPanelToContinue)
                  : ListView.builder(
                      itemCount: viewModel.relationshipGoals.length,
                      itemBuilder: (context, index) {
                        RelationshipGoals goal =
                            viewModel.relationshipGoals[index];
                        bool isSelected =
                            viewModel.selectedRelationShipGoal?.id == goal.id;
                        return RelationshipCard(
                            onTap: () =>
                                viewModel.onChangedRelationshipGoal(goal),
                            isSelected: isSelected,
                            goal: goal);
                      },
                    ),
            ),
            CustomTextButton(
                onTap: () => viewModel
                    .onContinueTap(CreateProfileContinueTap.relationGoal))
          ],
        ),
      ),
    );
  }
}

class RelationshipCard extends StatelessWidget {
  final VoidCallback onTap;
  final bool isSelected;
  final RelationshipGoals? goal;

  const RelationshipCard(
      {super.key,
      required this.onTap,
      required this.isSelected,
      required this.goal});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        decoration: ShapeDecoration(
            shape: SmoothRectangleBorder(
                borderRadius:
                    SmoothBorderRadius(cornerRadius: 15, cornerSmoothing: 1),
                side: BorderSide(
                    color: isSelected
                        ? ColorRes.themeColor
                        : ColorRes.borderColor)),
            color: isSelected
                ? ColorRes.themeColor.withValues(alpha: 0.06)
                : ColorRes.white),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
        margin: const EdgeInsets.symmetric(vertical: 5),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: 5,
          children: [
            Text(goal?.title ?? '',
                style: TextStyle(
                    fontFamily: FontRes.medium,
                    fontSize: 16,
                    color: isSelected ? ColorRes.themeColor : ColorRes.black)),
            Text(
              goal?.description ?? '',
              style: const TextStyle(
                  fontFamily: FontRes.regular,
                  fontSize: 16,
                  color: ColorRes.dimGrey3),
            ),
          ],
        ),
      ),
    );
  }
}
