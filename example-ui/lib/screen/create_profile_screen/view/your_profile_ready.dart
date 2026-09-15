import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:orange_ui/common/button/custom_text_button.dart';
import 'package:orange_ui/common/login_setup_view.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/create_profile_screen/create_profile_screen_view_model.dart';
import 'package:orange_ui/screen/create_profile_screen/view/add_photos.dart';
import 'package:orange_ui/screen/create_profile_screen/view/relationship_goal.dart';
import 'package:orange_ui/screen/create_profile_screen/widget/border_text_card.dart';
import 'package:orange_ui/service/extention/string_extention.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:stacked/stacked.dart';

class YourProfileReady extends StatelessWidget {
  final CreateProfileScreenViewModel model;

  const YourProfileReady({super.key, required this.model});

  @override
  Widget build(BuildContext context) {
    bool isDating = model.settingData?.appdata?.isDating == 1;
    return ViewModelBuilder<CreateProfileScreenViewModel>.reactive(
        viewModelBuilder: () => model,
        disposeViewModel: false,
        builder: (context, viewModel, child) {
          return LoginSetupView(
            title: S.of(context).yourProfileIsReady,
            description: S.of(context).findSomeoneWhoTrulyUnderstandsYou,
            padding: const EdgeInsets.only(top: 20),
            topRightWidget: BorderTextCard(
                text: S.of(context).edit.capitalize ?? '',
                onTap: () {
                  Get.until((route) => route.isFirst);
                },
                isSelected: false,
                bgColor: ColorRes.transparent,
                height: 30,
                padding: const EdgeInsets.symmetric(horizontal: 20)),
            child: Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      spacing: 20,
                      children: [
                        ProfileImageView(viewModel: viewModel),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 30.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            spacing: 20,
                            children: [
                              TitleAndDescriptionTiles(
                                title: S.current.fullName,
                                description:
                                    viewModel.fullnameController.text.trim(),
                              ),
                              TitleAndDescriptionTiles(
                                title: S.current.gender.capitalizeFirst ?? '',
                                description: viewModel
                                    .selectedGenderType.title.removeEmojis,
                              ),
                              TitleAndDescriptionTiles(
                                title: S.current.emailAddress,
                                description: viewModel.userData?.identity ?? '',
                              ),
                              TitleAndDescriptionTiles(
                                title: S.current.dateOfBirth,
                                description: DateFormat('dd-MMM-yyyy')
                                    .format(viewModel.selectedDob),
                              ),
                              if (isDating)
                                TitleAndDescriptionTiles(
                                  title: S.current.preferredGender,
                                  description: viewModel.selectedPreferredGender
                                      .title.removeEmojis,
                                ),
                              if (isDating)
                                TitleAndDescriptionTiles(
                                  title: S.current.ageRange,
                                  description:
                                      '${viewModel.selectedAgeRange.start.toInt()} - ${viewModel.selectedAgeRange.end.toInt()}',
                                ),
                              if (isDating)
                                TitleAndDescriptionTiles(
                                  title: S.current.distancePreference,
                                  description:
                                      '${viewModel.selectedDistance.toInt()} ${S.current.km.toUpperCase()}',
                                ),
                              if (viewModel.selectedRelationShipGoal != null)
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  spacing: 10,
                                  children: [
                                    Text(
                                        S.current.relationshipGoals
                                            .removeEmojis,
                                        style: const TextStyle(
                                            fontFamily: FontRes.medium,
                                            fontSize: 16,
                                            color: ColorRes.dimGrey3)),
                                    RelationshipCard(
                                        onTap: () {},
                                        isSelected: true,
                                        goal:
                                            viewModel.selectedRelationShipGoal)
                                  ],
                                ),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          spacing: 10,
                          children: [
                            Padding(
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 30.0),
                              child: Text(S.current.interest,
                                  style: const TextStyle(
                                      fontFamily: FontRes.medium,
                                      fontSize: 16,
                                      color: ColorRes.dimGrey3)),
                            ),
                            SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 25),
                              child: Row(
                                children: List.generate(
                                  viewModel.selectedInterest.length,
                                  (index) {
                                    String title = viewModel
                                            .selectedInterest[index].title ??
                                        '';
                                    if (title.isEmpty) {
                                      return const SizedBox();
                                    }
                                    return Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 5),
                                      child: BorderTextCard(
                                        text: viewModel.selectedInterest[index]
                                                .title ??
                                            '',
                                        onTap: () {},
                                        isSelected: true,
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 20),
                                      ),
                                    );
                                  },
                                ),
                              ),
                            )
                          ],
                        ),
                        if (viewModel.selectedReligion != null)
                          Padding(
                            padding:
                                const EdgeInsets.symmetric(horizontal: 30.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              spacing: 10,
                              children: [
                                Text(S.of(context).religion,
                                    style: const TextStyle(
                                        fontFamily: FontRes.medium,
                                        fontSize: 16,
                                        color: ColorRes.dimGrey3)),
                                FittedBox(
                                  child: BorderTextCard(
                                    text:
                                        viewModel.selectedReligion?.title ?? '',
                                    onTap: () {},
                                    isSelected: true,
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 20),
                                  ),
                                )
                              ],
                            ),
                          ),
                        if (viewModel.selectedLanguages.isNotEmpty)
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            spacing: 10,
                            children: [
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 30.0),
                                child: Text(S.current.language,
                                    style: const TextStyle(
                                        fontFamily: FontRes.medium,
                                        fontSize: 16,
                                        color: ColorRes.dimGrey3)),
                              ),
                              SingleChildScrollView(
                                scrollDirection: Axis.horizontal,
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 25),
                                child: Row(
                                  children: List.generate(
                                    viewModel.selectedLanguages.length,
                                    (index) {
                                      return Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 5),
                                        child: BorderTextCard(
                                          text: viewModel
                                                  .selectedLanguages[index]
                                                  .title ??
                                              '',
                                          onTap: () {},
                                          isSelected: true,
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 20),
                                        ),
                                      );
                                    },
                                  ),
                                ),
                              )
                            ],
                          ),
                        const SizedBox(height: 1),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(
                      left: 30.0, right: 30, bottom: 30, top: 5),
                  child: CustomTextButton(
                    onTap: () => viewModel
                        .onContinueTap(CreateProfileContinueTap.finalProfile),
                  ),
                )
              ],
            ),
          );
        });
  }
}

class TitleAndDescriptionTiles extends StatelessWidget {
  final String title;
  final String description;

  const TitleAndDescriptionTiles(
      {super.key, required this.title, required this.description});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      spacing: 20,
      children: [
        Text(title,
            style: const TextStyle(
                fontFamily: FontRes.medium,
                fontSize: 16,
                color: ColorRes.dimGrey3)),
        Flexible(
          child: Text(description,
              style: const TextStyle(
                  fontFamily: FontRes.medium,
                  fontSize: 16,
                  color: ColorRes.black),
              overflow: TextOverflow.ellipsis),
        ),
      ],
    );
  }
}
