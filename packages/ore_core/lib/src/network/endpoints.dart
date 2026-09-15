/// Centralized API endpoint definitions aligned with the Ore API Gateway.
///
/// All paths are prefixed with /api/* as routed by the Fastify Gateway.
class OreEndpoints {
  OreEndpoints._();

  // ── Auth (Identity-First) ──────────────────────────────────────────
  static const String requestOtp = '/api/auth/request-otp';
  static const String verifyOtp = '/api/auth/verify-otp';
  static const String refresh = '/api/auth/refresh';
  static const String me = '/api/auth/me';
  static const String updateProfile = '/api/auth/profile';

  // ── Customer saved addresses (Auth service) ───────────────────────
  static const String customerAddresses = '/api/auth/customers/me/addresses';
  static String customerAddressById(String id) => '/api/auth/customers/me/addresses/$id';
  static String customerAddressDelete(String id) => '/api/auth/customers/me/addresses/$id/delete';

  // ── Onboarding & Staged Registration ──────────────────────────────
  static const String onboardingStatus = '/api/onboarding/applications/me/status';
  static const String onboardingDocuments = '/api/onboarding/applications/me/documents';
  static const String smileDocumentSubmission = '/api/onboarding/applications/me/smile/document';
  static const String vendorSmileDocumentSubmission = '/api/onboarding/applications/me/vendor/smile/document';
  static String riderStage(int stage) => '/api/onboarding/applications/rider/stage/$stage';
  static String vendorStage(int stage) => '/api/onboarding/applications/vendor/stage/$stage';
  static const String payoutProviders = '/api/onboarding/applications/payout/providers';
  static const String verifyPayout = '/api/onboarding/applications/payout/verify';
  static const String mediaUpload = '/api/onboarding/media/upload';
  static String mediaDocument(String documentId) => '/api/onboarding/media/documents/$documentId';

  // ── Catalog / Browse ───────────────────────────────────────────────
  static const String vendors = '/api/catalog/vendors';
  static const String searchItems = '/api/catalog/search/items';
  static const String vendorMe = '/api/catalog/vendors/me';
  static String vendorById(String id) => '/api/catalog/vendors/$id';
  static String vendorCategories(String id) => '/api/catalog/vendors/$id/categories';
  static String vendorCategory(String id, String category) => '/api/catalog/vendors/$id/categories/${Uri.encodeComponent(category)}';
  static String vendorMedia(String id, String kind) => '/api/catalog/vendors/$id/media/$kind';
  static String vendorLocations(String id) => '/api/catalog/vendors/$id/locations';
  static String vendorLocation(String vendorId, String locationId) => '/api/catalog/vendors/$vendorId/locations/$locationId';
  static String vendorLocationDeactivate(String vendorId, String locationId) => '/api/catalog/vendors/$vendorId/locations/$locationId/deactivate';
  static String vendorStaff(String id) => '/api/catalog/vendors/$id/staff';
  static String vendorStaffMember(String vendorId, String staffId) => '/api/catalog/vendors/$vendorId/staff/$staffId';
  static String vendorPos(String vendorId) => '/api/catalog/vendors/$vendorId/pos';
  static String vendorPosDisconnect(String vendorId) => '/api/catalog/vendors/$vendorId/pos/disconnect';
  static const String vendorAnalytics = '/api/catalog/vendors/me/analytics';
  static String vendorItems(String id) => '/api/catalog/vendors/$id/items';
  static String itemById(String id) => '/api/catalog/items/$id';
  static String itemMedia(String id) => '/api/catalog/items/$id/media';
  static const String stories = '/api/catalog/stories';
  static String vendorStoryMedia(String id) => '/api/catalog/vendors/$id/stories/media';
  static String vendorStories(String id) => '/api/catalog/vendors/$id/stories';
  static String vendorPromotions(String id) => '/api/catalog/vendors/$id/promotions';
  static String vendorActivePromotions(String id) => '/api/catalog/vendors/$id/promotions/active';
  static String vendorPromotion(String vendorId, String promotionId) => '/api/catalog/vendors/$vendorId/promotions/$promotionId';
  static String vendorPromotionAnalytics(String vendorId, String promotionId) => '/api/catalog/vendors/$vendorId/promotions/$promotionId/analytics';
  static const String createReview = '/api/catalog/reviews';
  static String vendorReviews(String vendorId) => '/api/catalog/vendors/$vendorId/reviews';
  static String reviewResponse(String reviewId) => '/api/catalog/reviews/$reviewId/response';

  // ── Cart & Checkout ────────────────────────────────────────────────
  static const String cart = '/api/cart';
  static const String cartEstimate = '/api/cart/estimate';
  static const String cartItems = '/api/cart/items';
  static const String cartCheckout = '/api/cart/checkout';
  static const String cartReorder = '/api/cart/reorder';
  static const String customerFavourites = '/api/catalog/customers/me/favourites';
  static String customerFavouriteRemove(String vendorId) =>
      '/api/catalog/customers/me/favourites/${Uri.encodeComponent(vendorId)}/remove';
  static const String customerVouchers = '/api/catalog/vouchers/me';
  static const String redeemVoucher = '/api/catalog/vouchers/redeem';

  // ── Orders ─────────────────────────────────────────────────────────
  static const String orders = '/api/order/orders';
  static String vendorOrders(String vendorId) => '/api/order/vendors/$vendorId/orders';
  static String acceptOrder(String id) => '/api/order/orders/$id/accept';
  static String rejectOrder(String id) => '/api/order/orders/$id/reject';
  static String readyOrder(String id) => '/api/order/orders/$id/ready';
  static String delayOrder(String id) => '/api/order/orders/$id/delayed';
  static String marketFulfillment(String id) => '/api/order/orders/$id/market-fulfillment';
  static String laundryStage(String id) => '/api/order/orders/$id/laundry-stage';
  static String laundryCondition(String id) => '/api/order/orders/$id/laundry-condition';
  static String laundryConditionPhotos(String id) => '/api/order/orders/$id/laundry-condition/photos';
  static String orderIssues(String id) => '/api/order/orders/$id/issues';
  static String orderIssue(String orderId, String issueId) => '/api/order/orders/$orderId/issues/$issueId';
  static String prescription(String id) => '/api/order/orders/$id/prescription';
  static String approvePrescription(String id) => '/api/order/orders/$id/prescription/approve';
  static String rejectPrescription(String id) => '/api/order/orders/$id/prescription/reject';
  static const String riderOrders = '/api/order/riders/me/orders';
  static const String customerOrders = '/api/order/customers/me/orders';
  static const String createParcel = '/api/order/orders/parcels';
  static const String createErrand = '/api/order/orders/errands';
  static String errandSubstitutionDecision(String orderId) => '/api/order/orders/$orderId/errand/substitution-decision';
  static String orderById(String id) => '/api/order/orders/$id';
  static String orderOtp(String id) => '/api/order/orders/$id/otp';
  static String cancelOrder(String id) => '/api/order/orders/$id/cancel';
  static String confirmDeliveryOtp(String id) => '/api/order/orders/$id/confirm-otp';
  static String customerRevealOrderOtp(String id) => '/api/order/orders/$id/otp';
  static String deliveryProof(String id) => '/api/order/orders/$id/delivery-proof';
  static String deliverySignature(String id) => '/api/order/orders/$id/delivery-signature';
  static String errandShopping(String id) => '/api/order/orders/$id/errand/shopping';
  static String errandReceipt(String id) => '/api/order/orders/$id/errand/receipt';
  static String errandSubstitution(String id) => '/api/order/orders/$id/errand/substitution';
  static String errandReadyForDelivery(String id) => '/api/order/orders/$id/errand/ready-for-delivery';

  // ── Dispatch (Rider) ───────────────────────────────────────────────
  static const String registerRider = '/api/dispatch/riders';
  static const String riderProfile = '/api/dispatch/riders/me';
  static const String riderAvailability = '/api/dispatch/riders/me/availability';
  static const String riderPause = '/api/dispatch/riders/me/pause';
  static const String riderResume = '/api/dispatch/riders/me/resume';
  static const String riderIncidents = '/api/dispatch/riders/me/incidents';
  static const String riderSessionExtend = '/api/dispatch/riders/me/session/extend';
  static const String riderOffers = '/api/dispatch/riders/me/offers';
  static const String riderTasks = '/api/dispatch/riders/me/tasks';
  static const String riderDemandZones = '/api/dispatch/riders/me/demand-zones';
  static const String riderPeakPay = '/api/dispatch/riders/me/peak-pay';
  static const String riderBlocks = '/api/dispatch/riders/me/blocks';
  static String riderBlock(String id) => '/api/dispatch/riders/me/blocks/${Uri.encodeComponent(id)}';
  static const String riderPerformance = '/api/dispatch/riders/me/performance';
  static String acceptOffer(String offerId) => '/api/dispatch/offers/$offerId/accept';
  static String declineOffer(String offerId) => '/api/dispatch/offers/$offerId/decline';
  static String pickedUp(String orderId) => '/api/dispatch/orders/$orderId/picked-up';
  static String errandArrivedAtShop(String orderId) => '/api/dispatch/orders/$orderId/errand-arrived';
  static String laundryHandoff(String orderId) => '/api/dispatch/orders/$orderId/laundry-handoff';
  static String riderRelease(String orderId) => '/api/dispatch/orders/$orderId/release';

  // ── Tracking ───────────────────────────────────────────────────────
  static String orderTracking(String orderId) => '/api/tracking/orders/$orderId/rider';
  static const String updateLocation = '/api/tracking/rider/location';
  /// Geocode a manual address — google, what3words, or Ghana GPS. Public (no auth).
  static const String geoResolve = '/api/tracking/geocode';
  /// Google Places autocomplete suggestions. Public (no auth).
  static const String placesAutocomplete = '/api/tracking/places/autocomplete';
  /// Resolve a Google placeId to lat/lng. Public (no auth).
  static const String placeDetails = '/api/tracking/places/details';

  /// Engine.IO path on the API gateway. Pair with [trackingSocketNamespace].
  static const String trackingSocketPath = '/api/tracking/socket.io';
  /// Socket.IO namespace. Connect `io('$apiBase$trackingSocketNamespace', { path: trackingSocketPath })`.
  static const String trackingSocketNamespace = '/tracking';

  // ── Comms (order threads + Ore Support) ────────────────────────────
  static const String commsThreads = '/api/comms/threads';
  static String commsThread(String id) => '/api/comms/threads/$id';
  static String commsThreadMessages(String id) => '/api/comms/threads/$id/messages';
  /// Engine.IO path on the API gateway. Pair with [commsSocketNamespace].
  static const String commsSocketPath = '/api/comms/socket.io';
  /// Socket.IO namespace. Connect `io('$apiBase$commsSocketNamespace', { path: commsSocketPath })`.
  static const String commsSocketNamespace = '/comms';
  static const String commsVoiceToken = '/api/comms/voice/token';
  static const String commsCalls = '/api/comms/calls';
  /// Support VoIP call (no order context) — rings online agents, forwards to
  /// the agent mobile, then voicemail. Body: {platform?, topic?}.
  static const String commsSupportCall = '/api/comms/voice/support';
  /// What support screens render instead of hardcoded numbers: {phone, appCallingEnabled}.
  static const String commsSupportContact = '/api/comms/support/contact';
  /// Client-reported call events (fallback handoffs never reach Twilio).
  static String commsCallEvents(String callId) => '/api/comms/calls/$callId/events';

  // ── Payments & Ledger ──────────────────────────────────────────────
  static const String riderRemit = '/api/ledger/riders/me/remit';
  static const String riderWallet = '/api/ledger/wallet/me';
  static const String customerCredit = '/api/ledger/customers/me/credit';
  static const String customerLoyalty = '/api/ledger/customers/me/loyalty';
  static const String redeemLoyalty = '/api/ledger/customers/me/loyalty/redeem';
  static const String customerWalletTopUp = '/api/payment/payments/wallet/top-up';
  static String customerWalletTopUpByRef(String reference) =>
      '/api/payment/payments/wallet/top-up/${Uri.encodeComponent(reference)}';
  static const String customerDisputes = '/api/ledger/disputes/me';
  static const String openCustomerDispute = '/api/ledger/disputes';

  // ── Referrals ──────────────────────────────────────────────────────
  static const String customerReferral = '/api/referral/me';
  static const String customerReferrals = '/api/referral/mine';
  static const String claimReferral = '/api/referral/claim';

  static const String riderWalletStatement = '/api/ledger/wallet/me/statement';
  static const String riderWithdrawals = '/api/ledger/wallet/me/withdrawals';
  static const String vendorWallet = '/api/ledger/vendors/me/balance';
  static const String vendorWalletStatement = '/api/ledger/vendors/me/statement';
  static const String vendorWithdrawals = '/api/ledger/vendors/me/withdrawals';

  // ── Notifications ──────────────────────────────────────────────────
  static const String notificationsMe = '/api/notifications/me';
  static const String notificationsDeviceToken = '/api/notifications/device-token';
  static String notificationRead(String id) => '/api/notifications/$id/read';
}
