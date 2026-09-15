import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:ore_core/ore_core.dart';

import 'core/router/app_router.dart';
import 'core/security/ore_security.dart';
import 'core/ui/bouncy_scroll.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'providers/customer_auth_provider.dart';
import 'providers/notifications_provider.dart';
import 'providers/theme_provider.dart';

Future<void> main() async {
  await runZonedGuarded(() async {
    WidgetsFlutterBinding.ensureInitialized();

    try {
      await dotenv.load(fileName: '.env');
    } catch (_) {
      // Missing .env is OK in release — --dart-define is used instead.
    }

    // Initialize shared preferences early so providers that depend on it
    // synchronously (address book, theme) are ready on first frame.
    try {
      await PrefsService.init();
    } catch (_) {}

    // Firebase (push notifications). Guard with try/catch because google-services.json
    // is not committed in the repo; the app must still boot. When a developer
    // has run `flutterfire configure`, this initializes FCM; otherwise push
    // is silently unavailable.
    try {
      await _tryInitFirebase();
    } catch (e) {
      if (kDebugMode) debugPrint('Firebase init skipped (push unavailable): $e');
    }

    await SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
    ]);

    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
        statusBarBrightness: Brightness.light,
        systemNavigationBarColor: Colors.transparent,
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
    );

    // Graceful global error screen instead of the red-yellow death banner.
    ErrorWidget.builder = (details) => _ErrorFallback(details: details);

    FlutterError.onError = (details) {
      if (kDebugMode) {
        FlutterError.presentError(details);
      } else {
        debugPrint('Flutter error: ${details.exception}');
      }
    };

    PlatformDispatcher.instance.onError = (error, stack) {
      debugPrint('Platform error: $error\n$stack');
      // ── Sentry / Crash reporting hook ─────────────────────────────
      // To enable Sentry in production:
      //   1. Add `sentry_flutter: ^8.x` to pubspec.yaml.
      //   2. Replace the block above with:
      //        Sentry.captureException(error, stackTrace: stack);
      //   3. Wrap runApp with SentryFlutter.init(...) and pass your DSN
      //      via --dart-define=SENTRY_DSN=...
      // The app already routes all uncaught errors through this zone,
      // so no other instrumentation points are needed.
      return true;
    };

    // Enable release-mode security guards (log silencing, etc.) before the
    // widget tree mounts.
    OreSecurity.init();

    runApp(const ProviderScope(child: OreApp()));
  }, (error, stack) {
    // Redact PII from any uncaught errors before sending them to console (or
    // Sentry/Crashlytics once that's enabled — see the Sentry hook below).
    debugPrint('Uncaught error: ${redactSensitive(error.toString())}\n$stack');
  });
}

/// Initialises Firebase when the native config is present. Kept as a separate
/// async method so the try/catch in main() can absorb missing configuration
/// without bringing down the app (push notifications simply become unavailable).
Future<void> _tryInitFirebase() async {
  // Firebase is initialised lazily. After running `flutterfire configure`
  // (which writes google-services.json / GoogleService-Info.plist) add:
  //
  //   import 'package:firebase_core/firebase_core.dart';
  //
  // at the top of this file and uncomment the line below. The
  // CustomerNotificationService will then register the FCM token with
  // /api/notifications/device-token on startup.
  //
  // await Firebase.initializeApp();
}

class OreApp extends ConsumerStatefulWidget {
  const OreApp({super.key});

  @override
  ConsumerState<OreApp> createState() => _OreAppState();
}

class _OreAppState extends ConsumerState<OreApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(customerAuthProvider.notifier).restoreSession();
    });
    // When authentication completes (or is restored from storage), register
    // for push notifications. Listener stays for logout→login transitions.
    ref.listenManual(customerAuthProvider, (prev, next) {
      if (next.isAuthenticated && !(prev?.isAuthenticated ?? false)) {
        ref.read(customerNotificationServiceProvider).initialize();
      }
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // When the app comes back to the foreground, refresh order state and
    // re-register push token in case it rotated while in the background.
    if (state == AppLifecycleState.resumed) {
      final auth = ref.read(customerAuthProvider);
      if (auth.isAuthenticated) {
        ref.read(customerNotificationServiceProvider).initialize();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(appRouterProvider);
    final themeMode = ref.watch(themeModeProvider);
    return MaterialApp.router(
      title: 'Ore',
      debugShowCheckedModeBanner: false,
      theme: OreTheme.light(),
      darkTheme: OreTheme.dark(),
      themeMode: themeMode,
      scrollBehavior: const OreScrollBehavior(),
      routerConfig: router,
      builder: (context, child) {
        final mq = MediaQuery.of(context);
        final scale = mq.textScaler.clamp(
          minScaleFactor: 0.85,
          maxScaleFactor: 1.3,
        );
        final isOnline = ref.watch(connectivityProvider).value ?? true;
        return MediaQuery(
          data: mq.copyWith(textScaler: scale),
          child: Stack(children: [
            child ?? const SizedBox.shrink(),
            if (!isOnline)
              Positioned(
                top: 0, left: 0, right: 0,
                child: _OfflineBanner(topPadding: mq.padding.top),
              ),
          ]),
        );
      },
    );
  }
}

class _OfflineBanner extends StatelessWidget {
  const _OfflineBanner({required this.topPadding});
  final double topPadding;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(16, topPadding + 6, 16, 8),
      color: AppColors.warning,
      child: Row(children: [
        const Icon(Icons.wifi_off_rounded, color: Colors.white, size: 16),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            'You appear to be offline. Some data may be stale.',
            style: AppTypography.caption(Colors.white).copyWith(fontWeight: FontWeight.w700),
          ),
        ),
      ]).animate().slideY(begin: -1, duration: const Duration(milliseconds: 280)),
    );
  }
}

class _ErrorFallback extends StatelessWidget {
  const _ErrorFallback({required this.details});
  final FlutterErrorDetails details;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.background,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline_rounded,
                  color: AppColors.danger, size: 56),
              const SizedBox(height: 16),
              const Text('Something went wrong',
                  style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 18,
                      fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              if (kDebugMode)
                Text(
                  details.exceptionAsString(),
                  textAlign: TextAlign.center,
                  style: AppTypography.bodySm(AppColors.textSecondary),
                ),
              const SizedBox(height: 20),
              OreButton(
                label: 'Restart app',
                icon: Icons.refresh_rounded,
                onPressed: () => SystemNavigator.pop(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
