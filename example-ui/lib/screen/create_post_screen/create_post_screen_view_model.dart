import 'dart:io';

import 'package:detectable_text_field/detectable_text_field.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/widgets.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/common/common_fun.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/model/social/post/add_post.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/utils/app_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/urls.dart';
import 'package:stacked/stacked.dart';
import 'package:video_player/video_player.dart';

class CreatePostScreenViewModel extends BaseViewModel {
  DetectableTextEditingController detectableTextFieldController =
      DetectableTextEditingController(
          detectedStyle: const TextStyle(
              fontSize: 18,
              color: ColorRes.themeColor,
              fontFamily: FontRes.medium),
          regExp: detectionRegExp(atSign: false, url: false));
  int pageType = 0;
  final ImagePicker _picker = ImagePicker();

  PageController pageController = PageController();
  int imageIndex = 0;
  List<XFile> imagesFile = [];
  XFile? thumbnailFile;
  String? thumbnail;
  List<Interests> interests = [];
  List<int> selectedInterests = [];
  List<String> hashtagList = [];
  FocusNode detectableTextFieldFocusNode = FocusNode();
  int contentType = 2; // description content byDefault = 2
  late VideoPlayerController videoPlayerController;
  bool isPlaying = false;

  Appdata? appData;

  void init() {
    pageType = 0;
    _getPrefData();
  }

  void onNextClick(int type) {
    detectableTextFieldFocusNode.unfocus();
    if (type == 0) {
      pageType = 1;
    } else {
      addPostApiCalling();
    }
    notifyListeners();
  }

  void onInterestTap(int interest) {
    if (selectedInterests.contains(interest)) {
      selectedInterests.remove(interest);
    } else {
      selectedInterests.add(interest);
    }
    notifyListeners();
  }

  void onPhotoTap() {
    contentType = 0;
    detectableTextFieldFocusNode.unfocus();

    _picker
        .pickMultiImage(
      maxHeight: AppRes.maxHeight,
      maxWidth: AppRes.maxWidth,
      imageQuality: AppRes.quality,
    )
        .then((pickedFiles) {
      if (pickedFiles.isNotEmpty) {
        // Determine the limit for the number of images to be uploaded
        final int imageLimit =
            appData?.postUploadImageLimit ?? AppRes.defaultMaxImagesForPost;

        // Add images to the imagesFile list, respecting the limit
        for (int i = 0; i < pickedFiles.length && i < imageLimit; i++) {
          imagesFile.add(pickedFiles[i]);
          notifyListeners();
        }
      }
    });
  }

  void onVideoTap() {
    contentType = 1;
    detectableTextFieldFocusNode.unfocus();
    _picker.pickVideo(source: ImageSource.gallery).then((value) async {
      if (value != null) {
        imagesFile.add(value);
        videoPlayerController = VideoPlayerController.file(File(value.path))
          ..initialize().then((value) {
            notifyListeners();
          });
        thumbnail = (await CommonFun.getFileThumbnail(value.path)).path;
        notifyListeners();
      }
    });
  }

  void onVideoDelete() {
    imagesFile.removeAt(0);
    videoPlayerController.dispose();
    notifyListeners();
  }

  void _getPrefData() {
    SettingData? settingData = SessionManager.instance.getSettings();
    for (var element in (settingData?.interests ?? [])) {
      if (element.isDeleted == 0) {
        interests.add(element);
      }
    }
    appData = settingData?.appdata;
    notifyListeners();
  }

  void onImageDelete() {
    detectableTextFieldFocusNode.unfocus();

    if (imageIndex >= 0 && imageIndex < imagesFile.length) {
      if (imagesFile.length > 1) {
        imagesFile.removeAt(imageIndex);
      } else {
        imagesFile.removeAt(0);
      }
    }
    notifyListeners();
  }

  void onPageChanged(int value) {
    imageIndex = value;
    notifyListeners();
  }

  void onChangeDetectableTextField(String value) {
    hashtagList = TextPatternDetector.extractDetections(value, hashTagRegExp);
    notifyListeners();
  }

  void onBackTap() {
    if (pageType == 0) {
      Get.back();
    } else {
      pageType = 0;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    detectableTextFieldController.dispose();
    pageController.dispose();
    detectableTextFieldFocusNode.dispose();
    super.dispose();
  }

  void addPostApiCalling() {
    List<String> removeHasTag = [];
    for (var element in hashtagList) {
      removeHasTag.add(element.replaceAll('#', ''));
    }
    Map<String, List<XFile?>>? filesMap = {};

    if (imagesFile.isNotEmpty) {
      if (contentType == 1) {
        filesMap[Urls.aThumbnail] = [XFile(thumbnail!)];
      }
      filesMap[Urls.aContents] = imagesFile;
    }
    CommonUI.lottieLoader();
    ApiProvider().multiPartCallApi(
      url: Urls.aAddPost,
      completion: (response) {
        Get.back(); // close loader
        AddPost postData = AddPost.fromJson(response);
        if (postData.status == true) {
          Get.back(result: postData.data);
          CommonUI.snackBar(message: S.current.postCreatedSuccessfully);
        } else {
          CommonUI.snackBar(message: postData.message);
        }
      },
      param: {
        Urls.userId: SessionManager.instance.getUserID().toString(),
        if (detectableTextFieldController.text.trim().isNotEmpty)
          Urls.aDescription: detectableTextFieldController.text.trim(),
        if (removeHasTag.isNotEmpty) Urls.aHashtags: removeHasTag.join(','),
        if (selectedInterests.isNotEmpty)
          Urls.aInterestIds: selectedInterests.join(','),
        Urls.aContentType: imagesFile.isEmpty ? 2 : contentType
      },
      filesMap: filesMap,
    );
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
}
