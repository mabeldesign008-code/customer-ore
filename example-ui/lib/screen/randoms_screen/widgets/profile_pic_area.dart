import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/animation/ripple_animation.dart';
import 'package:orange_ui/common/custom_image.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/shimmer_screen/shimmer_screen.dart';
import 'package:orange_ui/utils/asset_res.dart';

class ProfilePicArea extends StatefulWidget {
  final UserData? data;
  final bool isLoading;

  const ProfilePicArea(
      {super.key, required this.data, required this.isLoading});

  @override
  State<ProfilePicArea> createState() => _ProfilePicAreaState();
}

class _ProfilePicAreaState extends State<ProfilePicArea> {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: Get.width,
      height: Get.height / 2,
      decoration: const BoxDecoration(
        image: DecorationImage(
            fit: BoxFit.cover, image: AssetImage(AssetRes.worldMap)),
      ),
      child: RipplesAnimation(
        child: widget.isLoading
            ? ShimmerScreen.circular(
                height: Get.width / 2.5,
                width: Get.width / 2.5,
                shapeBorder: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(360),
                ),
              )
            : CustomImage(
                image: widget.data?.profileImage,
                fullname: widget.data?.fullname,
                height: Get.width / 2.5,
                width: Get.width / 2.5,
                radius: 360,
              ),
      ),
    );
  }
}
