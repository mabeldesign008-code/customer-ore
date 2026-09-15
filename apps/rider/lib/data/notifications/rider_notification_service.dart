import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:ore_core/ore_core.dart';

class RiderNotificationEvent {
  const RiderNotificationEvent({
    required this.type,
    this.orderId,
    this.offerId,
    this.title,
    this.body,
  });

  final String type;
  final String? orderId;
  final String? offerId;
  final String? title;
  final String? body;

  factory RiderNotificationEvent.fromMessage(RemoteMessage message) {
    return RiderNotificationEvent(
      type: message.data['type']?.toString() ?? 'GENERAL',
      orderId: message.data['orderId']?.toString(),
      offerId: message.data['offerId']?.toString(),
      title: message.notification?.title,
      body: message.notification?.body,
    );
  }
}

/// Registers the current device with Ore Notification service and exposes
/// foreground/opened notification events to the app shell.
class RiderNotificationService {
  RiderNotificationService(this._client);

  final OreApiClient _client;
  final StreamController<RiderNotificationEvent> _events =
      StreamController<RiderNotificationEvent>.broadcast();
  bool _initialized = false;

  Stream<RiderNotificationEvent> get events => _events.stream;

  Future<void> initialize() async {
    if (_initialized ||
        (defaultTargetPlatform != TargetPlatform.android &&
            defaultTargetPlatform != TargetPlatform.iOS)) {
      return;
    }

    try {
      if (Firebase.apps.isEmpty) await Firebase.initializeApp();
      // onBackgroundMessage is registered in main() before runApp.
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission(alert: true, badge: true, sound: true);
      final token = await messaging.getToken();
      if (token != null && token.isNotEmpty) await _register(token);
      messaging.onTokenRefresh.listen(_register);
      FirebaseMessaging.onMessage.listen(_emit);
      FirebaseMessaging.onMessageOpenedApp.listen(_emit);
      final initialMessage = await messaging.getInitialMessage();
      if (initialMessage != null) _emit(initialMessage);
      _initialized = true;
    } catch (_) {
      // Missing native Firebase configuration must not prevent app startup.
    }
  }

  void _emit(RemoteMessage message) {
    if (!_events.isClosed) _events.add(RiderNotificationEvent.fromMessage(message));
  }

  Future<void> _register(String token) async {
    final platform = defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android';
    await _client.post<Map<String, dynamic>>(
      OreEndpoints.notificationsDeviceToken,
      data: <String, String>{'token': token, 'platform': platform},
    );
  }

  Future<void> dispose() => _events.close();
}

@pragma('vm:entry-point')
Future<void> riderFirebaseBackgroundHandler(RemoteMessage message) async {
  if (Firebase.apps.isEmpty) await Firebase.initializeApp();
}
