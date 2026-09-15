import 'package:flutter/material.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class FullnameWithAge extends StatelessWidget {
  final UserData? userData;
  final double? fontSize;
  final Color? fontColor;
  final String? fontFamily;
  final double? iconSize;
  final MainAxisAlignment? mainAxisAlignment;

  const FullnameWithAge(
      {super.key,
      this.userData,
      this.fontSize,
      this.fontColor,
      this.fontFamily,
      this.iconSize,
      this.mainAxisAlignment});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      mainAxisAlignment: mainAxisAlignment ?? MainAxisAlignment.start,
      children: [
        Flexible(
          child: Text(
            userData?.fullname ?? '',
            style: TextStyle(
              color: fontColor ?? ColorRes.white,
              fontSize: fontSize ?? 20,
              fontFamily: fontFamily ?? FontRes.bold,
            ),
            overflow: TextOverflow.ellipsis,
            maxLines: 1,
          ),
        ),
        if ((userData?.age ?? 0) > 0)
          Text(
            " ${userData?.age ?? ''}",
            style: TextStyle(
              color: fontColor ?? ColorRes.white,
              fontSize: fontSize ?? 20,
              fontFamily: FontRes.regular,
            ),
          ),
        const SizedBox(width: 4),
        if (userData?.isVerify == true)
          Image.asset(
            AssetRes.tickMark,
            height: iconSize ?? 18,
            width: iconSize ?? 18,
          )
      ],
    );
  }
}
