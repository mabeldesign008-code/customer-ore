import 'package:cached_network_image/cached_network_image.dart';
import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/screen/shimmer_screen/shimmer_screen.dart';

class CustomImage extends StatelessWidget {
  final String? image;
  final double? height;
  final double? width;
  final BoxFit? fit;
  final String? fullname;
  final double? radius;
  final bool showShimmer;

  const CustomImage(
      {super.key,
      required this.image,
      this.height,
      this.width,
      this.fit,
      this.fullname,
      this.radius,
      this.showShimmer = true});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) => ClipSmoothRect(
        radius:
            SmoothBorderRadius(cornerRadius: radius ?? 0, cornerSmoothing: 1),
        child: CachedNetworkImage(
          imageUrl: image ?? '',
          height: height,
          width: width,
          fit: fit ?? BoxFit.cover,
          fadeInDuration: const Duration(milliseconds: 100),
          fadeOutDuration: const Duration(milliseconds: 100),
          placeholder: (context, url) {
            if (!showShimmer) {
              return const SizedBox();
            }
            return CustomShimmer(width: width, height: height);
          },
          errorWidget: (context, url, error) {
            return CommonUI.profileImagePlaceHolder(
                name: CommonUI.fullName(fullname),
                heightWidth: height ?? constraints.maxHeight,
                borderRadius: radius);
          },
        ),
      ),
    );
  }
}
