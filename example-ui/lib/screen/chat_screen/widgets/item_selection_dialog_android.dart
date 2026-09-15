import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class ItemSelectionDialogAndroid extends StatelessWidget {
  final VoidCallback onImageBtnClick;
  final VoidCallback onVideoBtnClick;

  const ItemSelectionDialogAndroid(
      {super.key, required this.onImageBtnClick, required this.onVideoBtnClick});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      children: [
        BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 3, sigmaY: 3),
          child: Column(
            children: [
              InkWell(
                onTap: () {
                  Get.back();
                },
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  height: 37,
                  width: 37,
                  decoration: const BoxDecoration(color: ColorRes.white, shape: BoxShape.circle),
                  child: const Center(
                    child: Icon(Icons.close_rounded, size: 25),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                decoration: const BoxDecoration(
                  color: ColorRes.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(15)),
                ),
                child: Column(
                  children: [
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 20),
                      child: Text(S.current.whichItemWouldYouLikeEtc,
                          style: const TextStyle(
                              color: ColorRes.grey, fontSize: 16, fontFamily: FontRes.medium),
                          textAlign: TextAlign.center),
                    ),
                    const Divider(
                      height: 1,
                    ),
                    InkWell(
                      onTap: onImageBtnClick,
                      child: Container(
                          height: 48,
                          alignment: Alignment.center,
                          child: Text(S.current.photos,
                              style: const TextStyle(fontFamily: FontRes.medium, fontSize: 17))),
                    ),
                    const Divider(height: 1),
                    InkWell(
                      onTap: onVideoBtnClick,
                      child: Container(
                        height: 48,
                        alignment: Alignment.center,
                        child: Text(S.current.videos,
                            style: const TextStyle(fontFamily: FontRes.medium, fontSize: 17)),
                      ),
                    ),
                    const Divider(height: 1),
                    SafeArea(
                      top: false,
                      child: InkWell(
                        onTap: () {
                          Get.back();
                        },
                        child: Container(
                          height: 48,
                          alignment: Alignment.center,
                          child: Text(
                            S.current.cancel,
                            style: const TextStyle(
                                fontFamily: FontRes.medium,
                                fontSize: 17,
                                color: ColorRes.themeColor),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
