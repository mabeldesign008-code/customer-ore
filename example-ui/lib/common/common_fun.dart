import 'dart:io';
import 'dart:math';

import 'package:calendar_date_picker2/calendar_date_picker2.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:get/get.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:intl/intl.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/social/post/add_comment.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:orange_ui/utils/const_res.dart';
import 'package:orange_ui/utils/firebase_res.dart';
import 'package:video_compress/video_compress.dart';

class CommonFun {
  static Future<void> interstitialAd(Function(InterstitialAd ad) onAdLoaded,
      {required String? adMobIntId}) async {
    InterstitialAd.load(
      adUnitId: adMobIntId ?? '',
      request: const AdRequest(),
      adLoadCallback: InterstitialAdLoadCallback(
        onAdLoaded: onAdLoaded,
        onAdFailedToLoad: (LoadAdError error) {},
      ),
    );
  }

  static String timeAgo(DateTime d) {
    Duration diff = DateTime.now().difference(d);
    // if (diff.inDays > 365) {
    //   return "${(diff.inDays / 365).floor()} ${(diff.inDays / 365).floor() == 1 ? "year" : "years"}";
    // }
    // if (diff.inDays > 30) {
    //   return "${(diff.inDays / 30).floor()} ${(diff.inDays / 30).floor() == 1 ? "month" : "months"}";
    // }
    if (diff.inDays > 7) {
      return DateFormat('dd MMM, yyyy').format(d);
    }
    if (diff.inDays > 0) {
      if (diff.inDays == 1) {
        return "Yesterday";
      }
      return "${diff.inDays} days";
    }
    if (diff.inHours > 0) {
      return "${diff.inHours} ${diff.inHours == 1 ? "hour" : "hours"} ago";
    }
    if (diff.inMinutes > 0) {
      return "${diff.inMinutes} ${diff.inMinutes == 1 ? "minute" : "minutes"} ago";
    }
    return "just now";
  }

  static String readTimestamp(double timestamp) {
    var now = DateTime.now();
    var date = DateTime.fromMicrosecondsSinceEpoch(timestamp.toInt() * 1000);
    var time = '';
    if (now.day == date.day) {
      time = DateFormat('hh:mm a')
          .format(DateTime.fromMillisecondsSinceEpoch(timestamp.toInt()));
      return time;
    }
    if (now.weekday > date.weekday) {
      time = DateFormat('EEEE')
          .format(DateTime.fromMillisecondsSinceEpoch(timestamp.toInt()));
      return time;
    }
    if (now.month == date.month) {
      time = DateFormat('dd/MMM/yyyy')
          .format(DateTime.fromMillisecondsSinceEpoch(timestamp.toInt()));
      return time;
    }
    return time;
  }

  static String getConversationID(
      {required int? myId, required int? otherUserId}) {
    String conversationID = '${myId}_$otherUserId';
    List<String> v = conversationID.split('_');
    v.sort((a, b) {
      return int.parse(a).compareTo(int.parse(b));
    });
    conversationID = v.join('_');
    return conversationID;
  }

  static getLastMsg({required String msgType, required String msg}) {
    return msgType == FirebaseRes.image
        ? FirebaseRes.imageText
        : msgType == FirebaseRes.video
            ? FirebaseRes.videoText
            : msg;
  }

  static String getProfileImage({List<Images>? images, int? index}) {
    String profileImage = '';
    List<Images> tempList = images ?? [];
    if (index != null) {
      if (tempList.isNotEmpty) {
        return '${ConstRes.aImageBaseUrl}${tempList[index].image?.replaceAll(ConstRes.aImageBaseUrl, '')}';
      }
      return '';
    }
    if (tempList.isNotEmpty) {
      profileImage = tempList.first.image ?? '';
      return '${ConstRes.aImageBaseUrl}${profileImage.replaceAll(ConstRes.aImageBaseUrl, '')}';
    }
    return '';
  }

  static bool isContentAvailable({List<Content>? content}) {
    if (content != null || content!.isNotEmpty) {
      return true;
    }
    return false;
  }

  static String printDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, "0");
    String twoDigitMinutes = twoDigits(duration.inMinutes.remainder(60));
    String twoDigitSeconds = twoDigits(duration.inSeconds.remainder(60));
    if (twoDigits(duration.inHours) == '00') {
      return '$twoDigitMinutes:$twoDigitSeconds';
    }
    return "${twoDigits(duration.inHours)}:$twoDigitMinutes:$twoDigitSeconds";
  }

  static String formatHHMMSS(int second) {
    int seconds = second;

    int hours = (seconds / 3600).truncate();
    seconds = (seconds % 3600).truncate();
    int minutes = (seconds / 60).truncate();

    String hoursStr = (hours).toString().padLeft(2, '0');
    String minutesStr = (minutes).toString().padLeft(2, '0');
    String secondsStr = (seconds % 60).toString().padLeft(2, '0');

    if (hours == 0) {
      return "$minutesStr:$secondsStr";
    }

    return "$hoursStr:$minutesStr:$secondsStr";
  }

  static double getWidth(int? count) {
    String value = NumberFormat.compact().format(count ?? 0);
    if (value.length == 3) {
      return 58.0;
    } else if (value.length == 4) {
      return 68.0;
    } else if (value.length == 2) {
      return 50.0;
    }
    return 43.0;
  }

  static void isBloc(UserData? userData, {VoidCallback? onCompletion}) {
    if (userData?.isBlock == 1) {
      CommonUI.snackBarWidget(S.current.userBlock);
    } else {
      onCompletion?.call();
    }
  }

  static Future<File> getFileThumbnail(String? path) async {
    final thumbnailFile = await VideoCompress.getFileThumbnail(path ?? '');
    return thumbnailFile;
  }

  static void showDatePicker(BuildContext context, DateTime selectedDob,
      {required Function(DateTime time) onDateSelected}) {
    final eighteenYearsAgo =
        DateTime.now().subtract(const Duration(days: 365 * 18));

    showCalendarDatePicker2Dialog(
      context: context,
      config: CalendarDatePicker2WithActionButtonsConfig(
          selectedDayHighlightColor: ColorRes.themeColor,
          lastDate: eighteenYearsAgo),
      dialogSize: Size(Get.width - 50, 300),
      value: [selectedDob],
      borderRadius: BorderRadius.circular(15),
    ).then((value) {
      onDateSelected.call(value?.first ?? selectedDob);
    });
  }

  static Future<Position?> getUserCurrentLocation({
    bool shouldUpdateInProfileData = true,
  }) async {
    final permission = await Geolocator.requestPermission();

    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      // Fallback to IP-based location if permission denied
      ApiProvider().getIPPlaceDetail(onCompletion: (detail) async {
        if (shouldUpdateInProfileData) {
          await ApiProvider().updateProfile(
              latitude: '${detail.lat}', longitude: '${detail.lon}');
        }
      });
      return null;
    }

    // Safe to get location
    final position = await Geolocator.getCurrentPosition();

    if (shouldUpdateInProfileData) {
      await ApiProvider().updateProfile(
          latitude: '${position.latitude}', longitude: '${position.longitude}');
    }

    return position;
  }

  double calculateDistance({lat1, lon1, lat2, lon2}) {
    var p = 0.017453292519943295;
    var c = cos;
    var a = 0.5 -
        c((lat2 - lat1) * p) / 2 +
        c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p)) / 2;
    return 12742 * asin(sqrt(a));
  }
}
