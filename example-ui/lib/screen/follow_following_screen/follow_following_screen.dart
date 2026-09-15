import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/common/custom_image.dart';
import 'package:orange_ui/common/fullname_with_age.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/follow_following_screen/follow_following_screen_view_model.dart';
import 'package:orange_ui/screen/user_detail_screen/user_detail_screen.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:stacked/stacked.dart';

class FollowFollowingScreen extends StatelessWidget {
  final FollowFollowingType followFollowingType;
  final int userId;

  const FollowFollowingScreen(
      {super.key, required this.followFollowingType, required this.userId});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<FollowFollowingScreenViewModel>.reactive(
      viewModelBuilder: () =>
          FollowFollowingScreenViewModel(followFollowingType, userId),
      onViewModelReady: (viewModel) => viewModel.init(),
      builder: (context, viewModel, child) {
        return Scaffold(
          backgroundColor: ColorRes.white,
          body: Column(
            children: [
              SafeArea(
                bottom: false,
                child: Container(
                  height: 60,
                  margin: const EdgeInsets.symmetric(horizontal: 15),
                  child: Stack(
                    alignment: Alignment.centerLeft,
                    children: [
                      InkWell(
                          onTap: () {
                            Get.back();
                          },
                          child: const Icon(Icons.arrow_back,
                              color: ColorRes.davyGrey)),
                      Align(
                        alignment: Alignment.center,
                        child: Text(
                          FollowFollowingType.following == followFollowingType
                              ? S.of(context).followingList
                              : S.of(context).followerList,
                          style: const TextStyle(
                              color: ColorRes.davyGrey,
                              fontFamily: FontRes.semiBold,
                              fontSize: 18),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Expanded(
                child: viewModel.isLoading && viewModel.users.isEmpty
                    ? CommonUI.lottieWidget()
                    : viewModel.users.isEmpty
                        ? CommonUI.noData()
                        : ListView.builder(
                            controller: viewModel.scrollController,
                            itemCount: viewModel.users.length,
                            padding: EdgeInsets.zero,
                            itemBuilder: (context, index) {
                              UserData user = viewModel.users[index];
                              return InkWell(
                                onTap: () {
                                  Get.to(() => UserDetailScreen(
                                        userData: user,
                                        userId: user.id,
                                      ));
                                },
                                child: Container(
                                  margin: const EdgeInsets.symmetric(
                                      horizontal: 15, vertical: 5),
                                  decoration: ShapeDecoration(
                                    shape: RoundedRectangleBorder(
                                        borderRadius:
                                            BorderRadius.circular(12)),
                                    color: ColorRes.lightGrey2,
                                  ),
                                  padding: const EdgeInsets.all(10),
                                  child: Row(
                                    children: [
                                      CustomImage(
                                          image: user.profileImage,
                                          fullname: user.fullname,
                                          height: 50,
                                          width: 50,
                                          radius: 7),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          spacing: 5,
                                          children: [
                                            FullnameWithAge(
                                                userData: user,
                                                fontColor: ColorRes.darkGrey,
                                                fontSize: 18),
                                            Text(
                                              user.address,
                                              style: const TextStyle(
                                                  color: ColorRes.darkGrey9,
                                                  fontFamily: FontRes.regular,
                                                  fontSize: 13),
                                              overflow: TextOverflow.ellipsis,
                                              maxLines: 1,
                                            )
                                          ],
                                        ),
                                      )
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
              )
            ],
          ),
        );
      },
    );
  }
}
