import 'dart:developer';
import 'dart:io';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:orange_ui/screen/chat_screen/chat_screen_view_model.dart';
import 'package:orange_ui/utils/app_res.dart';
import 'package:orange_ui/utils/urls.dart';

class FirebaseNotificationManager {
  static var shared = FirebaseNotificationManager();
  FirebaseMessaging firebaseMessaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();

  AndroidNotificationChannel channel = const AndroidNotificationChannel(
      'orange', // id
      AppRes.appName, // title
      playSound: true,
      enableLights: true,
      enableVibration: true,
      showBadge: false,
      importance: Importance.max);

  FirebaseNotificationManager() {
    init();
  }

  String? notificationId;

  void init() async {
    subscribeToTopic();
    if (Platform.isAndroid) {
      await flutterLocalNotificationsPlugin
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.requestNotificationsPermission();
    } else {
      await flutterLocalNotificationsPlugin
          .resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()
          ?.requestPermissions(alert: true, sound: true);
    }

    await firebaseMessaging.requestPermission(alert: true, badge: false, sound: true);

    var initializationSettingsAndroid = const AndroidInitializationSettings('@mipmap/ic_launcher');

    var initializationSettingsIOS = const DarwinInitializationSettings(
        defaultPresentAlert: true, defaultPresentSound: true, defaultPresentBadge: false);

    var initializationSettings =
        InitializationSettings(android: initializationSettingsAndroid, iOS: initializationSettingsIOS);

    flutterLocalNotificationsPlugin.initialize(settings: initializationSettings);

    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      // If Notification has gone twice
      if (notificationId == message.messageId) return;
      notificationId = message.messageId;
      log('${message.notification?.toMap()}');
      if (message.data[Urls.aConversationId] == ChatScreenViewModel.conversationID) return;
      showNotification(message);
    });

    await flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);
  }

  void showNotification(RemoteMessage message) {
    int notificationId = DateTime.now().millisecondsSinceEpoch.remainder(100000);
    flutterLocalNotificationsPlugin.show(
      id: notificationId,
      title: message.data['title'] ?? message.notification?.title,
      body: message.data['body'] ?? message.notification?.body,
      notificationDetails: NotificationDetails(
          iOS: const DarwinNotificationDetails(presentSound: true, presentAlert: true, presentBadge: false),
          android: AndroidNotificationDetails(channel.id, channel.name)),
    );
  }

  void getNotificationToken(Function(String token) completion) async {
    try {
      await FirebaseMessaging.instance.getToken().then((value) {
        log('DeviceToken : $value');
        completion(value ?? 'No Token');
      });
    } catch (e) {
      completion('No Token');
      log(e.toString());
    }
  }

  void unsubscribeToTopic({String? topic}) async {
    log('Topic UnSubscribe');
    await firebaseMessaging
        .unsubscribeFromTopic(topic ?? '${AppRes.subscribeTopic}_${Platform.isIOS ? 'ios' : 'android'}');
  }

  void subscribeToTopic({String? topic}) async {
    log('Topic Subscribe');
    await firebaseMessaging.subscribeToTopic(topic ?? '${AppRes.subscribeTopic}_${Platform.isIOS ? 'ios' : 'android'}');
  }
}
