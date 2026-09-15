import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/button/border_icon_button.dart';
import 'package:orange_ui/common/custom_border.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/create_profile_screen/widget/border_text_card.dart';
import 'package:orange_ui/screen/find_match_profile/find_match_profile_view_model.dart';
import 'package:orange_ui/service/extention/string_extention.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class YourMatchingSheet extends StatelessWidget {
  final FindMatchProfileViewModel model;
  final UserData matchedUser;

  const YourMatchingSheet(
      {super.key, required this.model, required this.matchedUser});

  @override
  Widget build(BuildContext context) {
    // Safely split comma-separated strings into trimmed lists
    List<String> interestIds = (matchedUser.matchedInterests ?? '')
        .split(',')
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty)
        .toList();

    List<String> languages = (matchedUser.matchedLanguages ?? '')
        .split(',')
        .map((e) => e.removeEmojis.trim())
        .where((e) => e.isNotEmpty)
        .toList();

    // Match interests
    List<Interests> matchedInterest = model.interestList.where((element) {
      return element.isDeleted == 0 &&
          interestIds.contains(element.id.toString());
    }).toList();

    // Match religion (first match)
    Religions? matchedReligions = model.religions.firstWhereOrNull((element) {
      return element.isDeleted == 0 &&
          matchedUser.religionKey?.removeEmojis.trim() ==
              element.titleRemoveEmoji;
    });

    // Match languages
    List<Language> matchedLanguages = model.languages.where((element) {
      return element.isDeleted == 0 &&
          languages.contains(element.titleRemoveEmoji);
    }).toList();

    // Match relationship goal
    RelationshipGoals? matchedRelationShopGoal = model.relationshipGoals
        .firstWhereOrNull((element) =>
            element.isDeleted == 0 &&
            element.id == matchedUser.relationshipGoalId);

    return Container(
      margin: EdgeInsets.only(top: AppBar().preferredSize.height * 3),
      padding: const EdgeInsets.all(20),
      width: double.infinity,
      decoration: const ShapeDecoration(
        color: ColorRes.white,
        shape: SmoothRectangleBorder(
            borderRadius: SmoothBorderRadius.vertical(
                top: SmoothRadius(cornerRadius: 30, cornerSmoothing: 1))),
      ),
      child: Column(
        spacing: 10,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const SizedBox(width: 30),
              Text(
                S.current.yourMatching,
                style: const TextStyle(
                    fontFamily: FontRes.semiBold,
                    fontSize: 18,
                    color: ColorRes.davyGrey),
              ),
              BorderIconButton(
                  onTap: Get.back,
                  icon: AssetRes.icClose,
                  border: Border.all(color: ColorRes.borderColor),
                  color: ColorRes.dimGrey3,
                  height: 30,
                  width: 30)
            ],
          ),
          const CustomBorder(),
          Expanded(
              child: SingleChildScrollView(
            child: Column(
              spacing: 20,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (matchedInterest.isNotEmpty)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: 10,
                    children: [
                      _textTitle(S.current.interest),
                      Wrap(
                        spacing: 5,
                        runSpacing: 5,
                        children: List.generate(
                          matchedInterest.length,
                          (index) {
                            Interests interest = matchedInterest[index];
                            return FittedBox(
                              child: BorderTextCard(
                                text: interest.title ?? '',
                                onTap: () {},
                                isSelected: true,
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 15),
                              ),
                            );
                          },
                        ),
                      )
                    ],
                  ),
                if (matchedRelationShopGoal != null)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: 10,
                    children: [
                      _textTitle(S.current.relationshipGoals.removeEmojis),
                      FittedBox(
                        child: BorderTextCard(
                          text: matchedRelationShopGoal.title ?? '',
                          onTap: () {},
                          isSelected: true,
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                        ),
                      )
                    ],
                  ),
                if (matchedReligions != null)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: 10,
                    children: [
                      _textTitle(S.of(context).religion),
                      FittedBox(
                        child: BorderTextCard(
                          text: matchedReligions.title ?? '',
                          onTap: () {},
                          isSelected: true,
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                        ),
                      )
                    ],
                  ),
                if (matchedLanguages.isNotEmpty)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: 10,
                    children: [
                      _textTitle(S.current.language),
                      Wrap(
                        spacing: 5,
                        runSpacing: 5,
                        children: List.generate(
                          matchedLanguages.length,
                          (index) {
                            Language lang = matchedLanguages[index];
                            return FittedBox(
                              child: Container(
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 5),
                                child: BorderTextCard(
                                  text: lang.title ?? '',
                                  onTap: () {},
                                  isSelected: true,
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 20),
                                ),
                              ),
                            );
                          },
                        ),
                      )
                    ],
                  ),
              ],
            ),
          ))
        ],
      ),
    );
  }

  Widget _textTitle(String title) {
    return Text(title,
        style: const TextStyle(
            fontFamily: FontRes.semiBold, fontSize: 16, color: ColorRes.black));
  }
}
