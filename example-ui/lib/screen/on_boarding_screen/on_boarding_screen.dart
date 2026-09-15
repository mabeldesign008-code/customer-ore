import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/button/custom_icon_button.dart';
import 'package:orange_ui/common/button/custom_text_button.dart';
import 'package:orange_ui/common/custom_image.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/screen/on_boarding_screen/on_boarding_screen_view_model.dart';
import 'package:orange_ui/service/extention/string_extention.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';
import 'package:stacked/stacked.dart';

class OnBoardingScreen extends StatelessWidget {
  final List<Onboarding> onBoarding;

  const OnBoardingScreen({super.key, required this.onBoarding});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<OnBoardingScreenViewModel>.reactive(
        onViewModelReady: (viewModel) {
          viewModel.init();
        },
        viewModelBuilder: () => OnBoardingScreenViewModel(),
        builder: (context, viewModel, child) {
          return Scaffold(
            backgroundColor: ColorRes.white,
            resizeToAvoidBottomInset: false,
            body: SafeArea(
              child: Stack(
                children: [
                  Column(
                    spacing: 10,
                    children: [
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 250),
                        child: CustomImage(
                            key: ValueKey<int>(viewModel.selectedPage),
                            image: onBoarding[viewModel.selectedPage]
                                .image
                                ?.addBaseURL(),
                            height: Get.height / 1.8,
                            width: Get.width,
                            fit: BoxFit.fitHeight,
                            showShimmer: false),
                      ),
                      SmoothPageIndicator(
                        controller: viewModel.pageController, // PageController
                        count: 3,
                        effect: const ExpandingDotsEffect(
                            activeDotColor: ColorRes.themeColor,
                            dotColor: ColorRes.borderColor,
                            dotHeight: 8,
                            dotWidth: 8,
                            spacing: 5,
                            expansionFactor: 4), // your preferred effect
                      ),
                    ],
                  ),
                  Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    spacing: 30,
                    children: [
                      Expanded(
                        child: PageView.builder(
                            controller: viewModel.pageController,
                            onPageChanged: (value) {
                              viewModel.selectedPage = value;
                              viewModel.notifyListeners();
                            },
                            itemCount: onBoarding.length,
                            itemBuilder: (context, index) {
                              Onboarding item = onBoarding[index];
                              return Padding(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 30.0),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.end,
                                  children: [
                                    Text(
                                      item.title ?? '',
                                      style: const TextStyle(
                                          fontFamily: FontRes.bold,
                                          fontSize: 25),
                                      textAlign: TextAlign.center,
                                      overflow: TextOverflow.ellipsis,
                                      maxLines: 2,
                                    ),
                                    Text(item.description ?? '',
                                        style: const TextStyle(
                                            fontFamily: FontRes.regular,
                                            fontSize: 20,
                                            color: ColorRes.dimGrey3),
                                        textAlign: TextAlign.center,
                                        overflow: TextOverflow.ellipsis,
                                        maxLines: 3),
                                  ],
                                ),
                              );
                            }),
                      ),
                      Container(
                        margin: const EdgeInsets.symmetric(horizontal: 30),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            CustomTextButton(
                              onTap: viewModel.onSkip,
                              bgColor: ColorRes.borderColor,
                              title: S.current.skip,
                              height: 46,
                              cornerRadius: 30,
                              textColor: ColorRes.dimGrey3,
                              fontFamily: FontRes.medium,
                            ),
                            CustomIconButton(
                                onTap: () => viewModel.onNextTap(onBoarding)),
                          ],
                        ),
                      ),
                    ],
                  )
                ],
              ),
            ),
          );
        });
  }
}
