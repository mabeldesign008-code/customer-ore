import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/common/privacy_policy_text.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/screen/bottom_diamond_shop/bottom_diamond_shop_model.dart';
import 'package:orange_ui/utils/app_res.dart';
import 'package:orange_ui/utils/asset_res.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/font_res.dart';
import 'package:orange_ui/utils/style_res.dart';
import 'package:stacked/stacked.dart';

class BottomDiamondShop extends StatelessWidget {
  const BottomDiamondShop({super.key});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<BottomDiamondShopModel>.reactive(
      onViewModelReady: (model) => model.init(),
      viewModelBuilder: () => BottomDiamondShopModel(),
      builder: (context, model, child) {
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaY: 3, sigmaX: 3),
          child: ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(25)),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaY: 10, sigmaX: 10, tileMode: TileMode.mirror),
              child: Stack(
                children: [
                  Container(width: Get.width, color: ColorRes.black.withValues(alpha: 0.3)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 20),
                    width: Get.width,
                    decoration: const BoxDecoration(
                      borderRadius: BorderRadius.vertical(top: Radius.circular(25)),
                    ),
                    child: Column(
                      children: [
                        RichText(
                          text: TextSpan(
                            children: [
                              TextSpan(
                                  text: AppRes.planName.toUpperCase(),
                                  style: const TextStyle(
                                      color: ColorRes.white, fontSize: 17, fontFamily: FontRes.regular)),
                              TextSpan(
                                  text: " ${S.current.shop}",
                                  style:
                                      const TextStyle(color: ColorRes.white, fontSize: 17, fontFamily: FontRes.bold)),
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),
                        Expanded(
                          child: model.isLoading
                              ? CommonUI.lottieWidget()
                              : model.coinPlans.isEmpty
                                  ? CommonUI.noData()
                                  : ListView.builder(
                                      physics: const BouncingScrollPhysics(),
                                      padding: EdgeInsets.zero,
                                      itemCount: model.coinPlans.length,
                                      itemBuilder: (context, index) {
                                        CoinPlan coinPlan =
                                            model.coinPlans[index];
                                        return Container(
                                          margin: const EdgeInsets.only(bottom: 8),
                                          padding: const EdgeInsets.fromLTRB(17, 13, 9, 14),
                                          decoration: BoxDecoration(
                                            borderRadius: BorderRadius.circular(15),
                                            color: ColorRes.white.withValues(alpha: 0.14),
                                          ),
                                          child: Row(
                                            children: [
                                              Image.asset(AssetRes.diamond, height: 24, width: 24),
                                              const SizedBox(width: 10),
                                              Expanded(
                                                child: Text(
                                                    "${coinPlan.coin} ${S.current.diamonds.capitalizeFirst}",
                                                    style: const TextStyle(color: ColorRes.white),
                                                    overflow: TextOverflow.ellipsis,
                                                    maxLines: 1),
                                              ),
                                              const SizedBox(width: 10),
                                              InkWell(
                                                borderRadius: BorderRadius.circular(30),
                                                onTap: () => model
                                                    .makePurchase(coinPlan),
                                                child: Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 25, vertical: 8),
                                                  decoration: BoxDecoration(
                                                    borderRadius: BorderRadius.circular(30),
                                                    gradient: StyleRes.linearGradient,
                                                  ),
                                                  child: Center(
                                                    child: Text(
                                                      coinPlan.priceString,
                                                      style: const TextStyle(
                                                          color: ColorRes.white,
                                                          fontSize: 15,
                                                          fontFamily: FontRes.bold),
                                                    ),
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                        );
                                      },
                                    ),
                        ),
                        const SizedBox(height: 23),
                        const PrivacyPolicyText()
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
