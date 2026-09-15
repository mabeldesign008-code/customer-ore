import 'dart:developer';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/utils/const_res.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

bool isPurchaseConfig = false;
RxBool isSubscribe = false.obs;

class SubscriptionManager {
  static var shared = SubscriptionManager();
  List<Package> packages = [];
  List<Package> offering = [];

  Future<void> initPlatformState() async {
    PurchasesConfiguration configuration;
    if (Platform.isAndroid) {
      if (ConstRes.revenueCatAndroidApiKey.isNotEmpty) {
        configuration =
            PurchasesConfiguration(ConstRes.revenueCatAndroidApiKey);
        Purchases.setLogLevel(LogLevel.debug);
        await Purchases.configure(configuration);
      }
    } else if (Platform.isIOS) {
      if (ConstRes.revenueCatAppleApiKey.isNotEmpty) {
        configuration = PurchasesConfiguration(ConstRes.revenueCatAppleApiKey);
        Purchases.setLogLevel(LogLevel.debug);
        await Purchases.configure(configuration);
      }
    }
    await checkIsConfigured();
    await fetchOfferings();
  }

  bool checkSubscription(CustomerInfo customerInfo) {
    if (customerInfo.latestExpirationDate == null ||
        customerInfo.latestExpirationDate!.isEmpty) {
      isSubscribe.value = false;
    } else {
      DateTime dt1 =
          DateTime.parse(customerInfo.latestExpirationDate ?? '').toLocal();
      DateTime dt2 = DateTime.now();

      int leftSecond = dt1.difference(dt2).inSeconds;
      log('⏱️ Expire Time : $dt1 == Current Time : $dt2 || Time Left: ${leftSecond > 0 ? leftSecond : 0} seconds');

      if (dt1.compareTo(dt2) < 0) {
        isSubscribe.value = false;
      }
      if (dt1.compareTo(dt2) > 0) {
        isSubscribe.value = true;
      }
    }

    log('🔔 Subscription Status : ${isSubscribe.value ? 'Active' : 'InActive'}');
    return isSubscribe.value;
  }

  Future<void> subscriptionListener() async {
    try {
      Purchases.addCustomerInfoUpdateListener((customerInfo) async {
        int status = checkSubscription(customerInfo) ? 1 : 0;
        UserData? user = SessionManager.instance.getUser();

        if (user?.isVerified == 2) {
          return;
        }
        if (user?.isVerified == status) {
          return;
        }
        ApiProvider().updateProfile(isVerified: status == 1 ? 3 : 0);
      });
    } on PlatformException catch (e) {
      // Error fetching purchaser info
      log('RevenueCat Error : ${e.message.toString()}');
    }
  }

  Future<void> checkIsConfigured() async {
    isPurchaseConfig = await Purchases.isConfigured;
    log('isPurchaseConfig  :$isPurchaseConfig');
  }

  Future<LogInResult> login(String appUserID) async {
    return await Purchases.logIn(appUserID);
  }

  Future<(Offering?, String?)> fetchOfferings() async {
    try {
      Offerings offerings = await Purchases.getOfferings();
      // Display current offering with offerings.current
      offering.addAll(offerings.current?.availablePackages
              .where((element) => element.packageType == PackageType.custom) ??
          []);

      packages.addAll(offerings.current?.availablePackages
              .where((element) => element.packageType != PackageType.custom) ??
          []);

      return (offerings.current, null);
    } on PlatformException catch (e) {
      // Error restoring purchases
      log('Fetch Offering : ${e.message.toString()}');
      return (null, e.message);
    }
  }

  Future<bool?> checkSubscriptionStatus() async {
    try {
      CustomerInfo customerInfo = await Purchases.getCustomerInfo();
      return checkSubscription(customerInfo);
    } on PlatformException catch (e) {
      log(e.message.toString());
      // Error fetching purchaser info
    }
    return null;
  }

  Future<bool?> makePurchase(Package package) async {
    try {
      PurchaseResult customerInfo = await Purchases.purchase(PurchaseParams.package(package));
      return checkSubscription(customerInfo.customerInfo);
    } on PlatformException catch (e) {
      Future.delayed(const Duration(milliseconds: 250), () {
        CommonUI.snackBar(message: e.message ?? '');
      });
      return null;
    }
  }

  Future<CustomerInfo?> makePurchaseCustom(Package package) async {
    try {
      CustomerInfo info = (await Purchases.purchase(PurchaseParams.package(package))).customerInfo;
      return info;
    } on PlatformException catch (e) {
      log("makePurchaseCustom: ${e.message}");
      return null;
    }
  }

  Future<bool?> restorePurchase() async {
    try {
      CustomerInfo restoredInfo = await Purchases.restorePurchases();
      return checkSubscription(restoredInfo);
      // ... check restored customerInfo to see if entitlement is now active
    } on PlatformException catch (e) {
      log(e.toString());
      return null;
      // Error restoring purchases
    }
  }
}
