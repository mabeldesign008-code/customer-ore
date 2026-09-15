import 'package:orange_ui/generated/l10n.dart';

class AppRes {
  // AppName
  static const String appName = 'Orange';

  // For Datetime
  static const String hmmA = "h:mm a";
  static const String hhMmA = "hh:mm a";
  static const String dMY = "dd MMM yyyy";
  static const String isHttp = "http://";
  static const String isHttps = "https://";

  // For Dialog
  static String reverseSwipeDisc(int reverseSwipePrice) {
    return "${S.current.reverseSwipeWillCostYou} $reverseSwipePrice ${S.current.coinsPleaseConfirmIfYouToContinueOrNot}";
  }

  static String messageDisc(int? messagePrice) {
    return "${S.current.messagePriceWillCostYou} ${messagePrice ?? 0} ${S.current.coinsPerMsgPleaseConfirmIfYouToContinueOr}";
  }

  static String liveStreamDisc(int? liveWatchingPrice) {
    return "${S.current.liveStreamPriceWillCostYou} ${liveWatchingPrice ?? 0} ${S.current.coinsPerMinutesPleaseConfirmIfYouToContinueOr}";
  }

  static const String report = 'Report';

  static const String defaultFullname = 'Unknown';

  static const String male = 'Male';
  static const String female = 'Female';
  static const String other = 'Other';

  static String videoDurationDescription(int second) {
    return 'This video is more then $second seconds.  Please select another...';
  }

  static String liveStreamingNotificationTitle(String? name) =>
      'Hey, $name is now live';

  static String planName = 'Diamond';
  static String defaultCurrencyCode = '\$';

  ///------------------------ Notification Topic ------------------------///
  static const String subscribeTopic = 'orange';
  static const String liveStreamingTopic = 'liveStreaming';

  ///------------------------ Chat  ------------------------///

  static const int maxVideoUploadSize = 15; // Enter in MB

// Image picker quality
  static const double maxWidth = 720;
  static const double maxHeight = 1280;
  static const int quality = 80;
  static const int maxImages = 5;

// Max Images for Post
  static const int defaultMaxImagesForPost = 5;

// Pagination data limit
  static const int paginationLimit = 15;

// Story Duration for image
  static const int storyDuration = 5;

// Capture story video duration in second
  static const int storyVideoDuration = 30;

// Age Limit
  static const double ageMin = 18;
  static const double ageMax = 100;
  static const double defaultDistancePreference = 25;
  static const double maximumDistancePreference = 100.0;

// default genderPref
  static const defaultGenderPref = 1;

  // Change Diamond Icon
  static const coinIcon = '💎';

  // Create Profile
  static const whereDoYouLiveExample = '(Eg. NewYork, USA)';
}
