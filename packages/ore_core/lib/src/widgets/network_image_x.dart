import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Safe network image widget with placeholder / error / shimmer.
class NetworkImageX extends StatelessWidget {
  const NetworkImageX({
    super.key,
    required this.url,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.borderRadius,
    this.placeholderIcon,
    this.semanticLabel,
    this.excludeFromSemantics = false,
  });

  final String? url;
  final double? width;
  final double? height;
  final BoxFit fit;
  final BorderRadius? borderRadius;
  final IconData? placeholderIcon;
  final String? semanticLabel;
  final bool excludeFromSemantics;

  @override
  Widget build(BuildContext context) {
    final placeholder = Container(
      width: width,
      height: height,
      color: AppColors.divider,
      child: Icon(placeholderIcon ?? Icons.image_outlined,
          color: AppColors.textMuted, size: 32),
    );

    final Widget imageWidget;
    if (url == null || url!.isEmpty || !url!.startsWith('http')) {
      imageWidget = ClipRRect(
        borderRadius: borderRadius ?? BorderRadius.zero,
        child: placeholder,
      );
    } else {
      imageWidget = ClipRRect(
        borderRadius: borderRadius ?? BorderRadius.zero,
        child: CachedNetworkImage(
          imageUrl: url!,
          width: width,
          height: height,
          fit: fit,
          placeholder: (_, __) => Container(
            width: width,
            height: height,
            color: AppColors.divider,
          ),
          errorWidget: (_, __, ___) => placeholder,
        ),
      );
    }

    if (excludeFromSemantics || semanticLabel == null) {
      return ExcludeSemantics(child: imageWidget);
    }

    return Semantics(
      label: semanticLabel,
      image: true,
      child: imageWidget,
    );
  }
}
