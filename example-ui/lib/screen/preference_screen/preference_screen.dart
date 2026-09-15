import 'package:flutter/material.dart';
import 'package:orange_ui/common/button/custom_text_button.dart';
import 'package:orange_ui/common/top_bar_area.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/create_profile_screen/create_profile_screen.dart';
import 'package:orange_ui/screen/create_profile_screen/view/find_matches.dart';
import 'package:orange_ui/screen/preference_screen/preference_screen_view_model.dart';
import 'package:stacked/stacked.dart';

class PreferenceScreen extends StatelessWidget {
  const PreferenceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder.reactive(
        onViewModelReady: (viewModel) => viewModel.init(),
        viewModelBuilder: () => PreferenceScreenViewModel(),
        builder: (context, model, child) {
          return Scaffold(
            body: SafeArea(
              child: Column(
                children: [
                  TopBarArea(title2: S.of(context).matchPreference),
                  Expanded(
                    child: SingleChildScrollView(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 15.0),
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            spacing: 20,
                            children: [
                              GenderTiles(
                                  selectedType: model.selectedGenderPref,
                                  onTap: model.onChangeGenderPref,
                                  title: S.current.genderPref),
                              AgeRangePreference(
                                  onChanged: model.onChangeAgeRange,
                                  value: model.selectedAgeRange),
                              DistancePreference(
                                  onChanged: model.onChangeDistance,
                                  value: model.selectedDistance),
                            ]),
                      ),
                    ),
                  ),
                  CustomTextButton(
                    onTap: model.onSaveTap,
                    title: S.current.save,
                    margin: const EdgeInsets.only(
                        left: 20, right: 20, top: 15, bottom: 10),
                  )
                ],
              ),
            ),
          );
        });
  }
}
