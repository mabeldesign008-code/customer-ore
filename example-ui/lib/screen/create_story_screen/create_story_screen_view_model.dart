import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/common/video_upload_dialog.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/camera_preview_screen/camera_preview_screen.dart';
import 'package:orange_ui/screen/create_story_screen/widget/media_sheet.dart';
import 'package:orange_ui/service/extention/string_extention.dart';
import 'package:orange_ui/utils/app_res.dart';
import 'package:retrytech_plugin/retrytech_plugin.dart';
import 'package:stacked/stacked.dart';
import 'package:video_player/video_player.dart';

class CreateStoryScreenViewModel extends BaseViewModel {
  bool isLoading = true;
  Timer? timer;
  var currentTime = ''.obs;
  ImagePicker imagePicker = ImagePicker();
  bool isFirstTimeLoadCamera = true;
  bool isPermissionNotGranted = false;

  CreateStoryScreenViewModel();

  void init() {
    Future.delayed(const Duration(milliseconds: 100), () {
      RetrytechPlugin.shared.initCamera();
    });
  }

  void captureImage() {
    RetrytechPlugin.shared.captureImage().then((value) async {
      imageCache.clear();
      imageCache.clearLiveImages();
      if (value == null) return;
      final bgColor = await value.getGradientFromImage;
      Get.to(() => CameraPreviewScreen(
          xFile: XFile(value), value: CameraType.image, bgColor: bgColor));
    });
  }

  void onCameraFlip() {
    RetrytechPlugin.shared.toggleCamera;
  }

  void onCaptureVideoStart(LongPressStartDetails details) async {
    HapticFeedback.mediumImpact();
    RetrytechPlugin.shared.startRecording;
    setCurrentTimerClock();
  }

  void onCaptureVideoEnd(LongPressEndDetails details) {
    timer?.cancel();
    RetrytechPlugin.shared.stopRecording.then((value) {
      if (value == null) return;
      Get.to(() => CameraPreviewScreen(
            xFile: XFile(value),
            value: CameraType.video,
          ))?.then((value) {
        currentTime = ''.obs;
        notifyListeners();
      });
    });
  }

  void setCurrentTimerClock() {
    timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      currentTime.value = timer.tick.toString();
      if (timer.tick >= AppRes.storyVideoDuration) {
        onCaptureVideoEnd(const LongPressEndDetails());
      }
    });
  }

  void onMediaTap() {
    Get.bottomSheet(
      MediaSheet(
        onTap: (type) {
          if (type == 1) {
            selectImageFromMedia();
          } else {
            selectVideoFromMedia();
          }
        },
      ),
    );
  }

  void selectImageFromMedia() async {
    try {
      final ImagePicker imagePicker = ImagePicker();
      final XFile? image = await imagePicker.pickImage(
        source: ImageSource.gallery,
        maxHeight: AppRes.maxHeight,
        imageQuality: AppRes.quality,
        maxWidth: AppRes.maxWidth,
      );

      if (image != null) {
        Get.back();
        final bgColor = await image.path.getGradientFromImage;
        // var decodedImage = await decodeImageFromList(File(image.path).readAsBytesSync());
        // print(decodedImage.width);
        // print(decodedImage.height);
        Get.to(() => CameraPreviewScreen(
            xFile: image, value: CameraType.image, bgColor: bgColor));
      }
    } on PlatformException catch (e) {
      CommonUI.snackBar(message: e.message ?? '');
    }
  }

  void selectVideoFromMedia() async {
    try {
      final ImagePicker imagePicker = ImagePicker();
      final XFile? video = await imagePicker.pickVideo(
        source: ImageSource.gallery,
        maxDuration: const Duration(seconds: 30),
      );

      if (video != null) {
        VideoPlayerController videoPlayerController =
            VideoPlayerController.file(File(video.path));

        if (videoPlayerController.value.duration.inSeconds >=
            AppRes.storyVideoDuration) {
          Get.dialog(VideoUploadDialog(
            selectAnother: () {
              Get.back();
              selectVideoFromMedia();
            },
            description:
                AppRes.videoDurationDescription(AppRes.storyVideoDuration),
            text1: S.current.videoDurationIs,
            text2: S.current.large,
          ));
        } else {
          Get.back();
          Get.to(
              () => CameraPreviewScreen(xFile: video, value: CameraType.video));
        }
      }
    } on PlatformException catch (e) {
      CommonUI.snackBar(message: e.message ?? '');
      // Optionally, you can show a user-friendly error message here
    }
  }

  @override
  void dispose() {
    timer?.cancel();
    RetrytechPlugin.shared.disposeCamera;
    super.dispose();
  }
}
