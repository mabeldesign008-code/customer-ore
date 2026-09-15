import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/screen/livestream_dashboard_screen/livestream_dashboard_screen_view_model.dart';
import 'package:orange_ui/screen/livestream_dashboard_screen/widgets/eligibility_status_card.dart';
import 'package:orange_ui/utils/app_res.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/style_res.dart';

class CenterAreaLiveStreamDashBoard extends StatelessWidget {
  final VoidCallback onRedeemTap;
  final VoidCallback onHistoryBtnTap;
  final VoidCallback onRedeemBtnTap;
  final VoidCallback onAddCoinsBtnTap;
  final VoidCallback onApplyBtnTap;
  final int? wallet;
  final String? totalStream;
  final String? totalCollection;
  final Appdata? appdata;
  final LiveStreamDashBoardViewModel model;

  const CenterAreaLiveStreamDashBoard({
    super.key,
    required this.onRedeemTap,
    required this.onHistoryBtnTap,
    required this.onRedeemBtnTap,
    required this.onAddCoinsBtnTap,
    required this.onApplyBtnTap,
    required this.wallet,
    required this.totalCollection,
    required this.totalStream,
    this.appdata,
    required this.model,
  });

  @override
  Widget build(BuildContext context) {
    int coinValue = wallet ?? 0;
    String eligibilityTitle = model.userData?.canGoLive == 0
        ? S.current.notEligible
        : model.userData?.canGoLive == 1
            ? S.current.pending
            : S.current.eligible;
    Color eligibilityColor = model.userData?.canGoLive == 0
        ? ColorRes.themeColor
        : model.userData?.canGoLive == 1
            ? ColorRes.lightOrange
            : ColorRes.lightGreen;

    return Expanded(
      child: Padding(
        padding: const EdgeInsets.only(left: 10, right: 10, top: 9),
        child: Column(
          spacing: 10,
          children: [
            if (model.userData?.canGoLive == 0)
              EligibilityStatusCard(
                  title: S.current.getAccess,
                  color: ColorRes.themeColor,
                  eligibilityTitle: S.current.apply,
                  fontFamily: FontRes.bold,
                  onTap: onApplyBtnTap),
            EligibilityStatusCard(
                image: AssetRes.sun,
                title: S.current.eligibility,
                color: eligibilityColor,
                eligibilityTitle: eligibilityTitle),
            AspectRatio(
              aspectRatio: 1 / .55,
              child: Stack(
                children: [
                  SizedBox(
                    width: Get.width,
                    child: ClipRRect(
                        borderRadius: BorderRadius.circular(15),
                        child: Image.asset(AssetRes.map2)),
                  ),
                  Container(
                    width: Get.width,
                    decoration: BoxDecoration(
                      color: ColorRes.darkGrey5.withValues(alpha: 0.05),
                      borderRadius: BorderRadius.circular(15),
                    ),
                  ),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(15),
                    child: BackdropFilter(
                      filter: ImageFilter.blur(sigmaY: 15, sigmaX: 15),
                      child: Padding(
                        padding:
                            const EdgeInsets.only(left: 19, top: 18, right: 13),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  '${AppRes.planName.toUpperCase()} ${S.current.walletCap}',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: ColorRes.lightGrey5,
                                    letterSpacing: 2,
                                    fontFamily: FontRes.semiBold,
                                  ),
                                ),
                                const Spacer(),
                                Image.asset(AssetRes.themeLabel,
                                    height: 23, width: 76),
                                Text(S.current.liveCAp,
                                    style: const TextStyle(fontSize: 16))
                              ],
                            ),
                            const Spacer(),
                            Text(
                              wallet.toString(),
                              style: const TextStyle(
                                  fontSize: 22,
                                  fontFamily: FontRes.bold,
                                  letterSpacing: 2),
                            ),
                            const Spacer(),
                            LinearProgressIndicator(
                                backgroundColor: ColorRes.dimGrey7,
                                value: appdata?.minThreshold != null &&
                                        appdata!.minThreshold != 0
                                    ? coinValue / (appdata?.minThreshold ?? 0)
                                    : 0,
                                valueColor: const AlwaysStoppedAnimation<Color>(
                                    ColorRes.themeColor)),
                            const Spacer(),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                Text(
                                  '${S.current.threshold}${appdata?.minThreshold}',
                                  style: const TextStyle(
                                      fontSize: 13, color: ColorRes.darkGrey),
                                ),
                              ],
                            ),
                            const Spacer(),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceAround,
                              children: [
                                InkWell(
                                  onTap:
                                      coinValue >= (appdata?.minThreshold ?? 0)
                                          ? onRedeemTap
                                          : () {},
                                  child: Container(
                                    height: 41,
                                    width: 141,
                                    decoration: coinValue >=
                                            (appdata?.minThreshold ?? 0)
                                        ? BoxDecoration(
                                            borderRadius:
                                                BorderRadius.circular(30),
                                            gradient: const LinearGradient(
                                              begin: Alignment.topCenter,
                                              end: Alignment.bottomCenter,
                                              colors: [
                                                ColorRes.lightOrange,
                                                ColorRes.themeColor,
                                              ],
                                            ),
                                          )
                                        : BoxDecoration(
                                            borderRadius:
                                                BorderRadius.circular(30),
                                            color: ColorRes.lightGrey6
                                                .withValues(alpha: 0.20),
                                          ),
                                    child: Center(
                                      child: Text(
                                        S.current.redeemCap,
                                        style: TextStyle(
                                          color: coinValue >=
                                                  (appdata?.minThreshold ?? 0)
                                              ? ColorRes.white
                                              : ColorRes.darkGrey9,
                                          fontSize: 12,
                                          fontFamily: FontRes.semiBold,
                                          letterSpacing: 0.8,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                                InkWell(
                                  onTap: onAddCoinsBtnTap,
                                  child: Container(
                                    height: 41,
                                    width: 141,
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(30),
                                      gradient: StyleRes.linearGradient,
                                    ),
                                    child: Center(
                                      child: Text(
                                        '${S.current.add} ${AppRes.planName.toUpperCase()}',
                                        style: const TextStyle(
                                            color: ColorRes.white,
                                            fontSize: 12,
                                            fontFamily: FontRes.semiBold,
                                            letterSpacing: 0.8),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const Spacer()
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 11),
            AspectRatio(
              aspectRatio: 1 / 0.37,
              child: Stack(
                children: [
                  SizedBox(
                    width: Get.width,
                    child: ClipRRect(
                        borderRadius: BorderRadius.circular(15),
                        child: Image.asset(AssetRes.map2)),
                  ),
                  Container(
                    width: Get.width,
                    decoration: BoxDecoration(
                        color: ColorRes.darkGrey5.withValues(alpha: 0.05),
                        borderRadius: BorderRadius.circular(15)),
                  ),
                  SizedBox(
                    width: Get.width,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(15),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaY: 15, sigmaX: 15),
                        child: Padding(
                          padding: const EdgeInsets.only(
                              left: 19, top: 18, right: 13, bottom: 15),
                          child: Column(
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    S.current.totalStream,
                                    style: const TextStyle(
                                        fontSize: 13,
                                        color: ColorRes.lightGrey5,
                                        fontFamily: FontRes.semiBold,
                                        letterSpacing: 0.8),
                                  ),
                                  Text(
                                    S.current.totalCollection,
                                    style: const TextStyle(
                                        fontSize: 13,
                                        color: ColorRes.lightGrey5,
                                        fontFamily: FontRes.semiBold,
                                        letterSpacing: 0.8),
                                  ),
                                ],
                              ),
                              const Spacer(),
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    NumberFormat.compactCurrency(
                                            decimalDigits: 0, name: '')
                                        .format(
                                      int.parse(totalStream ?? '0'),
                                    ),
                                    style: const TextStyle(
                                      color: ColorRes.darkGrey,
                                      letterSpacing: 3,
                                      fontSize: 19,
                                      fontFamily: FontRes.bold,
                                    ),
                                  ),
                                  Text(
                                    NumberFormat.compactCurrency(
                                            decimalDigits: 2, name: '')
                                        .format(
                                      int.parse(totalCollection ?? '0'),
                                    ),
                                    style: const TextStyle(
                                      color: ColorRes.darkGrey,
                                      letterSpacing: 3,
                                      fontSize: 19,
                                      fontFamily: FontRes.bold,
                                    ),
                                  )
                                ],
                              ),
                              const Spacer(),
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  InkWell(
                                    onTap: onHistoryBtnTap,
                                    child: Container(
                                      height: 37.8,
                                      width: 130,
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(30),
                                        color: ColorRes.lightGrey6
                                            .withValues(alpha: 0.20),
                                      ),
                                      child: Center(
                                        child: Text(
                                          S.current.history,
                                          style: const TextStyle(
                                            fontSize: 12,
                                            color: ColorRes.darkGrey9,
                                            fontFamily: FontRes.semiBold,
                                            letterSpacing: 0.8,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                  InkWell(
                                    onTap: onRedeemBtnTap,
                                    child: Container(
                                      // height: 38,
                                      //width: 150,
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 18, vertical: 11),
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(30),
                                        color: ColorRes.lightGrey6
                                            .withValues(alpha: 0.20),
                                      ),
                                      child: Center(
                                        child: Text(
                                          S.current.redeemRequests,
                                          style: const TextStyle(
                                            fontSize: 12,
                                            color: ColorRes.darkGrey9,
                                            fontFamily: FontRes.semiBold,
                                            letterSpacing: 0.8,
                                          ),
                                        ),
                                      ),
                                    ),
                                  )
                                ],
                              )
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
