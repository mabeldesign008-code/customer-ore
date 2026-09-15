import 'package:flutter/material.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/utils/asset_res.dart';

class CustomMarker extends StatefulWidget {
  final String imageUrl;
  final String name;
  final GlobalKey globalKey;

  const CustomMarker({
    super.key,
    required this.imageUrl,
    required this.globalKey,
    required this.name,
  });

  @override
  State<CustomMarker> createState() => _CustomMarkerState();
}

class _CustomMarkerState extends State<CustomMarker> {
  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      key: widget.globalKey,
      child: SizedBox(
        width: 160,
        height: 160,
        child: Stack(
          alignment: Alignment.center,
          children: [
            const Image(
              image: AssetImage(AssetRes.icLocationPin),
            ),
            Align(
              alignment: const Alignment(0, -0.3),
              child: SizedBox(
                height: 80,
                width: 80,
                child: ClipOval(
                  child: FadeInImage.assetNetwork(
                    placeholder: AssetRes.themeLabel,
                    image: widget.imageUrl,
                    fit: BoxFit.cover,
                    placeholderErrorBuilder: (context, error, stackTrace) {
                      return CommonUI.profileImagePlaceHolder(name: widget.name, heightWidth: 75);
                    },
                    imageErrorBuilder: (context, error, stackTrace) {
                      return CommonUI.profileImagePlaceHolder(name: widget.name, heightWidth: 75);
                    },
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
