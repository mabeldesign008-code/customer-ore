import 'dart:ui';

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/custom_image.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/user_report_screen/report_sheet_view_model.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/style_res.dart';

class ReportCard extends StatelessWidget {
  final String? profileImage;
  final String fullName;
  final int? age;
  final String address;
  final ReportSheetViewModel model;
  final int reportType;

  const ReportCard({super.key,
      required this.fullName,
      required this.profileImage,
      required this.address,
      required this.model,
      required this.age,
      required this.reportType});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(top: AppBar().preferredSize.height * 1.3),
      child: ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(30)),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaY: 40, sigmaX: 40),
          child: Container(
            width: Get.width,
            padding: const EdgeInsets.fromLTRB(21, 20, 21, 0),
            decoration: BoxDecoration(
              color: ColorRes.black.withValues(alpha: 0.33),
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(30)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Stack(
                  children: [
                    InkWell(
                      onTap: () {
                        Get.back();
                      },
                      child: Image.asset(AssetRes.backArrow,
                          height: 25, width: 25),
                    ),
                    Center(
                      child: Text(
                          reportType == 1
                              ? S.current.reportUser
                              : S.of(context).reportPost,
                          style: const TextStyle(
                              color: ColorRes.white,
                              fontFamily: FontRes.bold,
                              fontSize: 16)),
                    )
                  ],
                ),
                reportType != 1 ? const SizedBox() : const SizedBox(height: 20),
                Expanded(
                  child: SingleChildScrollView(
                    keyboardDismissBehavior:
                        ScrollViewKeyboardDismissBehavior.onDrag,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        reportType != 1
                            ? const SizedBox()
                            : Text(
                                S.current.youAreReporting,
                                style: const TextStyle(
                                    color: ColorRes.white,
                                    fontFamily: FontRes.semiBold),
                              ),
                        reportType != 1
                            ? const SizedBox()
                            : const SizedBox(height: 10),
                        reportType != 1
                            ? const SizedBox()
                            : Container(
                                height: 70,
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 10),
                                decoration: BoxDecoration(
                                    color:
                                        ColorRes.white.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(15)),
                                child: Row(
                                  children: [
                                    CustomImage(
                                        image: profileImage,
                                        radius: 30,
                                        height: 50,
                                        width: 50,
                                        fullname: fullName),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        mainAxisAlignment:
                                            MainAxisAlignment.center,
                                        children: [
                                          Row(
                                            children: [
                                              Flexible(
                                                child: Text(
                                                  fullName.capitalize ?? '',
                                                  style: const TextStyle(
                                                      color: ColorRes.white),
                                                  maxLines: 1,
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                ),
                                              ),
                                              Text(' ($age) ',
                                                  style: const TextStyle(
                                                      color: ColorRes.white)),
                                            ],
                                          ),
                                          Text(address,
                                              style: const TextStyle(
                                                  color: ColorRes.white))
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                        const SizedBox(height: 15),
                        Text(S.current.selectReason,
                            style: const TextStyle(
                                color: ColorRes.white,
                                fontFamily: FontRes.semiBold)),
                        const SizedBox(height: 10),
                        Container(
                          decoration: BoxDecoration(
                              color: ColorRes.white.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(10)),
                          child: DropdownButton<String>(
                            value: model.reason,
                            icon: const Icon(Icons.keyboard_arrow_down_outlined,
                                color: ColorRes.themeColor, size: 29),
                            isExpanded: true,
                            style: const TextStyle(
                                color: ColorRes.dimGrey7, fontSize: 14),
                            padding: const EdgeInsets.symmetric(horizontal: 10),
                            underline: const SizedBox(),
                            onChanged: model.onReasonChange,
                            dropdownColor: ColorRes.davyGrey,
                            borderRadius: BorderRadius.circular(15),
                            items: model.reasonList
                                .map<DropdownMenuItem<String>>((String value) {
                              return DropdownMenuItem<String>(
                                value: value,
                                child: Text(value,
                                    style: const TextStyle(
                                        color: ColorRes.white, fontSize: 14)),
                              );
                            }).toList(),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          S.current.explainMore,
                          style: const TextStyle(
                              color: ColorRes.white,
                              fontFamily: FontRes.semiBold),
                        ),
                        const SizedBox(height: 7),
                        Container(
                          height: 100,
                          decoration: BoxDecoration(
                              color: ColorRes.white.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                  color: model.explainMoreError.isEmpty
                                      ? ColorRes.transparent
                                      : ColorRes.themeColor)),
                          child: TextField(
                            controller: model.explainController,
                            focusNode: model.explainMoreFocus,
                            maxLines: null,
                            minLines: null,
                            expands: true,
                            style: const TextStyle(
                                color: ColorRes.white, fontSize: 15),
                            textCapitalization: TextCapitalization.sentences,
                            decoration: InputDecoration(
                              hintText: model.explainMoreError == ''
                                  ? S.current.explainMore
                                  : model.explainMoreError,
                              hintStyle: TextStyle(
                                color: model.explainMoreError == ""
                                    ? ColorRes.dimGrey2
                                    : ColorRes.themeColor,
                              ),
                              border: InputBorder.none,
                              contentPadding: const EdgeInsets.only(
                                  bottom: 10, left: 10, top: 9),
                              counterText: "",
                            ),
                          ),
                        ),
                        Row(
                          children: [
                            Checkbox(
                              value: model.isCheckBox,
                              onChanged: model.onCheckBoxChange,
                              activeColor: ColorRes.themeColor,
                              side: WidgetStateBorderSide.resolveWith(
                                (states) => const BorderSide(
                                    width: 1.5, color: ColorRes.themeColor),
                              ),
                            ),
                            Expanded(
                              child: RichText(
                                textAlign: TextAlign.start,
                                text: TextSpan(
                                  children: [
                                    TextSpan(
                                      text: S.current.iAgreeTo,
                                      style: const TextStyle(
                                        color: ColorRes.dimGrey2,
                                        fontSize: 11,
                                        fontFamily: FontRes.regular,
                                      ),
                                    ),
                                    TextSpan(
                                      text: S.current.termAndCondition,
                                      recognizer: TapGestureRecognizer()
                                        ..onTap = model.onTermAndConditionClick,
                                      style: const TextStyle(
                                        color: ColorRes.white,
                                        fontSize: 11,
                                        fontFamily: FontRes.semiBold,
                                      ),
                                    ),
                                    TextSpan(
                                      text: S.current.continuePlease,
                                      style: const TextStyle(
                                          color: ColorRes.dimGrey2,
                                          fontSize: 11,
                                          fontFamily: FontRes.regular),
                                    ),
                                  ],
                                ),
                              ),
                            )
                          ],
                        ),
                        InkWell(
                          onTap: model.onSubmitBtnTap,
                          child: Container(
                            width: double.infinity,
                            height: 50,
                            margin: const EdgeInsets.all(5),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(8),
                              gradient: StyleRes.linearGradient,
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              S.current.submit,
                              style: const TextStyle(
                                  color: ColorRes.white,
                                  fontFamily: FontRes.bold,
                                  fontSize: 16,
                                  letterSpacing: 1),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
