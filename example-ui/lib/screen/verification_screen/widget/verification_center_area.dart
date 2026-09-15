import 'dart:io';

import 'package:dotted_border/dotted_border.dart';
import 'package:flutter/material.dart';
import 'package:orange_ui/common/custom_drop_down.dart';
import 'package:orange_ui/common/custom_text_field.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/verification_screen/verification_screen_view_model.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class VerificationCenterArea extends StatelessWidget {
  final bool showDropdown;
  final String docType;
  final VoidCallback onDocTypeTap;
  final VoidCallback onTakePhotoTap;
  final VoidCallback onDocumentTap;
  final File? selfieImage;
  final UserData? userIdentity;
  final String? imagesName;
  final VoidCallback onSubmitBtnClick;
  final bool isDocFile;
  final bool isSelfie;
  final VerificationScreenViewModel model;

  const VerificationCenterArea({super.key,
      required this.userIdentity,
      required this.docType,
      required this.showDropdown,
      required this.onDocTypeTap,
      required this.onTakePhotoTap,
      required this.onDocumentTap,
      required this.selfieImage,
      required this.imagesName,
      required this.onSubmitBtnClick,
      required this.isSelfie,
      required this.isDocFile,
      required this.model});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: SingleChildScrollView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 15),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                spacing: 5,
                children: [
                  Text(
                    '${userIdentity?.fullname} ',
                    style:
                        const TextStyle(fontFamily: FontRes.bold, fontSize: 15),
                  ),
                  Image.asset(AssetRes.tickMark, height: 17, width: 17),
                ],
              ),
              const SizedBox(height: 15),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20.0),
                child: Text(
                  S.current.verifiedAccountsHaveBlueEtc,
                  style: const TextStyle(fontFamily: FontRes.regular),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 20),
              Padding(
                padding: const EdgeInsets.all(5.0),
                child: Text(
                  S.current.fullNameCap,
                  style: const TextStyle(
                      color: ColorRes.davyGrey,
                      fontSize: 15,
                      fontFamily: FontRes.extraBold),
                ),
              ),
              CustomTextField(controller: model.fullNameController),
              const SizedBox(height: 10),
              Padding(
                padding: const EdgeInsets.all(5.0),
                child: Text(
                  S.current.docType,
                  style: const TextStyle(
                      color: ColorRes.davyGrey,
                      fontSize: 15,
                      fontFamily: FontRes.extraBold),
                ),
              ),
              CustomDropDownBtn<String>(
                  items: [S.current.drivingLicence, S.current.idCard],
                  selectedValue: docType,
                  onChanged: model.onDocChange,
                  getTitle: (p0) => p0,
                  style: const TextStyle(
                    color: ColorRes.dimGrey3,
                    fontSize: 14,
                  ),
                  isExpanded: true,
                  bgColor: ColorRes.lightGrey2,
                  height: 50,
                  radius: 10),
              const SizedBox(height: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Visibility(
                    visible: imagesName == null || imagesName!.isEmpty
                        ? true
                        : false,
                    child: InkWell(
                      onTap: onDocumentTap,
                      child: Container(
                        height: 50,
                        padding: const EdgeInsets.only(left: 10, right: 10),
                        decoration: BoxDecoration(
                            color: ColorRes.lightGrey2,
                            borderRadius: BorderRadius.circular(10)),
                        child: Center(
                            child: Text(
                          S.current.selectDocument,
                          style: const TextStyle(
                              color: ColorRes.dimGrey3, fontSize: 14),
                        )),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Visibility(
                    visible: imagesName == null || imagesName!.isEmpty
                        ? false
                        : true,
                    child: InkWell(
                      onTap: onDocumentTap,
                      child: Container(
                        height: 45,
                        padding: const EdgeInsets.only(left: 10, right: 10),
                        decoration: BoxDecoration(
                          color: ColorRes.lightGrey2,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 20.0),
                                child: Text(
                                  '$imagesName',
                                  style: const TextStyle(
                                      color: ColorRes.dimGrey3, fontSize: 14),
                                  textAlign: TextAlign.center,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ),
                            Container(
                              height: 30,
                              width: 30,
                              decoration: BoxDecoration(
                                  color: ColorRes.lightGrey,
                                  borderRadius: BorderRadius.circular(30)),
                              child: const Icon(Icons.edit,
                                  size: 20, color: ColorRes.dimGrey3),
                            )
                          ],
                        ),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(5.0),
                    child: Text(
                      S.current.yourSelfie,
                      style: const TextStyle(
                        color: ColorRes.davyGrey,
                        fontSize: 15,
                        fontFamily: FontRes.extraBold,
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Center(
                      child: InkWell(
                    onTap: onTakePhotoTap,
                    child: SizedBox(
                      height: 100,
                      width: 100,
                      child: DottedBorder(
                        options: const RoundedRectDottedBorderOptions(
                            color: ColorRes.davyGrey,
                            dashPattern: [1, 4],
                            radius: Radius.circular(5),
                            strokeWidth: 2),
                        child: Center(
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              selfieImage == null
                                  ? const SizedBox()
                                  : Image.file(selfieImage!,
                                      fit: BoxFit.cover,
                                      height: 100,
                                      width: 100, errorBuilder:
                                          (context, error, stackTrace) {
                                      return Image.asset(AssetRes.imageWarning,
                                          width: 150,
                                          height: 150,
                                          fit: BoxFit.cover);
                                    }),
                              const Icon(Icons.edit, color: ColorRes.themeColor)
                            ],
                          ),
                        ),
                      ),
                    ),
                  ))
                ],
              ),
              const SizedBox(
                height: 15,
              ),
              InkWell(
                onTap: onSubmitBtnClick,
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  height: 50,
                  margin: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: ColorRes.lightOrange.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Center(
                    child: Text(
                      S.current.submit,
                      style: const TextStyle(
                        fontFamily: FontRes.bold,
                        color: ColorRes.themeColor,
                        letterSpacing: 0.8,
                      ),
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
