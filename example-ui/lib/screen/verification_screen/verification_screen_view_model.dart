import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:stacked/stacked.dart';

class VerificationScreenViewModel extends BaseViewModel {
  void init() {
    userData = Get.arguments;
  }

  TextEditingController fullNameController = TextEditingController();
  UserData? userData;
  bool isDocumentType = false;
  bool isSelfie = false;
  bool showDropdown = false;
  String docType = S.current.drivingLicence;
  File? selfieImage;
  File? docFile;
  String? documentName;
  String? userIdentity;
  final ImagePicker picker = ImagePicker();

  void onDocTypeTap() {
    showDropdown = !showDropdown;
    notifyListeners();
  }

  void onDocChange(String? value) {
    docType = value ?? '';
    showDropdown = false;
    notifyListeners();
  }

  void onTakePhotoTap() async {
    final XFile? photo = await picker
        .pickImage(
            source: ImageSource.camera,
            preferredCameraDevice: CameraDevice.front)
        .onError((PlatformException error, stackTrace) {
      CommonUI.snackBarWidget(error.message ?? '');
      return null;
    });
    if (photo == null || photo.path.isEmpty) return;
    selfieImage = File(photo.path);
    notifyListeners();
  }

  void onDocumentTap() async {
    XFile? photo;

    photo = await picker
        .pickImage(source: ImageSource.gallery)
        .onError((PlatformException error, stackTrace) {
      CommonUI.snackBarWidget(error.message ?? '');
      return null;
    });

    if (photo == null || photo.path.isEmpty) return;
    docFile = File(photo.path);
    documentName = photo.name;
    notifyListeners();
  }

  void onSubmitBtnClick() {
    if (fullNameController.text.trim().isEmpty) {
      return CommonUI.snackBar(message: S.current.pleaseEnterYourName);
    }

    if (docFile == null) {
      return CommonUI.snackBarWidget(S.current.pleaseSelectDocumentFile);
    }

    if (selfieImage == null) {
      return CommonUI.snackBarWidget(S.current.pleaseAddSelfiePhoto);
    }
    CommonUI.lottieLoader();
    ApiProvider()
        .applyForVerification(
            selfieImage, docFile, fullNameController.text, docType)
        .then((value) {
      Get.back();
      Get.back(result: 1);
      CommonUI.snackBarWidget(value.message ?? '');
    });
  }
}
