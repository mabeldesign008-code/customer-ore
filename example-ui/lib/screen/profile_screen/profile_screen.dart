import 'package:flutter/material.dart';
import 'package:orange_ui/screen/profile_screen/profile_screen_view_model.dart';
import 'package:orange_ui/screen/profile_screen/widget/profile_images_area.dart';
import 'package:stacked/stacked.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<ProfileScreenViewModel>.reactive(
      onViewModelReady: (model) {
        model.init();
      },
      viewModelBuilder: () => ProfileScreenViewModel(),
      builder: (context, model, child) {
        return ProfileImageArea(
          userData: model.userData,
          pageController: model.pageController,
          onEditProfileTap: model.onEditProfileTap,
          onMoreBtnTap: model.onMoreBtnTap,
          onImageTap: model.onImageTap,
          onInstagramTap: () => model.onSocialBtnTap(model.userData?.instagram),
          onFacebookTap: () => model.onSocialBtnTap(model.userData?.facebook),
          onYoutubeTap: () => model.onSocialBtnTap(model.userData?.youtube),
          isLoading: model.isLoading,
          isVerified: model.userData?.isVerified == 2 ? true : false,
          isSocialBtnVisible: model.isSocialBtnVisible,
        );
      },
    );
  }
}
