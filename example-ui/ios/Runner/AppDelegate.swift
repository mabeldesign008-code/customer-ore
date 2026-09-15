import UIKit
import Flutter
import GoogleMaps
import Firebase
import flutter_local_notifications
import app_links


@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    FirebaseApp.configure()
    // This is required to make any communication available in the action isolate.
    FlutterLocalNotificationsPlugin.setPluginRegistrantCallback { (registry) in
        GeneratedPluginRegistrant.register(with: registry)
    }

    if #available(iOS 10.0, *) {
      UNUserNotificationCenter.current().delegate = self as UNUserNotificationCenterDelegate
    }
    GeneratedPluginRegistrant.register(with: self)
    GMSServices.provideAPIKey("---- GOOGLE MAP KEY ----")
    if let url = AppLinks.shared.getLink(launchOptions: launchOptions) {
                      // We have a link, propagate it to your Flutter app or not
                      AppLinks.shared.handleLink(url: url)
                    }
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
