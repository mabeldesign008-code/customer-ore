import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/dashboard/widget/custom_banner_ads.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/style_res.dart';

class BottomButtons extends StatelessWidget {
  final List<String> genderList;
  final int selectedGender;
  final Function(int value) onGenderSelect;
  final VoidCallback onMatchingStart;

  const BottomButtons({super.key,
      required this.genderList,
      required this.selectedGender,
      required this.onGenderSelect,
      required this.onMatchingStart});

  @override
  Widget build(BuildContext context) {
    return Column(
      spacing: 10,
      children: [
        Text(
          S.current.findSomeoneRandomly,
          textAlign: TextAlign.center,
          style: const TextStyle(color: ColorRes.davyGrey, fontSize: 16),
        ),
        const CustomBannerAds(),
        Container(
          height: 50,
          margin: const EdgeInsets.symmetric(horizontal: 28),
          decoration: BoxDecoration(
            color: ColorRes.grey10,
            borderRadius: BorderRadius.circular(7),
          ),
          child: Stack(
            children: [
              AnimatedAlign(
                duration: const Duration(milliseconds: 200),
                alignment: selectedGender == 1
                    ? Alignment.centerLeft
                    : selectedGender == 3
                        ? Alignment.center
                        : Alignment.centerRight,
                child: Container(
                  width: (Get.width / genderList.length) - 14 - (genderList.length * 5),
                  margin: const EdgeInsets.all(5.0),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(7),
                    gradient: StyleRes.linearGradient,
                  ),
                ),
              ),
              Row(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(5.0),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(7),
                      onTap: () {
                        onGenderSelect(1);
                      },
                      child: SizedBox(
                        width: (Get.width / genderList.length) - 14 - (genderList.length * 5),
                        child: Center(
                          child: AnimatedDefaultTextStyle(
                            duration: const Duration(milliseconds: 200),
                            style: TextStyle(
                              color: selectedGender == 1 ? ColorRes.white : ColorRes.davyGrey,
                              fontSize: 13,
                              fontFamily: FontRes.bold,
                            ),
                            child: Text(S.current.male.toUpperCase()),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(5.0),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(7),
                      onTap: () {
                        onGenderSelect(3);
                      },
                      child: SizedBox(
                        width: (Get.width / genderList.length) - 14 - (genderList.length * 5),
                        child: Center(
                          child: AnimatedDefaultTextStyle(
                            duration: const Duration(milliseconds: 200),
                            style: TextStyle(
                              color: selectedGender == 3 ? ColorRes.white : ColorRes.davyGrey,
                              fontSize: 13,
                              fontFamily: FontRes.bold,
                            ),
                            child: Text(S.current.both.toUpperCase()),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(5.0),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(7),
                      onTap: () {
                        onGenderSelect(2);
                      },
                      child: SizedBox(
                        width: (Get.width / genderList.length) - 14 - (genderList.length * 5),
                        child: Center(
                          child: AnimatedDefaultTextStyle(
                            duration: const Duration(milliseconds: 200),
                            style: TextStyle(
                              color: selectedGender == 2 ? ColorRes.white : ColorRes.davyGrey,
                              fontSize: 13,
                              fontFamily: FontRes.bold,
                            ),
                            child: Text(S.current.female.toUpperCase()),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: InkWell(
            borderRadius: BorderRadius.circular(10),
            onTap: onMatchingStart,
            child: Container(
              height: 50,
              width: Get.width,
              decoration: BoxDecoration(
                color: ColorRes.themeColor.withValues(alpha: 0.13),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Center(
                child: Text(
                  S.of(context).startFinding.toUpperCase(),
                  style: const TextStyle(
                    color: ColorRes.themeColor,
                    fontFamily: FontRes.bold,
                    letterSpacing: 0.8,
                  ),
                ),
              ),
            ),
          ),
        ),
        SizedBox(height: Get.height / 60),
      ],
    );
  }
}
