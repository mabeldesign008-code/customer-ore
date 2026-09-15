import 'package:figma_squircle/figma_squircle.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/button/custom_text_button.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:webview_flutter_plus/webview_flutter_plus.dart';

class EulaSheet extends StatelessWidget {
  const EulaSheet({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.only(top: AppBar().preferredSize.height * 2),
      decoration: const ShapeDecoration(
          color: ColorRes.white,
          shape: SmoothRectangleBorder(
              borderRadius: SmoothBorderRadius.vertical(
                  top: SmoothRadius(cornerRadius: 30, cornerSmoothing: 1)))),
      child: Column(
        children: [
          const Expanded(
              child: ClipRRect(
                  borderRadius: SmoothBorderRadius.vertical(
                      top: SmoothRadius(cornerRadius: 30, cornerSmoothing: 1)),
                  child: EulaPolicyForApple())),
          SafeArea(
            top: false,
            child: CustomTextButton(
              onTap: () {
                SessionManager.instance
                    .setBool(key: SessionKeys.eULA, value: true);
                Get.back();
              },
              title: S.of(context).accept,
              textColor: ColorRes.white,
              bgColor: ColorRes.themeColor,
              margin: const EdgeInsets.symmetric(horizontal: 20),
            ),
          )
        ],
      ),
    );
  }
}

class EulaPolicyForApple extends StatefulWidget {
  const EulaPolicyForApple({super.key});

  @override
  State<EulaPolicyForApple> createState() => _EulaPolicyForAppleState();
}

class _EulaPolicyForAppleState extends State<EulaPolicyForApple> {
  late WebViewControllerPlus _controller;

  @override
  void initState() {
    _controller = WebViewControllerPlus()
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (url) async {},
        ),
      )
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..loadRequest(Uri.parse(
          'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'));
    super.initState();
  }

  final Set<Factory<OneSequenceGestureRecognizer>> gestureRecognizers = {
    Factory(() => EagerGestureRecognizer())
  };

  @override
  Widget build(BuildContext context) {
    return WebViewWidget(
      controller: _controller,
      gestureRecognizers: gestureRecognizers,
    );
  }
}
