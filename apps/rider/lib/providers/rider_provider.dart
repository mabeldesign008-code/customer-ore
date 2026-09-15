import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geolocator_android/geolocator_android.dart';
import 'package:geolocator_apple/geolocator_apple.dart';
import 'package:latlong2/latlong.dart';
import 'package:ore_core/ore_core.dart';
import 'package:permission_handler/permission_handler.dart';

import '../data/auth/rider_api_client_provider.dart';
import '../data/dispatch/rider_dispatch_repository.dart';
import '../data/dispatch/rider_demand_repository.dart';
import '../data/tracking/rider_tracking_repository.dart';
import '../data/order/rider_order_repository.dart';
import '../data/auth/rider_auth_repository.dart';
import '../data/auth/rider_token_storage.dart';

ServiceType _serviceFromCode(String code) {
  switch (code.trim().toUpperCase()) {
    case 'FO': return ServiceType.food;
    case 'GR': return ServiceType.groceries;
    case 'MK': return ServiceType.market;
    case 'PH': return ServiceType.pharmacy;
    case 'SH': return ServiceType.shop;
    case 'LD': return ServiceType.laundry;
    case 'PR': return ServiceType.parcel;
    case 'ER': return ServiceType.errand;
    default:
      return ServiceType.values.firstWhere(
        (value) => value.name == code.toLowerCase(),
        orElse: () => ServiceType.food,
      );
  }
}

List<String> _itemPreview(List<RiderOrderItemSummary> items) {
  return items.map((item) {
    final options = item.selectedOptions
        .map((option) => option['optionName'])
        .whereType<String>()
        .where((name) => name.trim().isNotEmpty)
        .join(', ');
    final suffix = options.isEmpty ? '' : ' · $options';
    return '${item.qty}× ${item.name}$suffix';
  }).toList(growable: false);
}

List<String> _operationalFlags({
  RiderPharmacyContext? pharmacy,
  RiderMarketContext? market,
  RiderLaundryContext? laundry,
  RiderErrandContext? errand,
}) {
  final flags = <String>[];
  if (pharmacy != null) flags.add(pharmacy.operationalFlag);
  if (market?.fulfillmentRecorded == true) flags.add('MEASURED_FULFILMENT_RECORDED');
  if (laundry?.packageSealed == true) flags.add('SEALED_RETURN_PACKAGE');
  if (laundry?.leg != null) flags.add('LAUNDRY_${laundry!.leg}');
  if (errand != null) flags.add('ERRAND_${errand.errandStatus}');
  if (errand?.substitution?['status'] == 'PENDING') flags.add('SUBSTITUTION_PENDING');
  return flags;
}

// ── Rider identity ───────────────────────────────────────────────────

class RiderProfile {
  final String id;
  /// Auth user id (JWT `sub`). [id] becomes the Dispatch profile id after hydrate.
  final String userId;
  final String name;
  final String phone;
  final double rating;
  final int totalTrips;
  final String? photoUrl;
  final String vehicle;
  final String plate;
  final bool documentsVerified;
  final double reliabilityScore;
  final int declineCount;
  final String? codTier;
  final String? codStatus;
  const RiderProfile({
    required this.id,
    required this.userId,
    required this.name,
    required this.phone,
    required this.rating,
    required this.totalTrips,
    required this.vehicle,
    required this.plate,
    this.photoUrl,
    this.documentsVerified = false,
    this.reliabilityScore = 1,
    this.declineCount = 0,
    this.codTier,
    this.codStatus,
  });
}

class RiderAuthState {
  final bool isLoggedIn;
  final RiderProfile? rider;
  const RiderAuthState({this.isLoggedIn = false, this.rider});
  RiderAuthState copyWith({bool? isLoggedIn, RiderProfile? rider}) =>
      RiderAuthState(isLoggedIn: isLoggedIn ?? this.isLoggedIn, rider: rider ?? this.rider);
}

class RiderAuthNotifier extends ChangeNotifier {
  RiderAuthNotifier(this._tokenStorage, this._authRepository);

  final RiderTokenStorage _tokenStorage;
  final RiderAuthRepository _authRepository;
  bool _restoreAttempted = false;
  RiderAuthState _state = const RiderAuthState();
  RiderAuthState get state => _state;
  bool get isLoggedIn => _state.isLoggedIn;

  final StreamController<RiderAuthState> _controller = StreamController.broadcast();
  Stream<RiderAuthState> get stream => _controller.stream;

  void setAuthenticated(RiderAuthenticatedUser user) {
    _state = RiderAuthState(
      isLoggedIn: true,
      rider: RiderProfile(
        id: user.id,
        userId: user.id,
        name: user.name ?? 'Rider',
        phone: user.phone,
        rating: 0,
        totalTrips: 0,
        vehicle: 'Not set',
        plate: 'Not set',
        documentsVerified: false,
      ),
    );
    _controller.add(_state);
    notifyListeners();
  }

  void setDispatchProfile(RiderDispatchProfile profile) {
    final existing = _state.rider;
    if (existing == null) return;
    _state = RiderAuthState(
      isLoggedIn: true,
      rider: RiderProfile(
        id: profile.id,
        userId: existing.userId.isNotEmpty ? existing.userId : existing.id,
        name: profile.name,
        phone: profile.phone,
        rating: profile.rating,
        totalTrips: profile.completedDeliveries,
        vehicle: profile.vehicle,
        plate: profile.licensePlate ?? existing.plate,
        photoUrl: existing.photoUrl,
        documentsVerified: profile.verified,
        reliabilityScore: profile.reliabilityScore,
        declineCount: profile.declineCount,
        codTier: profile.codTier,
        codStatus: profile.codStatus,
      ),
    );
    _controller.add(_state);
    notifyListeners();
  }

  /// Restores a saved session only after the backend validates the access
  /// token. Network failures leave the token pair intact for a later retry,
  /// while an invalid session is cleared.
  Future<void> restoreSession() async {
    if (_restoreAttempted) return;
    _restoreAttempted = true;

    try {
      final storedTokens = await _tokenStorage.read();
      if (storedTokens == null) return;

      final user = await _authRepository.getCurrentUser();
      setAuthenticated(user);
    } on DioException catch (error) {
      final statusCode = error.response?.statusCode;
      if (statusCode == 401 || statusCode == 403) {
        await _clearStoredSession();
      }
    } on FormatException {
      await _clearStoredSession();
    } catch (_) {
      // Do not fabricate an authenticated state when secure storage or the
      // platform layer fails. The next explicit login can try again.
    }
  }

  Future<void> _clearStoredSession() async {
    try {
      await _tokenStorage.clear();
    } catch (_) {
      // Best effort cleanup; the current in-memory state remains logged out.
    }
  }

  Future<void> logout() async {
    await _tokenStorage.clear();
    _state = const RiderAuthState();
    _controller.add(_state);
    notifyListeners();
  }

  @override
  void dispose() {
    _controller.close();
    super.dispose();
  }
}

final riderAuthProvider = ChangeNotifierProvider<RiderAuthNotifier>((ref) {
  return RiderAuthNotifier(
    ref.watch(riderTokenStorageProvider),
    ref.watch(riderAuthRepositoryProvider),
  );
});

class RiderPositioningNotifier extends ChangeNotifier {
  RiderPositioningNotifier(this._repository);

  final RiderDemandRepository _repository;
  RiderDemandZones? _data;
  bool _loading = false;
  String? _error;
  Timer? _refreshTimer;

  RiderDemandZones? get data => _data;
  bool get loading => _loading;
  String? get error => _error;
  RiderDemandZone? get bestZone => _data?.zones.where((zone) => !zone.isStale).firstOrNull;

  void start() {
    if (_refreshTimer != null) return;
    unawaited(refresh());
    _refreshTimer = Timer.periodic(const Duration(minutes: 5), (_) => unawaited(refresh()));
  }

  void stop() {
    _refreshTimer?.cancel();
    _refreshTimer = null;
    _data = null;
    _error = null;
    notifyListeners();
  }

  Future<void> refresh() async {
    if (_loading) return;
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final data = await _repository.getDemandZones();
      _data = data.isStale ? null : data;
    } catch (_) {
      _error = 'Positioning recommendations are temporarily unavailable.';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }
}

final riderPositioningProvider = ChangeNotifierProvider<RiderPositioningNotifier>((ref) {
  return RiderPositioningNotifier(ref.watch(riderDemandRepositoryProvider));
});

// ── Online/offline status ───────────────────────────────────────────

class OnlineStatus {
  final bool isOnline;
  final bool isPaused;
  final DateTime? pausedUntil;
  final DateTime? sessionEndsAt;
  final String? offlineReason;
  final String? locationWarning;
  const OnlineStatus({this.isOnline = false, this.isPaused = false, this.pausedUntil, this.sessionEndsAt, this.offlineReason, this.locationWarning});
}

class OnlineNotifier extends ChangeNotifier {
  OnlineNotifier(this._dispatchRepository, this._locationNotifier, this._positioningNotifier);

  final RiderDispatchRepository _dispatchRepository;
  final RiderLocationNotifier _locationNotifier;
  final RiderPositioningNotifier _positioningNotifier;
  OnlineStatus _status = const OnlineStatus();
  OnlineStatus get status => _status;
  bool get isOnline => _status.isOnline;
  bool get isPaused => _status.isPaused;
  DateTime? get pausedUntil => _status.pausedUntil;
  DateTime? get sessionEndsAt => _status.sessionEndsAt;
  String? get locationWarning => _status.locationWarning;

  void hydrate(RiderDispatchProfile profile) {
    final normalized = profile.status.toUpperCase();
    final available = normalized == 'AVAILABLE';
    final paused = normalized == 'PAUSED';
    _status = OnlineStatus(isOnline: available, isPaused: paused, pausedUntil: profile.pausedUntil, sessionEndsAt: profile.sessionEndsAt);
    notifyListeners();
    if (available) {
      unawaited(_startIdleTracking());
      _positioningNotifier.start();
    }
  }

  Future<void> goOnline() async {
    final profile = await _dispatchRepository.setAvailability(available: true);
    _status = OnlineStatus(isOnline: true, sessionEndsAt: profile.sessionEndsAt);
    notifyListeners();
    _positioningNotifier.start();
    await _startIdleTracking();
  }

  Future<void> _startIdleTracking() async {
    if (_locationNotifier.moving && !_locationNotifier.isIdle) return;
    try {
      await _locationNotifier.startIdleTracking();
      if (_status.locationWarning != null) {
        _status = OnlineStatus(isOnline: _status.isOnline, isPaused: _status.isPaused, pausedUntil: _status.pausedUntil, sessionEndsAt: _status.sessionEndsAt, offlineReason: _status.offlineReason);
        notifyListeners();
      }
    } catch (_) {
      // Availability remains server-authoritative, but the UI records that
      // positioning is unavailable rather than pretending demand data is fresh.
      _status = OnlineStatus(
        isOnline: _status.isOnline,
        offlineReason: _status.offlineReason,
        locationWarning: 'Location permission is needed for positioning recommendations.',
      );
      notifyListeners();
    }
  }

  Future<void> pause({int minutes = 30}) async {
    final profile = await _dispatchRepository.pause(minutes: minutes);
    _locationNotifier.stop();
    _positioningNotifier.stop();
    _status = OnlineStatus(isPaused: true, pausedUntil: profile.pausedUntil, sessionEndsAt: profile.sessionEndsAt);
    notifyListeners();
  }

  Future<void> resume() async {
    final profile = await _dispatchRepository.resume();
    _status = OnlineStatus(isOnline: true, sessionEndsAt: profile.sessionEndsAt);
    notifyListeners();
    _positioningNotifier.start();
    await _startIdleTracking();
  }

  Future<void> extendSession({int minutes = 60}) async {
    final profile = await _dispatchRepository.extendSession(minutes: minutes);
    _status = OnlineStatus(
      isOnline: _status.isOnline,
      isPaused: _status.isPaused,
      pausedUntil: _status.pausedUntil,
      sessionEndsAt: profile.sessionEndsAt,
      offlineReason: _status.offlineReason,
      locationWarning: _status.locationWarning,
    );
    notifyListeners();
  }

  Future<void> goOffline({String reason = 'Taking a break'}) async {
    await _dispatchRepository.setAvailability(available: false);
    _locationNotifier.stop();
    _positioningNotifier.stop();
    _status = OnlineStatus(isOnline: false, offlineReason: reason);
    notifyListeners();
  }
}

final onlineProvider = ChangeNotifierProvider<OnlineNotifier>((ref) {
  return OnlineNotifier(
    ref.watch(riderDispatchRepositoryProvider),
    ref.watch(riderLocationProvider),
    ref.watch(riderPositioningProvider),
  );
});

// ── Delivery trip / order model ─────────────────────────────────────

/// Rider-side view of a delivery. Works for catalogue-based orders (with a vendor)
/// AND request-based services (parcel/errand — pickup is a customer address).
class RiderTrip {
  final String id;
  final String? dispatchOfferId;
  final ServiceType service;
  final String pickupLabel;
  final String pickupAddress;
  final LatLng pickupPoint;
  final String dropoffLabel;
  final String dropoffAddress;
  final LatLng dropoffPoint;
  final String customerName;
  final String customerPhone;
  final String? vendorName;
  final String? vendorLocationId;
  final String? vendorLocationName;
  final List<String> itemsPreview;
  final List<String> operationalFlags;
  final RiderErrandContext? errand;
  final RiderParcelContext? parcel;
  final String? vendorReadiness;
  final int? pickupWindowMin;
  final int pickupCount;
  final int dropCount;
  final List<RiderRouteStop> routeStops;
  final double payout;
  final int peakPayPesewas;
  final double totalDistanceKm;
  final OrderStatus status;
  final bool hasCod;      // cash-on-delivery rider must collect
  final double? codAmount;
  final String? customerNote;
  final bool leaveAtDoor;
  final String? dropNote;
  final DateTime? scheduledFor;
  final bool signatureRequired;
  final DateTime createdAt;
  final DateTime? expiresAt;
  final int? acceptanceWindowSec;

  const RiderTrip({
    required this.id,
    this.dispatchOfferId,
    required this.service,
    required this.pickupLabel,
    required this.pickupAddress,
    required this.pickupPoint,
    required this.dropoffLabel,
    required this.dropoffAddress,
    required this.dropoffPoint,
    required this.customerName,
    required this.customerPhone,
    required this.itemsPreview,
    required this.payout,
    this.peakPayPesewas = 0,
    required this.totalDistanceKm,
    required this.status,
    required this.createdAt,
    this.vendorName,
    this.vendorLocationId,
    this.vendorLocationName,
    this.operationalFlags = const <String>[],
    this.errand,
    this.parcel,
    this.vendorReadiness,
    this.pickupWindowMin,
    this.pickupCount = 1,
    this.dropCount = 1,
    this.routeStops = const <RiderRouteStop>[],
    this.hasCod = false,
    this.codAmount,
    this.customerNote,
    this.leaveAtDoor = false,
    this.dropNote,
    this.scheduledFor,
    this.signatureRequired = false,
    this.expiresAt,
    this.acceptanceWindowSec,
  });

  bool get isExpired =>
      expiresAt != null && !expiresAt!.isAfter(DateTime.now());

  Duration get remainingAcceptance {
    if (expiresAt != null) {
      final left = expiresAt!.difference(DateTime.now());
      return left.isNegative ? Duration.zero : left;
    }
    final seconds = acceptanceWindowSec;
    if (seconds != null && seconds > 0) return Duration(seconds: seconds);
    return Duration.zero;
  }

  /// 5-step rider journey.
  int get riderStep {
    switch (status) {
      case OrderStatus.riderAssigned:
        return 1;
      case OrderStatus.arrivedAtPickup:
        return 2;
      case OrderStatus.pickedUp:
        return 3;
      case OrderStatus.arrivedAtDropoff:
        return 4;
      case OrderStatus.delivered:
        return 5;
      default:
        return 1;
    }
  }

  RiderTrip copyWithStatus(OrderStatus s, {RiderErrandContext? errandContext, RiderParcelContext? parcelContext}) => RiderTrip(
        id: id,
        dispatchOfferId: dispatchOfferId,
        service: service,
        pickupLabel: pickupLabel,
        pickupAddress: pickupAddress,
        pickupPoint: pickupPoint,
        dropoffLabel: dropoffLabel,
        dropoffAddress: dropoffAddress,
        dropoffPoint: dropoffPoint,
        customerName: customerName,
        customerPhone: customerPhone,
        vendorName: vendorName,
        vendorLocationId: vendorLocationId,
        vendorLocationName: vendorLocationName,
        itemsPreview: itemsPreview,
        operationalFlags: operationalFlags,
        errand: errandContext ?? errand,
        parcel: parcelContext ?? parcel,
        vendorReadiness: vendorReadiness,
        pickupWindowMin: pickupWindowMin,
        pickupCount: pickupCount,
        dropCount: dropCount,
        routeStops: routeStops,
        payout: payout,
        peakPayPesewas: peakPayPesewas,
        totalDistanceKm: totalDistanceKm,
        status: s,
        createdAt: createdAt,
        hasCod: hasCod,
        codAmount: codAmount,
        customerNote: customerNote,
        leaveAtDoor: leaveAtDoor,
        dropNote: dropNote,
        scheduledFor: scheduledFor,
        signatureRequired: signatureRequired,
        expiresAt: expiresAt,
        acceptanceWindowSec: acceptanceWindowSec,
      );

  RiderTrip copyWithCustomer({String? name, String? phone}) => RiderTrip(
        id: id,
        dispatchOfferId: dispatchOfferId,
        service: service,
        pickupLabel: pickupLabel,
        pickupAddress: pickupAddress,
        pickupPoint: pickupPoint,
        dropoffLabel: dropoffLabel,
        dropoffAddress: dropoffAddress,
        dropoffPoint: dropoffPoint,
        customerName: name ?? customerName,
        customerPhone: phone ?? customerPhone,
        vendorName: vendorName,
        vendorLocationId: vendorLocationId,
        vendorLocationName: vendorLocationName,
        itemsPreview: itemsPreview,
        operationalFlags: operationalFlags,
        errand: errand,
        parcel: parcel,
        vendorReadiness: vendorReadiness,
        pickupWindowMin: pickupWindowMin,
        pickupCount: pickupCount,
        dropCount: dropCount,
        routeStops: routeStops,
        payout: payout,
        peakPayPesewas: peakPayPesewas,
        totalDistanceKm: totalDistanceKm,
        status: status,
        createdAt: createdAt,
        hasCod: hasCod,
        codAmount: codAmount,
        customerNote: customerNote,
        leaveAtDoor: leaveAtDoor,
        dropNote: dropNote,
        scheduledFor: scheduledFor,
        signatureRequired: signatureRequired,
        expiresAt: expiresAt,
        acceptanceWindowSec: acceptanceWindowSec,
      );
}

// ── Trips state ─────────────────────────────────────────────────────

class TripsState {
  final RiderTrip? currentTrip;
  final List<RiderTrip> incomingOffers;
  final List<RiderTrip> history;
  const TripsState({this.currentTrip, this.incomingOffers = const [], this.history = const []});

  /// `null` means "keep the existing trip" for ordinary copyWith calls.
  /// Pass [clearCurrentTrip] when a completed/cancelled backend task must be
  /// removed from state.
  TripsState copyWith({
    RiderTrip? currentTrip,
    bool clearCurrentTrip = false,
    List<RiderTrip>? incomingOffers,
    List<RiderTrip>? history,
  }) {
    return TripsState(
      currentTrip: clearCurrentTrip ? null : currentTrip ?? this.currentTrip,
      incomingOffers: incomingOffers ?? this.incomingOffers,
      history: history ?? this.history,
    );
  }
}

class TripsNotifier extends ChangeNotifier {
  TripsNotifier(this._dispatchRepository, this._orderRepository)
      : _state = const TripsState();

  final RiderDispatchRepository _dispatchRepository;
  final RiderOrderRepository _orderRepository;
  bool _historyLoaded = false;
  TripsState _state;
  TripsState get state => _state;

  // Convenience getters so consumers can write trips.currentTrip etc.
  RiderTrip? get currentTrip => _state.currentTrip;
  List<RiderTrip> get incomingOffers => _state.incomingOffers;
  List<RiderTrip> get history => _state.history;

  Timer? _offerPollTimer;
  bool _pollInFlight = false;

  void setPollingEnabled(bool enabled) {
    if (enabled) {
      if (_offerPollTimer != null) return;
      _pollOffers();
      _offerPollTimer = Timer.periodic(
        const Duration(seconds: 5),
        (_) => _pollOffers(),
      );
    } else {
      _offerPollTimer?.cancel();
      _offerPollTimer = null;
      if (_state.incomingOffers.isNotEmpty) {
        _state = _state.copyWith(incomingOffers: const <RiderTrip>[]);
        notifyListeners();
      }
    }
  }

  Future<void> _pollOffers() async {
    if (_pollInFlight) return;
    _pollInFlight = true;
    try {
      final offers = await _dispatchRepository.getPendingOffers();
      final previousIds = _state.incomingOffers
          .map((offer) => offer.dispatchOfferId ?? offer.id)
          .toSet();
      final now = DateTime.now();
      final trips = offers
          .map(_toRiderTrip)
          .where((trip) => trip.expiresAt == null || !trip.expiresAt!.isBefore(now))
          .toList();
      _state = _state.copyWith(incomingOffers: trips);
      notifyListeners();
      if (offers.any((offer) => !previousIds.contains(offer.id))) {
        HapticFeedback.mediumImpact();
      }
    } catch (_) {
      // Polling failures are transient; the next interval retries without
      // changing the current backend-backed offer state.
    } finally {
      _pollInFlight = false;
    }
  }

  Future<void> restoreActiveTask() async {
    if (_state.currentTrip != null) return;
    try {
      final task = await _dispatchRepository.getActiveTask();
      final order = task.currentOrder;
      if (order == null) return;
      var trip = _taskToRiderTrip(order);
      try {
        final status = await _orderRepository.getOrderStatus(order.orderId);
        trip = trip.copyWithStatus(OrderStatus.fromApi(status.status), errandContext: status.errand, parcelContext: status.parcel);
        trip = trip.copyWithCustomer(
          name: status.customerName,
          phone: status.customerPhone,
        );
      } catch (_) {
        // Dispatch task data remains a valid fallback if Order is temporarily unavailable.
      }
      _state = _state.copyWith(currentTrip: trip);
      notifyListeners();
    } catch (_) {
      // App startup remains usable if dispatch is temporarily unavailable.
    }
  }

  Future<void> loadHistory() async {
    if (_historyLoaded) return;
    _historyLoaded = true;
    try {
      final rows = await _orderRepository.getHistory();
      final history = rows.map(_historyToRiderTrip).toList();
      _state = _state.copyWith(history: history);
      notifyListeners();
    } catch (_) {
      _historyLoaded = false;
    }
  }

  RiderTrip _historyToRiderTrip(RiderHistoryOrder order) {
    final service = _serviceFromCode(order.serviceCode);
    return RiderTrip(
      id: order.orderId,
      service: service,
      pickupLabel: order.pickupLabel ?? order.vendorName,
      pickupAddress: order.pickupAddress ?? 'Address unavailable',
      pickupPoint: order.pickupLat != null && order.pickupLng != null
          ? LatLng(order.pickupLat!, order.pickupLng!)
          : const LatLng(0, 0),
      dropoffLabel: 'Customer drop-off',
      dropoffAddress: order.dropoffLabel,
      dropoffPoint: LatLng(order.dropoffLat, order.dropoffLng),
      customerName: 'Customer',
      customerPhone: '',
      itemsPreview: order.itemsPreview,
      payout: (order.riderFeePesewas + order.tipPesewas + order.peakPayPesewas) / 100,
      peakPayPesewas: order.peakPayPesewas,
      totalDistanceKm: 0,
      status: OrderStatus.fromApi(order.status),
      createdAt: order.completedAt,
    );
  }

  RiderTrip _taskToRiderTrip(RiderActiveOrder order) {
    final service = _serviceFromCode(order.serviceCode);
    return RiderTrip(
      id: order.orderId,
      service: service,
      pickupLabel: order.vendorLocationName ?? order.vendorName,
      pickupAddress: order.pickupAddress ?? 'Address unavailable',
      pickupPoint: LatLng(order.vendorLat, order.vendorLng),
      dropoffLabel: order.parcel?.recipientName ?? 'Customer drop-off',
      dropoffAddress: order.dropAddress,
      dropoffPoint: LatLng(order.dropLat, order.dropLng),
      customerName: 'Customer',
      customerPhone: order.customerPhone ?? '',
      vendorName: order.vendorName,
      vendorLocationId: order.vendorLocationId,
      vendorLocationName: order.vendorLocationName,
      itemsPreview: _itemPreview(order.items),
      operationalFlags: _operationalFlags(
        pharmacy: order.pharmacy,
        market: order.market,
        laundry: order.laundry,
        errand: order.errand,
      ),
      errand: order.errand,
      parcel: order.parcel,
      vendorReadiness: null,
      pickupCount: order.stops.where((stop) => stop.kind.contains('PICKUP') || stop.kind == 'LAUNDRY_COLLECTION').length.clamp(1, 999).toInt(),
      dropCount: order.stops.where((stop) => stop.kind.contains('DROPOFF') || stop.kind == 'LAUNDRY_RETURN').length.clamp(1, 999).toInt(),
      routeStops: order.stops,
      payout: (order.riderFeePesewas + order.tipPesewas + order.peakPayPesewas) / 100,
      peakPayPesewas: order.peakPayPesewas,
      totalDistanceKm: 0,
      status: OrderStatus.fromApi(order.status),
      createdAt: DateTime.now(),
      hasCod: order.codAmountPesewas > 0,
      codAmount: order.codAmountPesewas > 0
          ? order.codAmountPesewas / 100
          : null,
      customerNote: order.customerNote,
      leaveAtDoor: order.leaveAtDoor,
      dropNote: order.dropNote,
      scheduledFor: order.scheduledFor,
      signatureRequired: order.signatureRequired,
    );
  }

  Future<void> accept(RiderTrip offer) async {
    final offerId = offer.dispatchOfferId ?? offer.id;
    await _dispatchRepository.acceptOffer(offerId);
    HapticFeedback.lightImpact();
    _state = _state.copyWith(
      incomingOffers: _state.incomingOffers
          .where((o) => (o.dispatchOfferId ?? o.id) != offerId)
          .toList(),
      currentTrip: offer.copyWithStatus(OrderStatus.riderAssigned),
    );
    notifyListeners();
  }

  Future<void> reject(RiderTrip offer) async {
    final offerId = offer.dispatchOfferId ?? offer.id;
    await _dispatchRepository.declineOffer(offerId);
    HapticFeedback.selectionClick();
    _state = _state.copyWith(
      incomingOffers: _state.incomingOffers
          .where((o) => (o.dispatchOfferId ?? o.id) != offerId)
          .toList(),
    );
    notifyListeners();
  }

  RiderTrip _toRiderTrip(RiderDispatchOffer offer) {
    final service = _serviceFromCode(offer.serviceCode);
    return RiderTrip(
      id: offer.orderId,
      dispatchOfferId: offer.id,
      service: service,
      pickupLabel: offer.vendorLocationName ?? offer.vendorName,
      pickupAddress: offer.pickupAddress ?? 'Address unavailable',
      pickupPoint: LatLng(offer.vendorLat, offer.vendorLng),
      dropoffLabel: offer.parcel?.recipientName ?? 'Customer drop-off',
      dropoffAddress: offer.dropAddress,
      dropoffPoint: LatLng(offer.dropLat, offer.dropLng),
      customerName: 'Customer',
      customerPhone: offer.customerPhone ?? '',
      vendorName: offer.vendorName,
      vendorLocationId: offer.vendorLocationId,
      vendorLocationName: offer.vendorLocationName,
      itemsPreview: _itemPreview(offer.items),
      operationalFlags: _operationalFlags(
        pharmacy: offer.pharmacy,
        market: offer.market,
        laundry: offer.laundry,
        errand: offer.errand,
      ),
      errand: offer.errand,
      parcel: offer.parcel,
      vendorReadiness: offer.vendorReadiness,
      pickupWindowMin: offer.pickupWindowMin,
      pickupCount: offer.pickupCount,
      dropCount: offer.dropCount,
      routeStops: offer.batchStops,
      payout: (offer.riderFeePesewas + offer.tipPesewas + offer.peakPayPesewas) / 100,
      peakPayPesewas: offer.peakPayPesewas,
      totalDistanceKm: offer.totalRouteKm,
      status: OrderStatus.riderAssigned,
      createdAt: DateTime.now(),
      hasCod: offer.codExposurePesewas > 0,
      codAmount: offer.codExposurePesewas > 0
          ? offer.codExposurePesewas / 100
          : null,
      customerNote: offer.customerNote,
      leaveAtDoor: offer.leaveAtDoor,
      dropNote: offer.dropNote,
      scheduledFor: offer.scheduledFor,
      signatureRequired: offer.signatureRequired,
      expiresAt: offer.expiresAt,
      acceptanceWindowSec: offer.acceptanceWindowSec,
    );
  }

  @override
  void dispose() {
    _offerPollTimer?.cancel();
    super.dispose();
  }

  Future<void> refreshCurrentOrder() async {
    final trip = _state.currentTrip;
    if (trip == null) return;
    RiderOrderStatus status;
    try {
      status = await _orderRepository.getOrderStatus(trip.id);
    } on DioException catch (error) {
      final code = error.response?.statusCode;
      if (code == 403 || code == 404) {
        await _clearIfNoLongerAssigned(trip.id);
        return;
      }
      rethrow;
    }
    final next = OrderStatus.fromApi(status.status);
    if (next == OrderStatus.delivered) {
      completeCurrent(trip.id);
      return;
    }
    if (next == OrderStatus.cancelled) {
      cancelCurrent();
      return;
    }
    var updated = trip.copyWithStatus(next, errandContext: status.errand, parcelContext: status.parcel);
    if (status.customerName != null || status.customerPhone != null) {
      updated = updated.copyWithCustomer(
        name: status.customerName,
        phone: status.customerPhone,
      );
    }
    if (updated.status != trip.status ||
        updated.customerName != trip.customerName ||
        updated.customerPhone != trip.customerPhone ||
        updated.errand?.errandStatus != trip.errand?.errandStatus ||
        updated.errand?.spentPesewas != trip.errand?.spentPesewas ||
        updated.errand?.receiptCount != trip.errand?.receiptCount ||
        updated.errand?.substitution?['status'] != trip.errand?.substitution?['status'] ||
        updated.parcel?.parcelStatus != trip.parcel?.parcelStatus) {
      _state = _state.copyWith(currentTrip: updated);
      notifyListeners();
    }
  }

  void completeCurrent(String orderId) {
    final trip = _state.currentTrip;
    if (trip == null || trip.id != orderId) return;
    final completed = trip.copyWithStatus(OrderStatus.delivered);
    _state = _state.copyWith(
      clearCurrentTrip: true,
      history: [completed, ..._state.history],
    );
    notifyListeners();
  }

  void cancelCurrent() {
    _state = _state.copyWith(clearCurrentTrip: true);
    notifyListeners();
  }

  /// Returns the assigned order to dispatch. UI must only clear after 2xx.
  Future<void> releaseCurrent() async {
    final trip = _state.currentTrip;
    if (trip == null) {
      throw StateError('No active delivery to release');
    }
    await _dispatchRepository.releaseOrder(trip.id);
    cancelCurrent();
  }

  Future<void> _clearIfNoLongerAssigned(String orderId) async {
    try {
      final task = await _dispatchRepository.getActiveTask();
      final currentId = task.currentOrder?.orderId;
      if (currentId == null || currentId != orderId) {
        cancelCurrent();
      }
    } catch (_) {
      // Leave the trip; the next poll retries against Dispatch.
    }
  }
}

final tripsProvider = ChangeNotifierProvider<TripsNotifier>((ref) {
  return TripsNotifier(
    ref.watch(riderDispatchRepositoryProvider),
    ref.watch(riderOrderRepositoryProvider),
  );
});

// ── Documented foreground location (chunk 4.2) ───────────────────────
// Android: Geolocator ForegroundNotificationConfig (persistent notification).
// iOS: When In Use + UIBackgroundModes location + allowBackgroundLocationUpdates.
// Force-close or going offline stops updates. No separate background-locator plugin.

class RiderLocationNotifier extends ChangeNotifier {
  RiderLocationNotifier(this._trackingRepository);

  final RiderTrackingRepository _trackingRepository;
  LatLng _point = const LatLng(0, 0);
  LatLng get point => _point;
  StreamSubscription<Position>? _subscription;
  String? _orderId;
  bool _idle = false;
  bool _moving = false;
  bool get moving => _moving;
  bool get isIdle => _idle && _moving;

  Future<void> startTracking(RiderTrip trip) async {
    if (_moving && !_idle && _orderId == trip.id) return;
    await _subscription?.cancel();
    _orderId = trip.id;
    _idle = false;
    final position = await _determinePosition();
    await _applyPosition(position);

    _moving = true;
    _subscription = Geolocator.getPositionStream(
      locationSettings: _locationSettings(idle: false),
    ).listen((position) {
      unawaited(_applyPosition(position));
    });
    notifyListeners();
  }

  /// Starts the lower-frequency stream used by an online but unassigned Rider.
  /// The same authenticated Tracking route is used with no order id, allowing
  /// Dispatch to keep the Rider location current for eligibility and demand
  /// calculations without exposing customer/order data.
  Future<void> startIdleTracking() async {
    if (_moving && _idle && _orderId == null) return;
    await _subscription?.cancel();
    _orderId = null;
    _idle = true;
    final position = await _determinePosition();
    await _applyPosition(position);

    _moving = true;
    _subscription = Geolocator.getPositionStream(
      locationSettings: _locationSettings(idle: true),
    ).listen((position) {
      unawaited(_applyPosition(position));
    });
    notifyListeners();
  }

  LocationSettings _locationSettings({required bool idle}) {
    if (defaultTargetPlatform == TargetPlatform.android) {
      return AndroidSettings(
        accuracy: idle ? LocationAccuracy.medium : LocationAccuracy.high,
        distanceFilter: idle ? 100 : 10,
        intervalDuration: Duration(seconds: idle ? 90 : 10),
        foregroundNotificationConfig: ForegroundNotificationConfig(
          notificationTitle: 'Ore Rider location',
          notificationText: idle
              ? 'You are online. Ore is sharing your location so nearby offers can reach you. Uses extra battery.'
              : 'On a delivery. Ore is sharing your location with Dispatch. Uses extra battery.',
          enableWakeLock: true,
        ),
      );
    }
    if (defaultTargetPlatform == TargetPlatform.iOS) {
      return AppleSettings(
        accuracy: idle ? LocationAccuracy.medium : LocationAccuracy.high,
        activityType: idle ? ActivityType.otherNavigation : ActivityType.fitness,
        distanceFilter: idle ? 100 : 10,
        pauseLocationUpdatesAutomatically: false,
        showBackgroundLocationIndicator: true,
        allowBackgroundLocationUpdates: true,
      );
    }
    return LocationSettings(
      accuracy: idle ? LocationAccuracy.medium : LocationAccuracy.high,
      distanceFilter: idle ? 100 : 10,
    );
  }

  Future<void> _applyPosition(Position position) async {
    _point = LatLng(position.latitude, position.longitude);
    notifyListeners();
    try {
      await _trackingRepository.sendOrQueue(
        RiderLocationSample(
          lat: position.latitude,
          lng: position.longitude,
          speedKmh: position.speed * 3.6,
          orderId: _orderId,
        ),
      );
    } catch (_) {
      // sendOrQueue already persists the sample; the next GPS tick retries.
    }
  }

  Future<Position> _determinePosition() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw StateError('Location services are disabled');
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw StateError('Location permission is required for tracking');
    }
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      await Permission.notification.request();
    }
    return Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );
  }

  void snapTo(LatLng p) {
    _point = p;
    notifyListeners();
  }

  void stop() {
    final subscription = _subscription;
    _subscription = null;
    if (subscription != null) unawaited(subscription.cancel());
    _orderId = null;
    _idle = false;
    _moving = false;
    notifyListeners();
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}

final riderLocationProvider = ChangeNotifierProvider<RiderLocationNotifier>((ref) {
  return RiderLocationNotifier(ref.watch(riderTrackingRepositoryProvider));
});
