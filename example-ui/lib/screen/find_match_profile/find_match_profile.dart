import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:orange_ui/common/button/custom_text_button.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/common/custom_image.dart';
import 'package:orange_ui/common/fullname_with_age.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/find_match_profile/find_match_profile_view_model.dart';
import 'package:orange_ui/screen/find_match_profile/widget/bouncing_heart.dart';
import 'package:orange_ui/screen/find_match_profile/widget/custom_bottom_shape.dart';
import 'package:orange_ui/screen/find_match_profile/widget/empty_find_match.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:stacked/stacked.dart';

class FindMatchProfile extends StatelessWidget {
  const FindMatchProfile({super.key});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<FindMatchProfileViewModel>.reactive(
      onViewModelReady: (viewModel) => viewModel.init(),
      viewModelBuilder: () => FindMatchProfileViewModel(),
      builder: (context, viewModel, child) {
        if (viewModel.isLoading && viewModel.filterUsers.isEmpty) {
          return CommonUI.lottieWidget();
        } else {
          if (!viewModel.isLoading && viewModel.filterUsers.isEmpty) {
            return EmptyFindMatch(onTap: viewModel.onFilterChange);
          } else {
            return Column(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    const SizedBox(width: 37, height: 37),
                    Text(S.of(context).itsAMatch,
                        style: const TextStyle(
                            fontFamily: FontRes.bold,
                            fontSize: 30,
                            color: ColorRes.themeColor)),
                    InkWell(
                      onTap: viewModel.onFilterChange,
                      child: Container(
                        height: 37,
                        width: 37,
                        margin: const EdgeInsets.all(10),
                        decoration: const BoxDecoration(
                            shape: BoxShape.circle, color: ColorRes.themeColor),
                        alignment: Alignment.center,
                        child: Image.asset(AssetRes.icFilter,
                            color: ColorRes.white, width: 30, height: 30),
                      ),
                    )
                  ],
                ),
                SingleChildScrollView(
                  child: Container(
                    height: 370,
                    alignment: Alignment.center,
                    child: PageView.builder(
                        controller: viewModel.pageController,
                        itemCount: viewModel.filterUsers.length,
                        onPageChanged: viewModel.onPageChanged,
                        physics: const NeverScrollableScrollPhysics(),
                        itemBuilder: (context, index) {
                          UserData matchedUser = viewModel.filterUsers[index];
                          return Column(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              SizedBox(
                                height: 230,
                                child: Stack(
                                  children: [
                                    Padding(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 40.0),
                                      child: Row(
                                        spacing: 2,
                                        mainAxisAlignment:
                                            MainAxisAlignment.center,
                                        children: [
                                          Expanded(
                                            child: ClipPath(
                                              clipper: CustomBottomLiftShape(
                                                  liftCorner:
                                                      BottomLiftCorner.right,
                                                  lift: 25),
                                              child: CustomImage(
                                                  image: viewModel
                                                      .myProfile?.profileImage,
                                                  fit: BoxFit.cover,
                                                  height: double.infinity),
                                            ),
                                          ),
                                          Expanded(
                                            child: ClipPath(
                                              clipper: CustomBottomLiftShape(
                                                  liftCorner:
                                                      BottomLiftCorner.left,
                                                  lift: 25),
                                              child: CustomImage(
                                                  image:
                                                      matchedUser.profileImage,
                                                  height: double.infinity),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const BouncingHeart()
                                  ],
                                ),
                              ),
                              Center(
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 20.0),
                                  child: Column(
                                    spacing: 5,
                                    crossAxisAlignment:
                                        CrossAxisAlignment.center,
                                    children: [
                                      FullnameWithAge(
                                        userData: matchedUser,
                                        fontColor: ColorRes.black,
                                        mainAxisAlignment:
                                            MainAxisAlignment.center,
                                      ),
                                      Text(
                                        matchedUser.bio ?? '',
                                        style: const TextStyle(
                                            fontFamily: FontRes.regular,
                                            fontSize: 16,
                                            color: ColorRes.dimGrey3),
                                        textAlign: TextAlign.center,
                                        maxLines: 3,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      if (matchedUser.address.isNotEmpty)
                                        Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.center,
                                          crossAxisAlignment:
                                              CrossAxisAlignment.center,
                                          spacing: 3,
                                          children: [
                                            Image.asset(AssetRes.icLocationPin,
                                                height: 20, width: 20),
                                            Flexible(
                                              child: Text(
                                                matchedUser.address,
                                                style: const TextStyle(
                                                    fontFamily: FontRes.regular,
                                                    fontSize: 16,
                                                    color: ColorRes.dimGrey3),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                          ],
                                        ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          );
                        }),
                  ),
                ),
                InkWell(
                  onTap: viewModel.yourMatching,
                  child: FittedBox(
                    child: Container(
                      height: 50,
                      decoration: ShapeDecoration(
                        shape: SmoothRectangleBorder(
                            borderRadius: SmoothBorderRadius(
                                cornerRadius: 15, cornerSmoothing: 1),
                            side:
                                const BorderSide(color: ColorRes.borderColor)),
                      ),
                      alignment: Alignment.center,
                      padding: const EdgeInsets.symmetric(horizontal: 15),
                      child: Row(
                        spacing: 10,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Image.asset(AssetRes.icEyeBlack,
                              color: ColorRes.dimGrey3, width: 20, height: 20),
                          Text(
                            S.of(context).yourMatchings,
                            style: const TextStyle(
                                color: ColorRes.dimGrey3,
                                fontFamily: FontRes.medium,
                                fontSize: 16),
                          )
                        ],
                      ),
                    ),
                  ),
                ),
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    spacing: 15,
                    children: [
                      Expanded(
                        child: CustomTextButton(
                          onTap: viewModel.goToProfileTap,
                          title: S.of(context).goToProfile,
                          bottomSafeArea: false,
                        ),
                      ),
                      Expanded(
                        child: CustomTextButton(
                          onTap: viewModel.onNextProfileTap,
                          title: S.of(context).nextProfile,
                          bgColor: ColorRes.themeColor.withValues(alpha: 0.1),
                          textColor: ColorRes.themeColor,
                          fontFamily: FontRes.medium,
                          bottomSafeArea: false,
                          widget: Padding(
                            padding:
                                const EdgeInsets.symmetric(horizontal: 3.0),
                            child: RotatedBox(
                              quarterTurns: 2,
                              child: Image.asset(
                                AssetRes.icBack,
                                height: 20,
                                width: 20,
                                color: ColorRes.themeColor,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                InkWell(
                  onTap: viewModel.hideProfile,
                  child: SafeArea(
                    top: false,
                    child: Container(
                      height: 30,
                      color: Colors.transparent,
                      alignment: Alignment.center,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        spacing: 10,
                        children: [
                          Image.asset(AssetRes.icStopHand,
                              color: ColorRes.themeColor,
                              width: 20,
                              height: 20),
                          Text(
                            S.of(context).dontShowThisProfileAgain,
                            style: const TextStyle(
                                fontFamily: FontRes.bold,
                                color: ColorRes.themeColor,
                                fontSize: 16),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
              ],
            );
          }
        }
      },
    );
  }
}

/// A custom clipper that creates a diagonal cut at the bottom of the widget.
/// The path starts from the top-left corner, then goes diagonally upwards
/// from near the bottom-left corner to the bottom-right corner, and then
/// completes the rectangle.
class DiagonalPathClipperOne extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    final path = Path();

    // Start from top-left corner
    path.lineTo(0.0, size.height - 50);

    // // Draw diagonal line towards bottom-right, stop before the corner radius
    path.lineTo(size.width, size.height);

    // Line to top-right corner
    path.lineTo(size.width, 0.0);
    path.quadraticBezierTo(size.width, 0.0, size.width, 0.0);
    // Close back to start
    path.close();

    return path;
  }

  @override
  bool shouldReclip(CustomClipper<Path> oldClipper) {
    // Reclip every time the widget updates
    return true;
  }
}

class DiagonalPathClipperTwo extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    final path = Path()
      ..lineTo(0.0, size.height)
      ..lineTo(size.width, size.height - 50)
      ..lineTo(size.width, 0.0)
      ..close();
    return path;
  }

  @override
  bool shouldReclip(CustomClipper<Path> oldClipper) {
    return true;
  }
}

class RoundedDiagonalPathClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    final path = Path()
      ..lineTo(0.0, size.height)
      ..lineTo(size.width, size.height)
      ..lineTo(size.width, 0.0)
      ..quadraticBezierTo(size.width, 0.0, size.width - 20.0, 0.0)
      ..lineTo(40.0, 70.0)
      ..quadraticBezierTo(10.0, 85.0, 0.0, 120.0)
      ..close();
    return path;
  }

  @override
  bool shouldReclip(CustomClipper<Path> oldClipper) {
    return true;
  }
}
