import 'dart:io';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:orange_ui/model/setting_model.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/service/subscription/subscription_manager.dart';

class CustomBannerAds extends StatefulWidget {
  const CustomBannerAds({super.key});

  @override
  State<CustomBannerAds> createState() => _CustomBannerAdsState();
}

class _CustomBannerAdsState extends State<CustomBannerAds> {
  SettingData? settingData = SessionManager.instance.getSettings();
  Rx<BannerAd?> bannerAd = Rx(null);

  @override
  void initState() {
    super.initState();
    getBannerAd();
  }

  void getBannerAd() {
    String? bannerId = Platform.isIOS
        ? settingData?.appdata?.admobBannerIos
        : settingData?.appdata?.admobBanner;
    BannerAd(
      adUnitId: bannerId ?? '',
      request: const AdRequest(),
      size: AdSize.banner,
      listener: BannerAdListener(
        onAdLoaded: (ad) {
          bannerAd.value = ad as BannerAd;
        },
        onAdFailedToLoad: (ad, err) {
          // print('Failed to load a banner ad: ${err.message}');
          ad.dispose();
        },
      ),
    ).load();
  }

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      if (isSubscribe.value || bannerAd.value == null) {
        return const SizedBox();
      }
      return Container(
        alignment: Alignment.center,
        width: bannerAd.value!.size.width.toDouble(),
        height: bannerAd.value!.size.height.toDouble(),
        child: AdWidget(ad: bannerAd.value!),
      );
    });
  }
}
