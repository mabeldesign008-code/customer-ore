import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/common_fun.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/create_story_screen/create_story_screen_view_model.dart';
import 'package:orange_ui/utils/app_res.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:retrytech_plugin/retrytech_plugin.dart';
import 'package:stacked/stacked.dart';

class CreateStoryScreen extends StatelessWidget {
  const CreateStoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<CreateStoryScreenViewModel>.reactive(
      onViewModelReady: (viewModel) => viewModel.init(),
      viewModelBuilder: () => CreateStoryScreenViewModel(),
      builder: (context, viewModel, child) {
        return Scaffold(
          backgroundColor: ColorRes.black,
          body: ClipRRect(
            child: Stack(
              children: [
                Align(
                  alignment: Alignment.center,
                  child: AspectRatio(
                    aspectRatio: 0.52,
                    child: ClipSmoothRect(
                      radius: SmoothBorderRadius(
                          cornerRadius: 20, cornerSmoothing: 1),
                      child: RetrytechPlugin.shared.cameraView,
                    ),
                  ),
                ),
                SafeArea(
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Container(
                            height: 40,
                            width: 40,
                            margin: const EdgeInsets.all(15),
                          ),
                          const Spacer(),
                          Obx(
                            () => viewModel.currentTime.value.isEmpty
                                ? const SizedBox()
                                : Container(
                                    height: 40,
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 20, vertical: 5),
                                    margin: const EdgeInsets.all(15),
                                    decoration: ShapeDecoration(
                                        shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(10)),
                                        color: ColorRes.themeColor),
                                    alignment: Alignment.center,
                                    child: Text(
                                      CommonFun.formatHHMMSS(int.parse(
                                          viewModel.currentTime.value)),
                                      style: const TextStyle(
                                          color: ColorRes.white,
                                          fontFamily: FontRes.medium,
                                          fontSize: 15),
                                    ),
                                  ),
                          ),
                          const Spacer(),
                          InkWell(
                            onTap: () {
                              Get.back();
                            },
                            child: Container(
                              height: 40,
                              width: 40,
                              margin: const EdgeInsets.all(15),
                              decoration: ShapeDecoration(
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(30)),
                                  color: ColorRes.white.withValues(alpha: 0.4)),
                              alignment: Alignment.center,
                              child: const Icon(Icons.close_rounded,
                                  color: ColorRes.white, size: 30),
                            ),
                          ),
                        ],
                      ),
                      const Spacer(),
                      Container(
                        margin: const EdgeInsets.only(bottom: 20),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            InkWell(
                              onTap: viewModel.onMediaTap,
                              child: Image.asset(AssetRes.icMedia,
                                  width: 30, height: 30),
                            ),
                            GestureDetector(
                              onTap: viewModel.captureImage,
                              onLongPressStart: viewModel.onCaptureVideoStart,
                              onLongPressEnd: viewModel.onCaptureVideoEnd,
                              child: Container(
                                height: 75,
                                width: 75,
                                decoration: ShapeDecoration(
                                    shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(50),
                                        side: const BorderSide(
                                            color: ColorRes.white, width: 4))),
                                alignment: Alignment.center,
                                child: Container(
                                  width: 62,
                                  height: 62,
                                  decoration: ShapeDecoration(
                                      shape: RoundedRectangleBorder(
                                          borderRadius:
                                              BorderRadius.circular(50)),
                                      color: Colors.red),
                                  alignment: Alignment.center,
                                ),
                              ),
                            ),
                            InkWell(
                              onTap: viewModel.onCameraFlip,
                              child: Image.asset(AssetRes.icCameraFlip,
                                  width: 30, height: 30),
                            ),
                          ],
                        ),
                      )
                    ],
                  ),
                ),
                if (viewModel.isPermissionNotGranted)
                  PermissionNotGrantedWidget(viewModel: viewModel)
              ],
            ),
          ),
        );
      },
    );
  }
}

class PermissionNotGrantedWidget extends StatelessWidget {
  final CreateStoryScreenViewModel viewModel;

  const PermissionNotGrantedWidget({super.key, required this.viewModel});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height,
      width: MediaQuery.of(context).size.width,
      color: ColorRes.black,
      child: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: Alignment.topRight,
              child: InkWell(
                onTap: () => Get.back(),
                child: Container(
                  height: 40,
                  width: 40,
                  margin: const EdgeInsets.all(15),
                  decoration: ShapeDecoration(
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(30)),
                      color: ColorRes.white.withValues(alpha: 0.4)),
                  alignment: Alignment.center,
                  child: const Icon(Icons.close_rounded,
                      color: ColorRes.white, size: 30),
                ),
              ),
            ),
            const Spacer(),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 30.0),
              child: RichText(
                text: TextSpan(
                  text: S.of(context).allow,
                  children: [
                    const TextSpan(
                        text: AppRes.appName,
                        style: TextStyle(
                            color: ColorRes.themeColor,
                            fontFamily: FontRes.bold,
                            fontSize: 17)),
                    TextSpan(
                        text:
                            ' ${S.of(context).toAccessYourCameraAndMicrophone}')
                  ],
                  style: const TextStyle(
                    fontFamily: FontRes.semiBold,
                    fontSize: 20,
                  ),
                ),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 20),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 30.0),
              child: Text(
                  S
                      .of(context)
                      .ifAppearsThatCameraPermissionHasNotBeenGrantedTo,
                  style: const TextStyle(
                      fontFamily: FontRes.regular, color: ColorRes.white),
                  textAlign: TextAlign.center),
            ),
            const SizedBox(
              height: 30,
            ),
            InkWell(
              onTap: () => openAppSettings(),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                decoration: BoxDecoration(
                  color: ColorRes.white,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  S.of(context).openSettings,
                  style: const TextStyle(
                    color: ColorRes.themeColor,
                    fontFamily: FontRes.semiBold,
                    fontSize: 15,
                  ),
                ),
              ),
            ),
            const Spacer(),
            Align(
              alignment: Alignment.centerLeft,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 30.0),
                child: InkWell(
                  onTap: viewModel.onMediaTap,
                  child: Image.asset(AssetRes.icMedia, width: 30, height: 30),
                ),
              ),
            ),
            const SizedBox(height: 15)
          ],
        ),
      ),
    );
  }
}
