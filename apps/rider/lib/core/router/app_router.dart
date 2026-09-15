import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/rider_provider.dart';
import '../../screens/onboarding/splash_screen.dart';
import '../../screens/onboarding/login_screen.dart';
import '../../screens/onboarding/staged_registration_screen.dart';
import '../../screens/onboarding/rider_application_status_screen.dart';
import '../../screens/home/home_shell.dart';
import '../../screens/home/home_screen.dart';
import '../../screens/home/demand_map_screen.dart';
import '../../screens/home/schedule_screen.dart';
import '../../screens/orders/orders_list_screen.dart';
import '../../screens/orders/order_detail_screen.dart';
import '../../screens/orders/order_chat_screen.dart';
import '../../screens/delivery/delivery_map_screen.dart';
import '../../screens/delivery/delivery_proof_screen.dart';
import '../../screens/delivery/errand_shopping_screen.dart';
import '../../screens/earnings/earnings_screen.dart';
import '../../screens/profile/profile_screen.dart';
import '../../screens/profile/documents_screen.dart';
import '../../screens/profile/wallet_screen.dart';
import '../../screens/profile/notifications_screen.dart';
import '../../screens/profile/trip_history_screen.dart';
import '../../screens/profile/vehicle_screen.dart';
import '../../screens/support/support_screen.dart';
import '../../screens/support/support_chat_screen.dart';
import '../../screens/support/sos_screen.dart';

/// A [Listenable] that wraps a [Stream] so GoRouter can refresh on stream events.
class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(Stream<dynamic> stream) {
    _subscription = stream.asBroadcastStream().listen((_) => notifyListeners());
  }
  late final StreamSubscription<dynamic> _subscription;
  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}

/// Centralised route paths used across the rider app.
class RiderRoutes {
  static const splash = '/';
  static const login = '/login';
  static const onboardingStaged = '/onboarding-staged';
  static const applicationStatus = '/application-status';
  static const home = '/home';
  static const orders = '/orders';
  static const orderDetail = '/orders/:id';
  static const chat = '/chat/:id';
  static const delivery = '/delivery/:id';
  static const deliveryProof = '/delivery/:id/proof';
  static const errandShopping = '/delivery/:id/errand-shopping';
  static const earnings = '/earnings';
  static const profile = '/profile';
  static const documents = '/profile/documents';
  static const wallet = '/profile/wallet';
  static const notifications = '/profile/notifications';
  static const trips = '/profile/trips';
  static const vehicle = '/profile/vehicle';
  static const support = '/support';
  static const supportChat = '/support/chat';
  static const demand = '/demand';
  static const schedule = '/schedule';
  static const sos = '/sos';
}

final riderRouterProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(riderAuthProvider);
  return GoRouter(
    initialLocation: RiderRoutes.splash,
    refreshListenable: GoRouterRefreshStream(auth.stream),
    routes: [
      GoRoute(path: RiderRoutes.splash, builder: (_, __) => const RiderSplashScreen()),
      GoRoute(path: RiderRoutes.login, builder: (_, __) => const RiderLoginScreen()),
      GoRoute(
        path: RiderRoutes.onboardingStaged,
        builder: (ctx, st) => RiderStagedRegistrationScreen(
          initialStage: int.tryParse(st.uri.queryParameters['stage'] ?? '1') ?? 1,
        ),
      ),
      GoRoute(
        path: RiderRoutes.applicationStatus,
        builder: (ctx, st) => RiderApplicationStatusScreen(
          status: st.uri.queryParameters['status'] ?? 'PENDING_REVIEW',
          requiresActionField: st.uri.queryParameters['field'],
          stageToFix: int.tryParse(st.uri.queryParameters['stage'] ?? '3') ?? 3,
        ),
      ),
      ShellRoute(
        builder: (ctx, state, child) => RiderHomeShell(child: child),
        routes: [
          GoRoute(path: RiderRoutes.home, builder: (_, __) => const RiderHomeScreen()),
          GoRoute(path: RiderRoutes.orders, builder: (_, __) => const RiderOrdersListScreen()),
          GoRoute(path: RiderRoutes.earnings, builder: (_, __) => const RiderEarningsScreen()),
          GoRoute(path: RiderRoutes.profile, builder: (_, __) => const RiderProfileScreen()),
        ],
      ),
      GoRoute(
        path: RiderRoutes.orderDetail,
        builder: (ctx, st) => RiderOrderDetailScreen(orderId: st.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: RiderRoutes.chat,
        builder: (ctx, st) => RiderOrderChatScreen(orderId: st.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: RiderRoutes.delivery,
        builder: (ctx, st) => RiderDeliveryMapScreen(orderId: st.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: RiderRoutes.deliveryProof,
        builder: (ctx, st) => RiderDeliveryProofScreen(orderId: st.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: RiderRoutes.errandShopping,
        builder: (ctx, st) => RiderErrandShoppingScreen(orderId: st.pathParameters['id'] ?? ''),
      ),
      GoRoute(path: RiderRoutes.documents, builder: (_, __) => const RiderDocumentsScreen()),
      GoRoute(path: RiderRoutes.wallet, builder: (_, __) => const RiderWalletScreen()),
      GoRoute(path: RiderRoutes.notifications, builder: (_, __) => const RiderNotificationsScreen()),
      GoRoute(path: RiderRoutes.trips, builder: (_, __) => const RiderTripHistoryScreen()),
      GoRoute(path: RiderRoutes.vehicle, builder: (_, __) => const RiderVehicleScreen()),
      GoRoute(path: RiderRoutes.support, builder: (_, __) => const RiderSupportScreen()),
      GoRoute(path: RiderRoutes.demand, builder: (_, __) => const RiderDemandMapScreen()),
      GoRoute(path: RiderRoutes.schedule, builder: (_, __) => const RiderScheduleScreen()),
      GoRoute(path: RiderRoutes.supportChat, builder: (_, __) => const RiderSupportChatScreen()),
      GoRoute(path: RiderRoutes.sos, builder: (_, __) => const RiderSosScreen()),
    ],
  );
});
