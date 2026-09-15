import 'dart:developer';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/common/screenshot_manager.dart';
import 'package:orange_ui/screen/camera_preview_screen/camera_preview_screen.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/utils/urls.dart';
import 'package:stacked/stacked.dart';
import 'package:video_player/video_player.dart';

class CameraPreviewScreenViewModel extends BaseViewModel {
  late VideoPlayerController videoPlayerController;
  XFile xFile;
  CameraType value;
  bool isPlaying = false;
  GlobalKey screenShotKey = GlobalKey();

  RxBool isStoryUploading = false.obs;

  CameraPreviewScreenViewModel(this.xFile, this.value);

  init() {
    if (value == CameraType.video) {
      videoPlayerController = VideoPlayerController.file(File(xFile.path))
        ..initialize().then((value) {
          videoPlayerController.play();
          videoPlayerController.setLooping(true);
          notifyListeners();
        });
    }
  }

  void onCheckBtnClick() async {
    isStoryUploading.value = true;
    // For Images
    if (value == CameraType.image) {
      final screenshot =
          await ScreenshotManager.captureScreenshot(screenShotKey);
      if (screenshot == null) {
        isStoryUploading.value = false;
        return log('Screenshot capture error');
      }
      createStoryApiCall(duration: 0, xFile: screenshot);
    } else {
      createStoryApiCall(
          duration: videoPlayerController.value.duration.inSeconds,
          xFile: xFile);
    }
  }

  void createStoryApiCall({required XFile xFile, required int duration}) {
    ApiProvider().multiPartCallApi(
        url: Urls.aCreateStory,
        completion: (response) {
          isStoryUploading.value = false;
          Get.back();
          Get.back();
        },
        param: {
          Urls.userId: SessionManager.instance.getUserID().toString(),
          Urls.type: value,
          Urls.aDuration: duration
        },
        filesMap: {
          Urls.content: [xFile]
        });
  }

  void videoPlayPause() {
    if (videoPlayerController.value.isPlaying) {
      isPlaying = false;
      videoPlayerController.pause();
    } else {
      isPlaying = true;
      videoPlayerController.play();
    }
    notifyListeners();
  }

  void onChangeSlider(double value) {
    videoPlayerController.seekTo(
      Duration(microseconds: value.toInt()),
    );
  }

  void onChangeSliderEnd(double value) {
    if (isPlaying) {
      videoPlayerController.play();
    }
  }

  void onChangeSliderStart(double value) {
    if (isPlaying) {
      videoPlayerController.pause();
    }
  }

  @override
  void dispose() {
    if (value == CameraType.video) {
      videoPlayerController.dispose();
    }
    super.dispose();
  }
}
