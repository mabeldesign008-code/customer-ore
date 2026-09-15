import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/button/border_icon_button.dart';
import 'package:orange_ui/common/button/custom_text_button.dart';
import 'package:orange_ui/common/custom_border.dart';
import 'package:orange_ui/common/custom_text_field.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/screen/create_profile_screen/create_profile_screen.dart';
import 'package:orange_ui/screen/create_profile_screen/view/find_matches.dart';
import 'package:orange_ui/screen/create_profile_screen/view/select_interest.dart';
import 'package:orange_ui/screen/find_match_profile/find_match_profile_view_model.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:stacked/stacked.dart';

class FilterSheet extends StatelessWidget {
  final FindMatchProfileViewModel model;

  const FilterSheet({super.key, required this.model});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<FindMatchProfileViewModel>.reactive(
        viewModelBuilder: () => model,
        disposeViewModel: false,
        builder: (context, model, child) {
          return Container(
            width: double.infinity,
            margin: EdgeInsets.only(top: AppBar().preferredSize.height * 1.5),
            decoration: const ShapeDecoration(
                shape: SmoothRectangleBorder(
                    borderRadius: SmoothBorderRadius.vertical(
                      top: SmoothRadius(cornerRadius: 30, cornerSmoothing: 1),
                    ),
                    side: BorderSide(
                        color: ColorRes.borderColor,
                        strokeAlign: BorderSide.strokeAlignInside)),
                color: ColorRes.white),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Padding(
                padding:
                    const EdgeInsets.symmetric(vertical: 15.0, horizontal: 20),
                child: Column(
                  spacing: 10,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const SizedBox(width: 30),
                        Text(
                          S.of(context).filter,
                          style: const TextStyle(
                              color: ColorRes.darkGrey5,
                              fontSize: 18,
                              fontFamily: FontRes.semiBold),
                        ),
                        BorderIconButton(
                          onTap: () {
                            Get.back();
                          },
                          width: 30,
                          height: 30,
                          icon: AssetRes.icClose,
                          color: ColorRes.dimGrey3,
                          border: Border.all(
                              color: ColorRes.borderColor, width: 1.5),
                        )
                      ],
                    ),
                    const CustomBorder()
                  ],
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  child: SafeArea(
                    top: false,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 30.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        spacing: 15,
                        children: [
                          GenderTiles(
                              selectedType: model.selectedGenderPref,
                              onTap: model.onChangeGenderPref,
                              title: S.current.genderPref),
                          const CustomBorder(),
                          AgeRangePreference(
                              onChanged: model.onChangeAgeRange,
                              value: model.selectedAgeRange),
                          const CustomBorder(),
                          DistancePreference(
                              onChanged: model.onChangeDistance,
                              value: model.selectedDistance),
                          const CustomBorder(),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              TitleTextView(title: S.current.interest),
                              const SizedBox(height: 10),
                              WrapListTiles<Interests>(
                                  items: model.interestList,
                                  selectedItems: model.selectedInterests,
                                  getText: (p0) => p0.title ?? '',
                                  onTap: model.onSelectInterestTap)
                            ],
                          ),
                          const CustomBorder(),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              TitleTextView(title: S.current.relationshipGoals),
                              const SizedBox(height: 10),
                              WrapListTiles<RelationshipGoals>(
                                items: model.relationshipGoals,
                                selectedItems: [model.selectedRelationShipGoal],
                                getText: (p0) => p0.title ?? '',
                                onTap: model.onRelationshipGoalTap,
                              )
                            ],
                          ),
                          const CustomBorder(),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              TitleTextView(title: S.current.religion),
                              const SizedBox(height: 10),
                              WrapListTiles<Religions>(
                                  items: model.religions,
                                  selectedItems: [model.selectedReligion],
                                  getText: (p0) => p0.title ?? '',
                                  onTap: model.onReligionTap)
                            ],
                          ),
                          const CustomBorder(),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              TitleTextView(title: S.current.languages),
                              const SizedBox(height: 10),
                              WrapListTiles<Language>(
                                  items: model.languages,
                                  selectedItems: model.selectedLanguages,
                                  getText: (p0) => p0.title ?? '',
                                  onTap: model.onLanguagesTap)
                            ],
                          ),
                          const CustomBorder(),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              CustomTextButton(
                onTap: () {
                  Get.back();
                  model.filteredProfilesApi(reset: true);
                },
                title: S.current.continueText,
                margin: const EdgeInsets.symmetric(horizontal: 30, vertical: 5),
              )
            ]),
          );
        });
  }
}
