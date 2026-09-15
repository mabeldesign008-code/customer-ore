import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class VideoUploadDialog extends StatelessWidget {
  final VoidCallback selectAnother;
  final String? text1;
  final String? text2;
  final String? description;

  const VideoUploadDialog(
      {super.key,
      required this.selectAnother,
      this.text1,
      this.text2,
      this.description});

  @override
  Widget build(BuildContext context) {
    return BackdropFilter(
      filter: ImageFilter.blur(sigmaY: 2, sigmaX: 2),
      child: Dialog(
        insetPadding: const EdgeInsets.symmetric(horizontal: 65),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
        child: AspectRatio(
          aspectRatio: 0.9,
          child: Column(
            children: [
              const Spacer(flex: 2),
              RichText(
                text: TextSpan(
                  style: const TextStyle(fontFamily: FontRes.semiBold, fontSize: 18),
                  children: [
                    TextSpan(
                      text: text1 ?? S.of(context).tooLarge,
                      style: const TextStyle(color: ColorRes.darkGrey9),
                    ),
                    TextSpan(
                      text: ' ${text2 ?? S.of(context).video}',
                      style: const TextStyle(color: ColorRes.darkGrey),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              const Image(
                image: AssetImage(AssetRes.themeLabel),
                height: 30,
              ),
              const Spacer(),
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  description ?? S.of(context).thisVideoIsGreaterThan50MbnpleaseSelectAnother,
                  style: const TextStyle(fontFamily: FontRes.semiBold, color: ColorRes.darkGrey9),
                  textAlign: TextAlign.center,
                ),
              ),
              const Spacer(),
              InkWell(
                highlightColor: ColorRes.transparent,
                splashColor: ColorRes.transparent,
                onTap: selectAnother,
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 15),
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        ColorRes.lightOrange,
                        ColorRes.themeColor,
                      ],
                    ),
                    borderRadius: BorderRadius.circular(7),
                  ),
                  child: Text(
                    S.of(context).selectAnother,
                    style: const TextStyle(color: ColorRes.white, fontFamily: FontRes.semiBold),
                  ),
                ),
              ),
              InkWell(
                highlightColor: ColorRes.transparent,
                splashColor: ColorRes.transparent,
                onTap: () {
                  Get.back();
                },
                child: Container(
                  height: 40,
                  margin: const EdgeInsets.symmetric(horizontal: 15),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(7),
                  ),
                  child: Text(
                    S.current.cancel,
                    style: const TextStyle(color: ColorRes.darkGrey9, fontFamily: FontRes.semiBold),
                  ),
                ),
              ),
              const Spacer(
                flex: 2,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
