import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:ore_core/ore_core.dart';

class VendorNotificationEvent {
  const VendorNotificationEvent({this.type, this.orderId, this.title, this.body});

  final String? type;
  final String? orderId;
  final String? title;
  final String? body;

  factory VendorNotificationEvent.fromMessage(RemoteMessage message) {
    return VendorNotificationEvent(
      type: message.data['type']?.toString(),
      orderId: message.data['orderId']?.toString(),
      title: message.notification?.title,
      body: message.notification?.body,
    );
  }
}

class VendorNotificationService {
  VendorNotificationService(this._client);

  final OreApiClient _client;
  final StreamController<VendorNotificationEvent> _events = StreamController.broadcast();
  bool _initialized = false;

  Stream<VendorNotificationEvent> get events => _events.stream;

  Future<void> initialize() async {
    if (_initialized || (defaultTargetPlatform != TargetPlatform.android && defaultTargetPlatform != TargetPlatform.iOS)) return;
    try {
      if (Firebase.apps.isEmpty) await Firebase.initializeApp();
      FirebaseMessaging.onBackgroundMessage(vendorFirebaseBackgroundHandler);
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission(alert: true, badge: true, sound: true);
      final token = await messaging.getToken();
      if (token != null && token.isNotEmpty) await _register(token);
      messaging.onTokenRefresh.listen(_register);
      FirebaseMessaging.onMessage.listen(_emit);
      FirebaseMessaging.onMessageOpenedApp.listen(_emit);
      final initial = await messaging.getInitialMessage();
      if (initial != null) _emit(initial);
      _initialized = true;
    } catch (_) {
      // Native Firebase files are a PC/device setup requirement; app startup remains usable.
    }
  }

  Future<void> _register(String token) async {
    final platform = defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android';
    await _client.post<Map<String, dynamic>>(
      OreEndpoints.notificationsDeviceToken,
      data: <String, String>{'token': token, 'platform': platform},
    );
  }

  void _emit(RemoteMessage message) {
    if (!_events.isClosed) _events.add(VendorNotificationEvent.fromMessage(message));
  }

  Future<void> dispose() => _events.close();
}

@pragma('vm:entry-point')
Future<void> vendorFirebaseBackgroundHandler(RemoteMessage message) async {
  if (Firebase.apps.isEmpty) await Firebase.initializeApp();
}
