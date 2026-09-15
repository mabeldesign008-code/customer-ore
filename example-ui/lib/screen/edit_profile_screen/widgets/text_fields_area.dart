import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/custom_text_field.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/screen/countries/my_selective_field.dart';
import 'package:orange_ui/screen/countries/select_city_sheet.dart';
import 'package:orange_ui/screen/countries/select_country_sheet.dart';
import 'package:orange_ui/screen/countries/select_state_sheet.dart';
import 'package:orange_ui/screen/create_profile_screen/create_profile_screen.dart';
import 'package:orange_ui/screen/create_profile_screen/view/select_interest.dart';
import 'package:orange_ui/screen/edit_profile_screen/edit_profile_screen_view_model.dart';

class TextFieldsArea extends StatelessWidget {
  final EditProfileScreenViewModel model;

  const TextFieldsArea({super.key, required this.model});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 17),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: 15,
        children: [
          const SizedBox(height: 10),
          CustomTextField(
              controller: model.fullNameController,
              title: S.current.enterFullName),
          CustomTextField(
              controller: model.userNameController, title: S.current.username),
          CustomTextField(
            controller: model.bioController,
            title: S.current.bio,
            height: 80,
            isExpand: true,
          ),
          CustomTextField(
              controller: model.aboutController,
              title: S.current.about,
              height: 150,
              isExpand: true),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 10,
            children: [
              TitleTextView(title: S.of(context).country),
              Obx(
                () => MySelectiveField(
                  placeholder: model.selectCountryController.selectedCountry
                          .value?.countryName ??
                      S.current.country,
                  bottomSheet: SelectCountrySheet(
                    controller: model.selectCountryController,
                  ),
                  onDismiss: () {
                    model.selectCountryController.searchCountry('');
                  },
                  isSelected: true,
                ),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 10,
            children: [
              TitleTextView(title: S.of(context).state),
              Obx(
                () => MySelectiveField(
                  placeholder:
                      model.selectCountryController.selectedState.value?.name ??
                          S.of(context).state,
                  bottomSheet: SelectStateSheet(
                      controller: model.selectCountryController),
                  onDismiss: () {
                    model.selectCountryController.searchState('');
                  },
                  isSelected:
                      model.selectCountryController.selectedCountry.value !=
                          null,
                ),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 10,
            children: [
              TitleTextView(title: S.of(context).city),
              Obx(
                () => MySelectiveField(
                  placeholder:
                      model.selectCountryController.selectedCity.value?.name ??
                          S.of(context).city,
                  bottomSheet: SelectCitySheet(
                      controller: model.selectCountryController),
                  onDismiss: () {
                    model.selectCountryController.searchCity('');
                  },
                  isSelected:
                      model.selectCountryController.selectedState.value != null,
                ),
              ),
            ],
          ),
          CustomTextField(
            title: S.current.dateOfBirth,
            child: DateOfBirthTiles(
                onTap: () => model.onDateOfBirthTap(context),
                selectedDob: model.selectedDob),
          ),
          GenderTiles(
              selectedType: model.selectedGender, onTap: model.onGenderTap),
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
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TitleTextView(title: S.current.religion),
              const SizedBox(height: 10),
              WrapListTiles<Religions>(
                items: model.religions,
                selectedItems: [model.selectedReligion],
                getText: (p0) => p0.title ?? '',
                onTap: model.onReligionTap,
              )
            ],
          ),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            TitleTextView(title: S.current.languages),
            const SizedBox(height: 10),
            WrapListTiles<Language>(
              items: model.languages,
              selectedItems: model.selectedLanguages,
              getText: (p0) => p0.title ?? '',
              onTap: model.onLanguagesTap,
            )
          ]),
          CustomTextField(
              controller: model.instagramController,
              title: S.current.instagram.capitalize ?? ''),
          CustomTextField(
              controller: model.facebookController,
              title: S.current.facebook.capitalize ?? ''),
          CustomTextField(
              controller: model.youtubeController,
              title: S.current.youtube.capitalize ?? ''),
          const SizedBox(height: 20),
        ],
      ),
    );
  }
}
