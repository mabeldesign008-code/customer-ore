import 'package:google_mobile_ads/google_mobile_ads.dart';

class AdsService {
  static Future<void> requestConsentInfoUpdate() async {
    // Create a ConsentRequestParameters object.
    final params = ConsentRequestParameters();

    // Request an update for the consent information.
    ConsentInformation.instance.requestConsentInfoUpdate(
      params,
      () async {
        ConsentForm.loadAndShowConsentFormIfRequired((loadAndShowError) {
          if (loadAndShowError != null) {
            // Consent gathering failed.
          }
          _initializeMobileAdsSDK();
          // Consent has been gathered.
        });
      },
      (FormError error) {
        // Handle the error.
      },
    );
    _initializeMobileAdsSDK();
  }

  static void _initializeMobileAdsSDK() async {
    // Initialize the Mobile Ads SDK if the SDK has gathered consent aligned with
    // the app's configured messages.
    var canRequestAds = await ConsentInformation.instance.canRequestAds();
    if (canRequestAds) {
      // Initialize the Mobile Ads SDK.
      MobileAds.instance.initialize();

      // TODO: Request an ad.
    }
  }
}
