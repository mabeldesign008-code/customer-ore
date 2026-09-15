import 'dart:io';

import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/button/custom_text_button.dart';
import 'package:orange_ui/common/custom_image.dart';
import 'package:orange_ui/common/custom_text_field.dart';
import 'package:orange_ui/common/login_setup_view.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/create_profile_screen/create_profile_screen_view_model.dart';
import 'package:orange_ui/screen/create_profile_screen/widget/border_text_card.dart';
import 'package:orange_ui/service/extention/string_extention.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:stacked/stacked.dart';

class AddPhotos extends StatelessWidget {
  final UserData? userData;
  final CreateProfileScreenViewModel model;

  const AddPhotos({super.key, this.userData, required this.model});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<CreateProfileScreenViewModel>.reactive(
        viewModelBuilder: () => model,
        disposeViewModel: false,
        builder: (context, viewModel, child) {
          return LoginSetupView(
            title: S.of(context).addYourProfilePhotos,
            description: S.of(context).letYourPhotosTellYourStory,
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                const SizedBox(height: 10),
                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 20),
                        ProfileImageView(viewModel: viewModel),
                        const SizedBox(height: 30),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 30.0),
                          child: TitleTextView(title: S.current.photos),
                        ),
                        if (viewModel.images.isNotEmpty)
                          Container(
                            height: 80,
                            margin: const EdgeInsets.only(top: 5),
                            child: ListView.builder(
                              scrollDirection: Axis.horizontal,
                              itemCount: viewModel.images.length,
                              padding:
                                  const EdgeInsets.only(left: 25, right: 25),
                              itemBuilder: (context, index) {
                                Photo file = viewModel.images[index];
                                return Container(
                                  margin:
                                      const EdgeInsets.symmetric(horizontal: 3),
                                  child: ClipRRect(
                                    borderRadius: SmoothBorderRadius(
                                        cornerRadius: 15, cornerSmoothing: 1),
                                    child: Stack(
                                      alignment: AlignmentDirectional.topEnd,
                                      children: [
                                        file.id != -1
                                            ? CustomImage(
                                                image:
                                                    file.file.path.addBaseURL())
                                            : Image.file(File(file.file.path),
                                                width: 80,
                                                height: 80,
                                                fit: BoxFit.cover),
                                        InkWell(
                                          onTap: () => viewModel.onDeleteImage(
                                              file, index),
                                          child: Container(
                                            width: 20,
                                            height: 20,
                                            decoration: const BoxDecoration(
                                              color: ColorRes.themeColor,
                                              shape: BoxShape.circle,
                                            ),
                                            margin: const EdgeInsets.all(4),
                                            child: const Icon(
                                                Icons.close_rounded,
                                                color: ColorRes.white,
                                                size: 18),
                                          ),
                                        )
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
                        Padding(
                          padding: const EdgeInsets.only(
                              left: 30.0, right: 30.0, top: 10, bottom: 20),
                          child: BorderTextCard(
                              text: S.of(context).addPhotos,
                              onTap: viewModel.addImages,
                              isSelected: false),
                        )
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 30.0),
                  child: SafeArea(
                    top: false,
                    child: CustomTextButton(
                      onTap: () => viewModel
                          .onContinueTap(CreateProfileContinueTap.addPhoto),
                    ),
                  ),
                )
              ],
            ),
          );
        });
  }
}

class ProfileImageView extends StatefulWidget {
  final CreateProfileScreenViewModel viewModel;

  const ProfileImageView({super.key, required this.viewModel});

  @override
  State<ProfileImageView> createState() => _ProfileImageViewState();
}

class _ProfileImageViewState extends State<ProfileImageView> {
  int selectedIndex = 0;
  PageController pageController = PageController();

  void onPageChanged(int value) {
    selectedIndex = value;
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: Get.width / 1.3,
        height: Get.width / 1.3,
        margin: const EdgeInsets.symmetric(horizontal: 30),
        decoration: ShapeDecoration(
          color: ColorRes.borderColor,
          shape: SmoothRectangleBorder(
            borderRadius:
                SmoothBorderRadius(cornerRadius: 20, cornerSmoothing: 1),
          ),
        ),
        alignment: Alignment.center,
        child: widget.viewModel.images.isEmpty
            ? Image.asset(AssetRes.icMedia1, height: 112, width: 112)
            : ClipSmoothRect(
                radius:
                    SmoothBorderRadius(cornerRadius: 20, cornerSmoothing: 1),
                child: Stack(
                  children: [
                    PageView.builder(
                      controller: pageController,
                      itemCount: widget.viewModel.images.length,
                      onPageChanged: onPageChanged,
                      itemBuilder: (context, index) {
                        Photo image = widget.viewModel.images[index];
                        return image.id != -1
                            ? CustomImage(image: image.file.path.addBaseURL())
                            : Image.file(File(image.file.path),
                                width: double.infinity,
                                height: double.infinity,
                                fit: BoxFit.cover);
                      },
                    ),
                    if (widget.viewModel.images.length > 1)
                      Align(
                        alignment: Alignment.topCenter,
                        child: Container(
                          width: Get.width / 3,
                          height: 20,
                          margin: const EdgeInsets.only(top: 10),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: List.generate(
                              widget.viewModel.images.length,
                              (index) {
                                bool isSelected = selectedIndex == index;
                                return Expanded(
                                    child: Container(
                                  height: 2,
                                  decoration: BoxDecoration(
                                      borderRadius:
                                          SmoothBorderRadius(cornerRadius: 30),
                                      color: ColorRes.white.withValues(
                                          alpha: isSelected ? 1 : .3)),
                                  constraints:
                                      const BoxConstraints(maxWidth: 1),
                                  margin:
                                      const EdgeInsets.symmetric(horizontal: 2),
                                ));
                              },
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
      ),
    );
  }
}
