import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ore_core/ore_core.dart';

import 'core/router/app_router.dart';
import 'data/notifications/rider_notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try { await dotenv.load(fileName: '.env'); } catch (_) {}
  try { await PrefsService.init(); } catch (_) {}
  await _bootstrapFirebaseMessaging();
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );
  runApp(const ProviderScope(child: OreRiderApp()));
}

/// Firebase requires the background handler to be registered before [runApp].
/// Missing google-services.json / GoogleService-Info.plist must not crash web or desktop.
Future<void> _bootstrapFirebaseMessaging() async {
  if (kIsWeb) return;
  if (defaultTargetPlatform != TargetPlatform.android &&
      defaultTargetPlatform != TargetPlatform.iOS) {
    return;
  }
  try {
    if (Firebase.apps.isEmpty) await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(riderFirebaseBackgroundHandler);
  } catch (_) {
    // Native Firebase files are local-only (chunk 4.1). Token register retries in initialize().
  }
}

class OreRiderApp extends ConsumerWidget {
  const OreRiderApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(riderRouterProvider);
    return MaterialApp.router(
      title: 'Ore Rider',
      debugShowCheckedModeBanner: false,
      theme: OreTheme.light(),
      routerConfig: router,
    );
  }
}
