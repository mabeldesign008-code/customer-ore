import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:lottie/lottie.dart';
import 'package:orange_ui/common/top_bar_area.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/edit_profile_screen/edit_profile_screen_view_model.dart';
import 'package:orange_ui/screen/edit_profile_screen/widgets/image_list_area.dart';
import 'package:orange_ui/screen/edit_profile_screen/widgets/text_fields_area.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:stacked/stacked.dart';

class EditProfileScreen extends StatelessWidget {
  final UserData? userData;

  const EditProfileScreen({super.key, required this.userData});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<EditProfileScreenViewModel>.reactive(
      onViewModelReady: (model) {
        model.init();
      },
      viewModelBuilder: () => EditProfileScreenViewModel(userData),
      builder: (context, model, child) {
        return Scaffold(
          backgroundColor: ColorRes.white,
          body: GestureDetector(
            onTap: model.onAllScreenTap,
            child: SizedBox(
              height: Get.height,
              width: Get.width,
              child: Stack(
                children: [
                  Column(
                    children: [
                      TopBarArea(
                          title: S.current.edit, title2: S.current.profileCap),
                      Expanded(
                        child: model.isLoading
                            ? Lottie.asset(AssetRes.loadingLottie,
                                height: 70, width: 70)
                            : SingleChildScrollView(
                                keyboardDismissBehavior:
                                    ScrollViewKeyboardDismissBehavior.onDrag,
                                child: Column(
                                  children: [
                                    const SizedBox(height: 16),
                                    ImageListArea(model: model),
                                    TextFieldsArea(model: model),
                                  ],
                                ),
                              ),
                      ),
                      InkWell(
                        borderRadius: BorderRadius.circular(10),
                        onTap: model.onSaveTap,
                        child: Container(
                          height: 50,
                          decoration: BoxDecoration(
                            color: ColorRes.lightOrange.withValues(alpha: 0.3),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          margin: const EdgeInsets.symmetric(horizontal: 15),
                          child: Center(
                            child: Text(
                              S.current.save,
                              style: const TextStyle(
                                  fontFamily: FontRes.bold,
                                  color: ColorRes.themeColor,
                                  letterSpacing: 0.8),
                            ),
                          ),
                        ),
                      ),
                      SizedBox(height: AppBar().preferredSize.height / 2),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
