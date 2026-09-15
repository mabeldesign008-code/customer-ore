import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:orange_ui/common/button/round_icon_button.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/chat_and_live_stream/chat.dart';
import 'package:orange_ui/service/session_manager.dart';

import 'package:orange_ui/utils/app_res.dart';

import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/const_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class ImageViewPage extends StatefulWidget {
  final ChatMessage? userData;
  final VoidCallback onBack;

  const ImageViewPage({super.key, this.userData, required this.onBack});

  @override
  State<ImageViewPage> createState() => _ImageViewPageState();
}

class _ImageViewPageState extends State<ImageViewPage> {
  TapDownDetails _doubleTapDetails = TapDownDetails();
  final _transformationController = TransformationController();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorRes.black,
      body: SafeArea(
        child: Stack(
          children: [
            GestureDetector(
              onDoubleTapDown: handleDoubleTapDown,
              onDoubleTap: handleDoubleTap,
              child: InteractiveViewer(
                transformationController: _transformationController,
                child: CachedNetworkImage(
                  imageUrl: '${ConstRes.aImageBaseUrl}${widget.userData?.image}',
                  height: Get.height,
                  width: double.infinity,
                ),
              ),
            ),
            topBarArea()
          ],
        ),
      ),
    );
  }

  void handleDoubleTapDown(TapDownDetails details) {
    _doubleTapDetails = details;
  }

  void handleDoubleTap() {
    if (_transformationController.value != Matrix4.identity()) {
      _transformationController.value = Matrix4.identity();
    } else {
      final position = _doubleTapDetails.localPosition;
      _transformationController.value = Matrix4.identity()
        ..translateByDouble(-position.dx * 2, -position.dy * 2, 0.0, 1.0)
        ..scaleByDouble(3.0, 3.0, 1, 1);
    }
  }

  Widget topBarArea() {
    return Container(
      color: ColorRes.black.withValues(alpha: 0.3),
      padding: const EdgeInsets.fromLTRB(21, 18, 23, 18),
      child: Row(
        children: [
          const RoundIconButton(),
          const SizedBox(width: 20),
          Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    widget.userData?.senderUser?.userid ==
                            SessionManager.instance.getUserID()
                        ? S.current.you
                        : '${widget.userData?.senderUser?.username} ',
                    style: const TextStyle(
                      color: ColorRes.white,
                      fontSize: 16,
                      fontFamily: FontRes.bold,
                    ),
                  ),
                ],
              ),
              Text(
                DateFormat('${AppRes.dMY}, ${AppRes.hhMmA}')
                    .format(DateTime.fromMillisecondsSinceEpoch(widget.userData!.time!.toInt())),
                style: const TextStyle(
                  color: ColorRes.white,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _transformationController.value = Matrix4.identity();
    _transformationController.dispose();
    super.dispose();
  }
}
