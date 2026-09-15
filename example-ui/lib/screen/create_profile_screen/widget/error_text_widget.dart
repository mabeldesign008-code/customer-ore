import 'package:flutter/material.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class ErrorTextWidget extends StatelessWidget {
  final String title;

  const ErrorTextWidget(this.title, {super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
        child: Text(
      title,
      style: const TextStyle(
          fontFamily: FontRes.medium, fontSize: 18, color: ColorRes.dimGrey3),
      textAlign: TextAlign.center,
    ));
  }
}
