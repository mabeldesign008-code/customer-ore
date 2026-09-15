import 'dart:io';

import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/model/social/post/add_comment.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/const_res.dart';
import 'package:orange_ui/utils/urls.dart';
import 'package:stacked/stacked.dart';
import 'package:video_player/video_player.dart';

enum VideoType { post, file, other }

class VideoPlayerScreenViewModel extends BaseViewModel {
  String? videoPath;
  late VideoPlayerController videoPlayerController;
  bool isExceptionError = false;
  bool isUIVisible = false;
  VideoType videoType;
  Post? post;

  VideoPlayerScreenViewModel(this.videoPath, this.post, this.videoType);

  void init() {
    videoInit();
  }

  void videoInit() {
    try {
      videoPlayerController = videoType == VideoType.file
          ? VideoPlayerController.file(File(videoPath!))
          : VideoPlayerController.networkUrl(
              Uri.parse('${ConstRes.aImageBaseUrl}$videoPath'));

      videoPlayerController.initialize().then((_) {
        videoPlayerController.play().then((_) {
          isUIVisible = true;
          if (videoType == VideoType.post) {
            increasePostViewCount();
          }
          notifyListeners();
        }).catchError((e) {
          isExceptionError = true;
          notifyListeners();
        });
      }).catchError((e) {
        isExceptionError = true;
        notifyListeners();
      });
    } catch (e) {
      isExceptionError = true;
      notifyListeners();
    }
  }

  void onBackBtnTap() {
    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      // Status bar color
      statusBarColor: ColorRes.transparent,
      // Status bar brightness (optional)
      statusBarIconBrightness: Brightness.dark, // For Android (dark icons)
      statusBarBrightness: Brightness.light, // For iOS (dark icons)
    ));
    Get.back();
  }

  void onPlayPauseTap() {
    isUIVisible = !isUIVisible;
    if (videoPlayerController.value.isPlaying) {
      videoPlayerController.pause();
    } else {
      videoPlayerController.play();
    }
    notifyListeners();
  }

  @override
  void dispose() {
    videoPlayerController.dispose();
    super.dispose();
  }

  void increasePostViewCount() {
    ApiProvider().callPost(
        completion: (response) {},
        url: Urls.aIncreasePostViewCount,
        param: {Urls.aPostId: post?.id});
  }
}
