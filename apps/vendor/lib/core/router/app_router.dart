import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../screens/splash_screen.dart';
import '../../screens/auth/vendor_login_screen.dart';
import '../../screens/dashboard/vendor_dashboard_screen.dart';
import '../../providers/auth/vendor_auth_provider.dart';
import '../../screens/dashboard/vendor_orders_tab.dart';
import '../../screens/orders/vendor_order_detail_screen.dart';
import '../../screens/orders/vendor_order_chat_screen.dart';
import '../../screens/menu/vendor_menu_tab.dart';
import '../../screens/menu/category_management_screen.dart';
import '../../screens/analytics/vendor_analytics_tab.dart';
import '../../screens/analytics/stories_hub_screen.dart';
import '../../screens/analytics/create_promotion_screen.dart';
import '../../screens/analytics/promotion_insights_screen.dart';
import '../../screens/settings/vendor_settings_tab.dart';
import '../../screens/settings/vendor_notifications_screen.dart';
import '../../screens/settings/edit_store_profile_screen.dart';
import '../../screens/settings/location_delivery_screen.dart';
import '../../screens/settings/documents_management_screen.dart';
import '../../screens/settings/vendor_locations_staff_screen.dart';
import '../../screens/settings/vendor_pos_screen.dart';
import '../../screens/settings/operating_hours_screen.dart';
import '../../screens/settings/preparation_time_settings_screen.dart';
import '../../screens/ratings/ratings_reviews_screen.dart';
import '../../screens/wallet/vendor_wallet_screen.dart';
import '../../screens/wallet/withdraw_funds_screen.dart';
import '../../screens/support/help_center_screen.dart';
import '../../screens/support/support_chat_screen.dart';
import '../../screens/onboarding/business_type_screen.dart';
import '../../screens/onboarding/business_information_screen.dart';
import '../../screens/onboarding/owner_information_screen.dart';
import '../../screens/onboarding/bank_details_screen.dart';
import '../../screens/onboarding/document_upload_screen.dart';
import '../../screens/onboarding/under_review_screen.dart';

class VendorRoutes {
  VendorRoutes._();
  static const splash = '/';
  static const login = '/login';
  static const dashboard = '/dashboard';
  static const orders = '/orders';
  static const orderDetail = '/orders/detail/:id';
  static const orderChat = '/orders/chat/:id';
  static const menu = '/menu';
  static const menuCategories = '/menu/categories';
  static const analytics = '/analytics';
  static const analyticsPromotion = '/analytics/promotion';
  static const analyticsPromotionInsights = '/analytics/promotion/:id/insights';
  static const analyticsStories = '/analytics/stories';
  static const settings = '/settings';
  static const settingsProfile = '/settings/profile';
  static const settingsHours = '/settings/hours';
  static const settingsDelivery = '/settings/delivery';
  static const settingsDocuments = '/settings/documents';
  static const settingsLocations = '/settings/locations';
  static const settingsPos = '/settings/pos';
  static const settingsPrep = '/settings/prep';
  static const notifications = '/settings/notifications';
  static const wallet = '/wallet';
  static const walletWithdraw = '/wallet/withdraw';
  static const ratings = '/ratings';
  static const support = '/support';
  static const supportChat = '/support/chat';
  static const onboardingType = '/onboarding/type';
  static const onboardingBusiness = '/onboarding/business';
  static const onboardingOwner = '/onboarding/owner';
  static const onboardingBank = '/onboarding/bank';
  static const onboardingDocs = '/onboarding/docs';
  static const onboardingReview = '/onboarding/review';
}

final vendorRouterProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(vendorAuthProvider);
  return GoRouter(
    initialLocation: VendorRoutes.splash,
    refreshListenable: auth,
    redirect: (context, state) {
      final location = state.matchedLocation;
      final isPublic = location == VendorRoutes.splash || location == VendorRoutes.login;
      if (!auth.isLoggedIn && !isPublic) return VendorRoutes.login;
      if (auth.isLoggedIn && location == VendorRoutes.login) return VendorRoutes.dashboard;
      return null;
    },
    routes: [
      GoRoute(path: VendorRoutes.splash, builder: (_, __) => const VendorSplashScreen()),
      GoRoute(path: VendorRoutes.login, builder: (_, __) => const VendorLoginScreen()),
      GoRoute(path: VendorRoutes.dashboard, builder: (_, __) => const VendorDashboardScreen()),
      GoRoute(path: VendorRoutes.orders, builder: (_, __) => const VendorOrdersTab()),
      GoRoute(path: VendorRoutes.orderDetail, builder: (_, state) => VendorOrderDetailScreen(orderId: state.pathParameters['id'] ?? '')),
      GoRoute(path: VendorRoutes.orderChat, builder: (_, state) => VendorOrderChatScreen(orderId: state.pathParameters['id'] ?? '')),
      GoRoute(path: VendorRoutes.menu, builder: (_, __) => const VendorMenuTab()),
      GoRoute(path: VendorRoutes.menuCategories, builder: (_, __) => const CategoryManagementScreen()),
      GoRoute(path: VendorRoutes.analytics, builder: (_, __) => const VendorAnalyticsTab()),
      GoRoute(path: VendorRoutes.analyticsPromotion, builder: (_, __) => const CreatePromotionScreen()),
      GoRoute(path: VendorRoutes.analyticsPromotionInsights, builder: (_, state) => PromotionInsightsScreen(promotionId: state.pathParameters['id'] ?? '')),
      GoRoute(path: VendorRoutes.analyticsStories, builder: (_, __) => const StoriesHubScreen()),
      GoRoute(path: VendorRoutes.settings, builder: (_, __) => const VendorSettingsTab()),
      GoRoute(path: VendorRoutes.settingsProfile, builder: (_, __) => const EditStoreProfileScreen()),
      GoRoute(path: VendorRoutes.settingsHours, builder: (_, __) => const OperatingHoursScreen()),
      GoRoute(path: VendorRoutes.settingsDelivery, builder: (_, __) => const LocationDeliveryScreen()),
      GoRoute(path: VendorRoutes.settingsDocuments, builder: (_, __) => const DocumentsManagementScreen()),
      GoRoute(path: VendorRoutes.settingsLocations, builder: (_, __) => const VendorLocationsStaffRouteScreen()),
      GoRoute(path: VendorRoutes.settingsPos, builder: (_, __) => const VendorPosRouteScreen()),
      GoRoute(path: VendorRoutes.settingsPrep, builder: (_, __) => const PreparationTimeSettingsScreen()),
      GoRoute(path: VendorRoutes.notifications, builder: (_, __) => const VendorNotificationsScreen()),
      GoRoute(path: VendorRoutes.wallet, builder: (_, __) => const VendorWalletScreen()),
      GoRoute(path: VendorRoutes.walletWithdraw, builder: (_, __) => const WithdrawFundsScreen()),
      GoRoute(path: VendorRoutes.ratings, builder: (_, __) => const RatingsReviewsScreen()),
      GoRoute(path: VendorRoutes.support, builder: (_, __) => const HelpCenterScreen()),
      GoRoute(path: VendorRoutes.supportChat, builder: (_, __) => const SupportChatScreen()),
      GoRoute(path: VendorRoutes.onboardingType, builder: (_, __) => const BusinessTypeScreen()),
      GoRoute(path: VendorRoutes.onboardingBusiness, builder: (_, __) => const BusinessInformationScreen()),
      GoRoute(path: VendorRoutes.onboardingOwner, builder: (_, __) => const OwnerInformationScreen()),
      GoRoute(path: VendorRoutes.onboardingBank, builder: (_, __) => const BankDetailsScreen()),
      GoRoute(path: VendorRoutes.onboardingDocs, builder: (_, __) => const DocumentUploadScreen()),
      GoRoute(path: VendorRoutes.onboardingReview, builder: (_, __) => const UnderReviewScreen()),
    ],
  );
});
