import 'package:flutter/material.dart';
import 'package:orange_ui/utils/color_res.dart';

class StyleRes {
  static const Gradient linearGradient = LinearGradient(
      colors: [ColorRes.lightOrange, ColorRes.themeColor],
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter);

  static const Gradient linearDimGrey = LinearGradient(
      colors: [ColorRes.dimGrey7, ColorRes.dimGrey7],
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter);
}
