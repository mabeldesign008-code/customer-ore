import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../screens/welcome_screen.dart';
import '../../screens/onboarding_screen.dart';
import '../../screens/get_started_screen.dart';
import '../../screens/profile_setup_screen.dart';
import '../../screens/location_permission_screen.dart';
import '../../screens/home_shell.dart';
import '../../screens/search_screen.dart';
import '../../screens/vendor_store_screen.dart';
import '../../screens/food_detail_screen.dart';
import '../../screens/checkout_screen.dart';
import '../../screens/cart_screen.dart';
import '../../screens/order_confirmation_screen.dart';
import '../../screens/order_tracking_screen.dart';
import '../../screens/order_detail_screen.dart';
import '../../screens/notifications_screen.dart';
import '../../screens/disputes_screen.dart';
import '../../screens/wallet_screen.dart';
import '../../screens/vouchers_screen.dart';
import '../../screens/referral_screen.dart';
import '../../screens/saved_addresses_screen.dart';
import '../../screens/payment_methods_screen.dart';
import '../../screens/favourites_screen.dart';
import '../../screens/chat_screen.dart';
import '../../screens/rate_review_screen.dart';
import '../../screens/help_support_screen.dart';
import '../../screens/settings_screen.dart';
import '../../screens/parcel/parcel_flow_screen.dart';
import '../../screens/errand/errand_flow_screen.dart';
import '../../screens/laundry_vendors_screen.dart';
import '../../screens/profile_edit_screen.dart';
import '../../providers/customer_auth_provider.dart';

/// App route paths. Centralised so screens never hardcode string paths.
class AppRoutes {
  AppRoutes._();
  static const String welcome = '/welcome';
  static const String onboarding = '/onboarding';
  static const String getStarted = '/get-started';
  static const String profileSetup = '/profile-setup';
  static const String pinSetup = '/pin-setup';
  static const String locationPermission = '/location-permission';
  static const String home = '/';
  static const String orders = '/orders';
  static const String profile = '/profile';
  static const String profileEdit = '/profile/edit';
  static const String search = '/search';
  static const String vendor = '/vendor/:id';
  static const String product = '/product/:vid/:pid';
  static const String cart = '/cart';
  static const String checkout = '/checkout';
  static const String orderConfirm = '/order-confirm/:id';
  static const String orderTracking = '/orders/:id/tracking';
  static const String orderDetail = '/orders/:id';
  static const String rateOrder = '/orders/:id/rate';
  static const String notifications = '/notifications';
  static const String disputes = '/disputes';
  static const String wallet = '/wallet';
  static const String vouchers = '/vouchers';
  static const String referrals = '/referrals';
  static const String addresses = '/addresses';
  static const String payments = '/payments';
  static const String favourites = '/favourites';
  static const String chat = '/chat';
  static const String support = '/support';
  static const String settings = '/settings';
  static const String parcel = '/parcel';
  static const String errand = '/errand';
  static const String laundry = '/laundry';
}

final _rootKey = GlobalKey<NavigatorState>();

final appRouterProvider = Provider<GoRouter>((ref) {
  // Keep this provider alive — GoRouter must not be recreated on auth changes.
  ref.keepAlive();

  final authNotifier = ref.read(customerAuthProvider.notifier);

  /// Returns true if [location] equals [prefix] or begins with "$prefix/".
  bool matches(String location, String prefix) {
    if (location == prefix) return true;
    return location.startsWith('$prefix/');
  }

  final protectedPrefixes = <String>[
    AppRoutes.checkout,
    AppRoutes.orders,
    AppRoutes.wallet,
    AppRoutes.notifications,
    AppRoutes.profile,
    AppRoutes.addresses,
    AppRoutes.payments,
    AppRoutes.favourites,
    AppRoutes.vouchers,
    AppRoutes.referrals,
    AppRoutes.chat,
    AppRoutes.disputes,
    AppRoutes.support,
    AppRoutes.settings,
    AppRoutes.errand,
    AppRoutes.parcel,
    AppRoutes.cart,
    AppRoutes.vendor,
    AppRoutes.product,
  ];

  final router = GoRouter(
    navigatorKey: _rootKey,
    initialLocation: AppRoutes.welcome,
    refreshListenable: authNotifier,
    debugLogDiagnostics: false,
    redirect: (context, state) {
      final auth = authNotifier.state;
      if (auth.isRestoring) return null;
      final location = state.uri.path;
      final isAuthRoute = <String>[
        AppRoutes.welcome,
        AppRoutes.onboarding,
        AppRoutes.getStarted,
        AppRoutes.profileSetup,
        AppRoutes.locationPermission,
      ].contains(location);
      final isProtected = protectedPrefixes.any((p) => matches(location, p));

      if (auth.isAuthenticated) {
        final needsSetup = auth.user?.needsProfileSetup ?? false;
        if (needsSetup && location != AppRoutes.profileSetup) {
          final returnTo = state.uri.queryParameters['returnTo'];
          if (returnTo != null && returnTo.startsWith('/')) {
            return '${AppRoutes.profileSetup}?returnTo=${Uri.encodeComponent(returnTo)}';
          }
          return AppRoutes.profileSetup;
        }
        if (!needsSetup && isAuthRoute && location != AppRoutes.locationPermission) {
          final returnTo = state.uri.queryParameters['returnTo'];
          if (returnTo != null && returnTo.startsWith('/')) return returnTo;
          return AppRoutes.home;
        }
      } else if (isProtected) {
        return '${AppRoutes.getStarted}?returnTo=${Uri.encodeComponent(state.uri.toString())}';
      }
      return null;
    },
    routes: [
      // ── Onboarding & auth ─────────────────────────────────────────
      GoRoute(path: AppRoutes.welcome, name: 'welcome', builder: (c, s) => const WelcomeScreen()),
      GoRoute(path: AppRoutes.onboarding, name: 'onboarding', builder: (c, s) => const OnboardingScreen()),
      GoRoute(path: AppRoutes.getStarted, name: 'get-started', builder: (c, s) => const GetStartedScreen()),
      GoRoute(path: AppRoutes.profileSetup, name: 'profile-setup', builder: (c, s) => const ProfileSetupScreen()),
      GoRoute(
        path: AppRoutes.pinSetup,
        name: 'pin-setup',
        builder: (c, s) => const PinSetupPlaceholderScreen(),
      ),
      GoRoute(
        path: AppRoutes.locationPermission,
        name: 'location-permission',
        builder: (c, s) => LocationPermissionScreen(
          isGuest: s.uri.queryParameters['guest'] == '1',
        ),
      ),

      // ── Tabs ──────────────────────────────────────────────────────
      GoRoute(path: AppRoutes.home, name: 'home', builder: (c, s) => const HomeShell(initialTab: 0)),
      GoRoute(path: AppRoutes.orders, name: 'orders', builder: (c, s) => const HomeShell(initialTab: 1)),
      GoRoute(path: AppRoutes.profile, name: 'profile', builder: (c, s) => const HomeShell(initialTab: 2)),

      // ── Full-screen pushes ────────────────────────────────────────
      GoRoute(path: AppRoutes.search, name: 'search', builder: (c, s) => const SearchScreen()),
      GoRoute(
        path: AppRoutes.vendor,
        name: 'vendor',
        builder: (c, s) => VendorStoreScreen(vendorId: s.pathParameters['id']!),
      ),
      GoRoute(
        path: AppRoutes.product,
        name: 'product',
        builder: (c, s) => FoodDetailScreen(
          vendorId: s.pathParameters['vid']!,
          productId: s.pathParameters['pid']!,
        ),
      ),
      GoRoute(path: AppRoutes.cart, name: 'cart', builder: (c, s) => const CartScreen()),
      GoRoute(path: AppRoutes.checkout, name: 'checkout', builder: (c, s) => const CheckoutScreen()),
      GoRoute(
        path: AppRoutes.orderConfirm,
        name: 'order-confirm',
        builder: (c, s) => OrderConfirmationScreen(orderId: s.pathParameters['id']!),
      ),
      GoRoute(
        path: AppRoutes.orderTracking,
        name: 'order-tracking',
        builder: (c, s) => OrderTrackingScreen(orderId: s.pathParameters['id']!),
      ),
      GoRoute(
        path: AppRoutes.orderDetail,
        name: 'order-detail',
        builder: (c, s) => OrderDetailScreen(orderId: s.pathParameters['id']!),
      ),
      GoRoute(
        path: AppRoutes.rateOrder,
        name: 'rate-order',
        builder: (c, s) => RateReviewScreen(orderId: s.pathParameters['id']!),
      ),
      GoRoute(path: AppRoutes.notifications, name: 'notifications', builder: (c, s) => const NotificationsScreen()),
      GoRoute(path: AppRoutes.disputes, name: 'disputes', builder: (c, s) => const DisputesScreen()),
      GoRoute(path: AppRoutes.wallet, name: 'wallet', builder: (c, s) => const WalletScreen()),
      GoRoute(path: AppRoutes.vouchers, name: 'vouchers', builder: (c, s) => const VouchersScreen()),
      GoRoute(path: AppRoutes.referrals, name: 'referrals', builder: (c, s) => const ReferralScreen()),
      GoRoute(path: AppRoutes.addresses, name: 'addresses', builder: (c, s) => const SavedAddressesScreen()),
      GoRoute(path: AppRoutes.payments, name: 'payments', builder: (c, s) => const PaymentMethodsScreen()),
      GoRoute(path: AppRoutes.favourites, name: 'favourites', builder: (c, s) => const FavouritesScreen()),
      GoRoute(
        path: AppRoutes.chat,
        name: 'chat',
        builder: (c, s) => ChatScreen(
          orderId: s.uri.queryParameters['orderId'] ?? '',
          riderName: s.uri.queryParameters['peerName'] ?? 'Order chat',
          isSupport: s.uri.queryParameters['support'] == '1',
        ),
      ),
      GoRoute(path: AppRoutes.support, name: 'support', builder: (c, s) => const HelpSupportScreen()),
      GoRoute(path: AppRoutes.settings, name: 'settings', builder: (c, s) => const SettingsScreen()),
      GoRoute(path: AppRoutes.profileEdit, name: 'profile-edit', builder: (c, s) => const ProfileEditScreen()),
      GoRoute(path: AppRoutes.parcel, name: 'parcel', builder: (c, s) => const ParcelFlowScreen()),
      GoRoute(path: AppRoutes.errand, name: 'errand', builder: (c, s) => const ErrandFlowScreen()),
      GoRoute(path: AppRoutes.laundry, name: 'laundry', builder: (c, s) => const LaundryVendorsScreen()),
    ],
    errorBuilder: (c, s) => Scaffold(
      body: Center(child: Text('Route not found: ${s.uri}')),
    ),
  );
  return router;
});

/// Temporary placeholder until PIN setup screen is built.
class PinSetupPlaceholderScreen extends StatelessWidget {
  const PinSetupPlaceholderScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Security PIN')),
      body: const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'PIN setup is coming in a coming update. Your account remains protected by your phone number and OTP.',
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}
