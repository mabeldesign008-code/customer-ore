import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/style_res.dart';

class MediaSheet extends StatelessWidget {
  final Function(int type) onTap;

  const MediaSheet({super.key, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(15),
          decoration: const ShapeDecoration(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              color: ColorRes.white),
          child: Column(
            children: [
              Stack(
                alignment: Alignment.center,
                children: [
                  Text(
                    S.of(context).whatDoYouWantToSelect,
                    style: const TextStyle(color: ColorRes.black, fontFamily: FontRes.semiBold, fontSize: 20),
                  ),
                  Align(
                    alignment: Alignment.centerRight,
                    child: IconButton(
                      onPressed: () {
                        Get.back();
                      },
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ),
                ],
              ),
              SizedBox(height: AppBar().preferredSize.height / 2),
              Row(
                children: [
                  MediaButton(
                    image: AssetRes.icPhoto,
                    title: S.current.image,
                    onTap: () => onTap(1),
                  ),
                  const SizedBox(width: 10),
                  MediaButton(
                    title: S.current.videoCap,
                    image: AssetRes.icVideo,
                    onTap: () => onTap(2),
                  )
                ],
              ),
              SizedBox(height: AppBar().preferredSize.height),
            ],
          ),
        )
      ],
    );
  }
}

class MediaButton extends StatelessWidget {
  final String image;
  final String title;
  final VoidCallback onTap;

  const MediaButton(
      {super.key,
      required this.image,
      required this.title,
      required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        child: Container(
          height: 50,
          decoration: ShapeDecoration(
            gradient: StyleRes.linearGradient,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
          alignment: Alignment.center,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Image.asset(
                image,
                color: ColorRes.white,
                height: 25,
                width: 25,
              ),
              const SizedBox(width: 10),
              Text(
                title,
                style: const TextStyle(color: ColorRes.white, fontFamily: FontRes.medium, fontSize: 15),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
