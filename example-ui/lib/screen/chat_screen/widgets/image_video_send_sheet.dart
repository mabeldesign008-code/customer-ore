import 'dart:io';

import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/button/border_icon_button.dart';
import 'package:orange_ui/common/button/custom_text_button.dart';
import 'package:orange_ui/common/confirmation_dialog.dart';
import 'package:orange_ui/common/custom_border.dart';
import 'package:orange_ui/common/custom_text_field.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class ImageVideoSendSheet extends StatelessWidget {
  final File image;
  final String selectedItem;
  final Function(String msg, File? image) onSendBtnClick;

  const ImageVideoSendSheet({super.key,
    required this.image,
    required this.onSendBtnClick,
    required this.selectedItem});

  @override
  Widget build(BuildContext context) {
    TextEditingController msgController = TextEditingController();
    return Wrap(
      children: [
        Container(
          margin: const EdgeInsets.only(top: 70),
          decoration: const ShapeDecoration(
            color: Colors.white,
            shape: SmoothRectangleBorder(
                borderRadius: SmoothBorderRadius.vertical(
                    top: SmoothRadius(cornerRadius: 30, cornerSmoothing: 1))),
          ),
          child: Column(
            spacing: 10,
            children: [
              Container(
                margin: const EdgeInsets.only(top: 20),
                padding: const EdgeInsets.symmetric(horizontal: 10),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  spacing: 10,
                  children: [
                    const SizedBox(width: 37),
                    Flexible(
                      child: Text(
                        S.current.send,
                        style: const TextStyle(
                            color: ColorRes.black,
                            fontSize: 20,
                            fontFamily: FontRes.bold),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    BorderIconButton(
                        onTap: () {
                          Get.dialog(ConfirmationDialog(
                            onTap: () {
                              Get.back();
                              Get.back();
                            },
                            description: S.of(context).ifYouCloseTheSheetYourMessageCoinWillBe,
                          ));
                        },
                        icon: AssetRes.icClose),
                  ],
                ),
              ),
              const CustomBorder(),
              const SizedBox(height: 10),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(width: 5),
                  Expanded(
                    child: ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child:
                            Image.file(image, height: 170, fit: BoxFit.cover)),
                  ),
                  const SizedBox(width: 5),
                  Expanded(
                      flex: 2,
                      child: CustomTextField(
                        height: 170,
                        controller: msgController,
                        isExpand: true,
                        hintText: S.current.writeSomethingHere,
                      )),
                  const SizedBox(width: 5),
                ],
              ),
              SizedBox(height: AppBar().preferredSize.height * 2),
              CustomTextButton(
                onTap: () => onSendBtnClick(msgController.text, image),
                title: S.current.send,
                margin: const EdgeInsets.symmetric(horizontal: 20),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
