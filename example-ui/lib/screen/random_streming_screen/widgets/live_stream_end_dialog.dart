import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';

class LiveStreamEndDialog extends StatelessWidget {
  final VoidCallback onYesBtnClick;
  final VoidCallback onNoBtnClick;

  const LiveStreamEndDialog(
      {super.key, required this.onYesBtnClick, required this.onNoBtnClick});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorRes.transparent,
      body: Dialog(
        insetPadding: const EdgeInsets.symmetric(horizontal: 70),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
        child: AspectRatio(
          aspectRatio: 0.9,
          child: Column(
            children: [
              const Spacer(flex: 2),
              RichText(
                text: TextSpan(
                  style: const TextStyle(fontFamily: FontRes.semiBold, fontSize: 17),
                  children: [
                    TextSpan(
                      text: S.current.areYou,
                      style: const TextStyle(color: ColorRes.darkGrey9, fontSize: 15),
                    ),
                    TextSpan(
                      text: S.current.sure,
                      style: const TextStyle(color: ColorRes.darkGrey),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              const Image(
                image: AssetImage(AssetRes.themeLabel),
                width: 100,
              ),
              const Spacer(
                flex: 2,
              ),
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 12),
                child: Text(
                  S.current.areYouSureYouWantToEnd,
                  style: const TextStyle(fontFamily: FontRes.semiBold, color: ColorRes.darkGrey9),
                  textAlign: TextAlign.center,
                ),
              ),
              const Spacer(),
              InkWell(
                highlightColor: ColorRes.transparent,
                splashColor: ColorRes.transparent,
                onTap: onYesBtnClick,
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 15),
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        ColorRes.lightOrange,
                        ColorRes.themeColor,
                      ],
                    ),
                    borderRadius: BorderRadius.circular(7),
                  ),
                  child: Text(
                    S.current.yes,
                    style: const TextStyle(color: ColorRes.white, fontFamily: FontRes.semiBold),
                  ),
                ),
              ),
              const Spacer(),
              InkWell(
                highlightColor: ColorRes.transparent,
                splashColor: ColorRes.transparent,
                onTap: onNoBtnClick,
                child: Container(
                  height: 40,
                  margin: const EdgeInsets.symmetric(horizontal: 15),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(7),
                  ),
                  child: Text(
                    S.current.no,
                    style: const TextStyle(color: ColorRes.darkGrey9, fontFamily: FontRes.semiBold),
                  ),
                ),
              ),
              const Spacer(
                flex: 2,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget endStreamButton(
      {required VoidCallback onBtnPress, required String title, required Color color}) {
    return Expanded(
        child: Container(
      margin: const EdgeInsets.symmetric(horizontal: 15),
      child: TextButton(
        onPressed: () {
          HapticFeedback.heavyImpact();
          onBtnPress();
        },
        style: ButtonStyle(
            backgroundColor: WidgetStateProperty.all(color),
            shape: WidgetStateProperty.all(
              RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(5),
              ),
            ),
            surfaceTintColor: WidgetStateProperty.all(ColorRes.white)),
        child: Text(
          title,
          style: const TextStyle(color: ColorRes.white, fontFamily: FontRes.semiBold),
        ),
      ),
    ));
  }
}
