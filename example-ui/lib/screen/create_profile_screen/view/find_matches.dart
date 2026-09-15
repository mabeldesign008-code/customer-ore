import 'package:flutter/material.dart';
import 'package:orange_ui/common/button/custom_text_button.dart';
import 'package:orange_ui/common/custom_text_field.dart';
import 'package:orange_ui/common/login_setup_view.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/create_profile_screen/create_profile_screen_view_model.dart';
import 'package:orange_ui/screen/create_profile_screen/widget/border_text_card.dart';
import 'package:orange_ui/utils/app_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:stacked/stacked.dart';

class FindMatches extends StatelessWidget {
  final UserData? userData;
  final CreateProfileScreenViewModel model;

  const FindMatches({super.key, this.userData, required this.model});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<CreateProfileScreenViewModel>.reactive(
      viewModelBuilder: () => model,
      disposeViewModel: false,
      builder: (context, viewModel, child) => LoginSetupView(
        title: S.of(context).findMatches,
        description: S.of(context).discoverPeopleWhoMatchYourVibe,
        child: Column(
          spacing: 30,
          children: [
            Expanded(
                child: SingleChildScrollView(
                    child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: 30,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: 10,
                  children: [
                    TitleTextView(title: S.of(context).preferredGender),
                    Row(
                      spacing: 10,
                      children: List.generate(
                        viewModel.preferredGenderTypes.length,
                        (index) {
                          bool isSelected = viewModel.selectedPreferredGender ==
                              viewModel.preferredGenderTypes[index];
                          return Expanded(
                            child: BorderTextCard(
                              onTap: () => viewModel.onPreferredGenderTap(
                                  viewModel.preferredGenderTypes[index]),
                              text: GenderType.values[index].title,
                              isSelected: isSelected,
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
                AgeRangePreference(
                    onChanged: viewModel.onChangeAgeRange,
                    value: viewModel.selectedAgeRange),
                DistancePreference(
                    onChanged: viewModel.onChangeDistance,
                    value: viewModel.selectedDistance),
              ],
            ))),
            CustomTextButton(
                onTap: () => viewModel
                    .onContinueTap(CreateProfileContinueTap.findMatches))
          ],
        ),
      ),
    );
  }
}

class AgeRangePreference extends StatelessWidget {
  final RangeValues value;
  final Function(RangeValues value) onChanged;

  const AgeRangePreference(
      {super.key, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      spacing: 10,
      children: [
        Row(
          children: [
            Expanded(child: TitleTextView(title: S.of(context).ageRange)),
            TitleTextView(
                title: '${value.start.toInt()} - ${value.end.toInt()}'),
          ],
        ),
        SliderTheme(
          data: SliderTheme.of(context).copyWith(
            overlayShape: const RoundSliderOverlayShape(overlayRadius: 0),
            rangeThumbShape: const RoundRangeSliderThumbShape(
                enabledThumbRadius: 6,
                // decrease to make smaller (default is 10)
                disabledThumbRadius: 10,
                pressedElevation: 0,
                elevation: 0),
            trackHeight: 1,
          ),
          child: RangeSlider(
            values: value,
            onChanged: onChanged,
            min: AppRes.ageMin,
            max: AppRes.ageMax,
            activeColor: ColorRes.themeColor,
            inactiveColor: ColorRes.borderColor,
          ),
        )
      ],
    );
  }
}

class DistancePreference extends StatelessWidget {
  final double value;
  final Function(double value) onChanged;

  const DistancePreference(
      {super.key, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      spacing: 10,
      children: [
        Row(
          children: [
            Expanded(
                child: TitleTextView(title: S.of(context).distancePreference)),
            TitleTextView(
                title: '${value.toInt()} ${S.current.km.toLowerCase()}'),
          ],
        ),
        SliderTheme(
          data: SliderTheme.of(context).copyWith(
              overlayShape: const RoundSliderOverlayShape(overlayRadius: 5),
              thumbShape: const RoundSliderThumbShape(
                  enabledThumbRadius: 6,
                  // decrease to make smaller (default is 10)
                  disabledThumbRadius: 10,
                  elevation: 0,
                  pressedElevation: 0),
              trackHeight: 1),
          child: Slider(
              value: value,
              onChanged: onChanged,
              min: 0,
              max: AppRes.maximumDistancePreference,
              activeColor: ColorRes.themeColor,
              inactiveColor: ColorRes.borderColor),
        )
      ],
    );
  }
}
