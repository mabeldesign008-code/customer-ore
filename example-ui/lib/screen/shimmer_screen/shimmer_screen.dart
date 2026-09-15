// ignore_for_file: use_key_in_widget_constructors

import 'package:flutter/material.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:shimmer/shimmer.dart';

class ShimmerScreen extends StatelessWidget {
  final double width;
  final double height;
  final ShapeBorder shapeBorder;

  const ShimmerScreen.rectangular(
      {this.width = double.infinity,
      required this.height,
      required this.shapeBorder});

  const ShimmerScreen.circular(
      {this.width = double.infinity,
      required this.height,
      this.shapeBorder = const CircleBorder()});

  @override
  Widget build(BuildContext context) {
    return Shimmer(
      gradient: const LinearGradient(
        colors: [
          ColorRes.greyShade300,
          ColorRes.borderColor,
          ColorRes.greyShade300,
        ],
        stops: [
          0.1,
          0.2,
          0.3,
        ],
        begin: Alignment(-1.0, -0.3),
        end: Alignment(1.0, 0.3),
        tileMode: TileMode.mirror,
      ),
      direction: ShimmerDirection.ltr,
      child: Container(
        width: width,
        height: height,
        decoration: ShapeDecoration(
          color: ColorRes.greyShade300,
          shape: shapeBorder,
        ),
      ),
    );
  }
}

class CustomShimmer extends StatelessWidget {
  final double? width;
  final double? height;

  const CustomShimmer({super.key, this.width, this.height});

  @override
  Widget build(BuildContext context) {
    return Shimmer(
      gradient: const LinearGradient(
        colors: [
          ColorRes.greyShade300,
          ColorRes.borderColor,
          ColorRes.greyShade300,
        ],
        stops: [
          0.1,
          0.2,
          0.3,
        ],
        begin: Alignment(-1.0, -0.3),
        end: Alignment(1.0, 0.3),
        tileMode: TileMode.mirror,
      ),
      direction: ShimmerDirection.ltr,
      child: Container(
        width: width,
        height: height,
        decoration: const BoxDecoration(
          color: ColorRes.greyShade300,
        ),
      ),
    );
  }
}
