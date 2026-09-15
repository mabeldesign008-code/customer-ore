import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:orange_ui/common/button/custom_text_button.dart';
import 'package:orange_ui/common/custom_text_field.dart';
import 'package:orange_ui/common/login_setup_view.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/countries/my_selective_field.dart';
import 'package:orange_ui/screen/countries/select_city_sheet.dart';
import 'package:orange_ui/screen/countries/select_country_sheet.dart';
import 'package:orange_ui/screen/countries/select_state_sheet.dart';
import 'package:orange_ui/screen/create_profile_screen/create_profile_screen_view_model.dart';
import 'package:orange_ui/screen/create_profile_screen/widget/border_text_card.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:stacked/stacked.dart';

class CreateProfileScreen extends StatelessWidget {
  const CreateProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<CreateProfileScreenViewModel>.reactive(
        viewModelBuilder: () => Get.find<CreateProfileScreenViewModel>(),
        disposeViewModel: false,
        builder: (context, viewModel, child) {
          return LoginSetupView(
            title: S.of(context).createProfile,
            description: S.of(context).letsSetUpYourPerfectProfile,
            child: Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      spacing: 20,
                      children: [
                        CustomTextField(
                            title: S.current.fullName,
                            prefixIcon: AssetRes.icProfileUser,
                            controller: viewModel.fullnameController),
                        CustomTextField(
                          controller: viewModel.bioController,
                          height: 90,
                          title: S.current.bio,
                          isExpand: true,
                        ),
                        CustomTextField(
                          controller: viewModel.aboutController,
                          height: 90,
                          title: S.current.about,
                          isExpand: true,
                        ),
                        CustomTextField(
                          title: S.current.dateOfBirth,
                          child: DateOfBirthTiles(
                              onTap: () => viewModel.onDateOfBirthTap(context),
                              selectedDob: viewModel.selectedDob),
                        ),
                        GenderTiles(
                            selectedType: viewModel.selectedGenderType,
                            onTap: viewModel.onGenderTap),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          spacing: 10,
                          children: [
                            TitleTextView(title: S.of(context).country),
                            Obx(
                              () => MySelectiveField(
                                placeholder: viewModel.selectCountryController
                                        .selectedCountry.value?.countryName ??
                                    S.current.country,
                                bottomSheet: SelectCountrySheet(
                                  controller: viewModel.selectCountryController,
                                ),
                                onDismiss: () {
                                  viewModel.selectCountryController
                                      .searchCountry('');
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
                                placeholder: viewModel.selectCountryController
                                        .selectedState.value?.name ??
                                    S.of(context).state,
                                bottomSheet: SelectStateSheet(
                                    controller:
                                        viewModel.selectCountryController),
                                onDismiss: () {
                                  viewModel.selectCountryController
                                      .searchState('');
                                },
                                isSelected: viewModel.selectCountryController
                                        .selectedCountry.value !=
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
                                placeholder: viewModel.selectCountryController
                                        .selectedCity.value?.name ??
                                    S.of(context).city,
                                bottomSheet: SelectCitySheet(
                                    controller:
                                        viewModel.selectCountryController),
                                onDismiss: () {
                                  viewModel.selectCountryController
                                      .searchCity('');
                                },
                                isSelected: viewModel.selectCountryController
                                        .selectedState.value !=
                                    null,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                      ],
                    ),
                  ),
                ),
                CustomTextButton(
                  onTap: () => viewModel
                      .onContinueTap(CreateProfileContinueTap.createProfile),
                )
              ],
            ),
          );
        });
  }
}

class DateOfBirthTiles extends StatelessWidget {
  final VoidCallback onTap;
  final DateTime selectedDob;

  const DateOfBirthTiles(
      {super.key, required this.onTap, required this.selectedDob});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Row(
        children: [
          Padding(
            padding: const EdgeInsets.all(10.0),
            child: Image.asset(
              AssetRes.icCalender,
              height: 20,
              width: 20,
              color: ColorRes.dimGrey3,
            ),
          ),
          Expanded(
            child: Text(
              DateFormat('dd-MMM-yyyy').format(selectedDob),
              style: const TextStyle(
                  color: ColorRes.dimGrey3,
                  fontFamily: FontRes.medium,
                  fontSize: 16),
            ),
          )
        ],
      ),
    );
  }
}

class GenderTiles extends StatelessWidget {
  final String? title;
  final GenderType selectedType;
  final Function(GenderType type) onTap;

  const GenderTiles(
      {super.key, required this.selectedType, required this.onTap, this.title});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      spacing: 10,
      children: [
        TitleTextView(title: (title ?? S.current.gender).capitalize ?? ''),
        Row(
          spacing: 10,
          children: List.generate(
            GenderType.values.length,
            (index) {
              GenderType type = GenderType.values[index];
              bool isSelected =
                  selectedType.value == GenderType.values[index].value;
              return Expanded(
                child: BorderTextCard(
                  onTap: () => onTap(type),
                  text: type.title,
                  isSelected: isSelected,
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
