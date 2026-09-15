import 'package:ore_core/ore_core.dart';

/// Dispatch-service rider profile returned after registration.
class RiderDispatchProfile {
  const RiderDispatchProfile({
    required this.id,
    required this.userId,
    required this.name,
    required this.phone,
    required this.vehicle,
    required this.status,
    required this.verified,
    this.licensePlate,
    this.publicId,
    this.lat,
    this.lng,
    this.rating = 0,
    this.completedDeliveries = 0,
    this.reliabilityScore = 1,
    this.declineCount = 0,
    this.codTier,
    this.codStatus,
    this.pausedUntil,
    this.sessionEndsAt,
  });

  final String id;
  final String userId;
  final String name;
  final String phone;
  final String vehicle;
  final String status;
  final bool verified;
  final String? licensePlate;
  final String? publicId;
  final double? lat;
  final double? lng;
  final double rating;
  final int completedDeliveries;
  final double reliabilityScore;
  final int declineCount;
  final String? codTier;
  final String? codStatus;
  final DateTime? pausedUntil;
  final DateTime? sessionEndsAt;

  factory RiderDispatchProfile.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Rider profile must be a JSON object');
    }

    final vehicle = _requiredString(json['vehicle'], 'vehicle');
    if (vehicle != 'BICYCLE' && vehicle != 'MOTORBIKE' && vehicle != 'CAR') {
      throw FormatException('Unsupported rider vehicle: $vehicle');
    }

    final verified = json['verified'];
    if (verified is! bool) {
      throw const FormatException('Rider profile verified must be a boolean');
    }

    final licensePlate = json['licensePlate'];
    if (licensePlate != null && licensePlate is! String) {
      throw const FormatException('Rider profile licensePlate must be a string');
    }

    final publicId = json['publicId'];
    if (publicId != null && publicId is! String) {
      throw const FormatException('Rider profile publicId must be a string');
    }

    return RiderDispatchProfile(
      id: _requiredString(json['id'], 'id'),
      userId: _requiredString(json['userId'], 'userId'),
      name: _requiredString(json['name'], 'name'),
      phone: _normalizeBackendPhone(_requiredString(json['phone'], 'phone')),
      vehicle: vehicle,
      status: _requiredString(json['status'], 'status'),
      verified: verified,
      licensePlate: licensePlate as String?,
      publicId: publicId as String?,
      lat: _optionalDouble(json['lat'], 'lat'),
      lng: _optionalDouble(json['lng'], 'lng'),
      rating: _optionalDouble(json['rating'], 'rating') ?? 0,
      completedDeliveries: (json['completedDeliveries'] as num?)?.toInt() ?? 0,
      reliabilityScore: _optionalDouble(json['reliabilityScore'], 'reliabilityScore') ?? 1,
      declineCount: (json['declineCount'] as num?)?.toInt() ?? 0,
      codTier: _optionalString(json['codTier'], 'codTier'),
      codStatus: _optionalString(json['codStatus'], 'codStatus'),
      pausedUntil: _optionalDateTime(json['pausedUntil'], 'pausedUntil'),
      sessionEndsAt: _optionalDateTime(json['sessionEndsAt'], 'sessionEndsAt'),
    );
  }
}

class RiderOrderItemSummary {
  const RiderOrderItemSummary({
    required this.id,
    required this.itemId,
    required this.name,
    required this.qty,
    required this.modifiers,
    required this.selectedOptions,
    required this.optionsTotalPesewas,
    this.unit,
    this.prescriptionOnly = false,
    this.handlingFlags = const <String>[],
  });

  final String id;
  final String itemId;
  final String name;
  final int qty;
  final String? unit;
  final List<String> modifiers;
  final List<Map<String, dynamic>> selectedOptions;
  final int optionsTotalPesewas;
  final bool prescriptionOnly;
  final List<String> handlingFlags;

  factory RiderOrderItemSummary.fromJson(Object? json) {
    if (json is! Map) throw const FormatException('Rider order item must be an object');
    final options = json['selectedOptions'];
    final modifiers = json['modifiers'];
    final handlingFlags = json['handlingFlags'];
    return RiderOrderItemSummary(
      id: _requiredString(json['id'], 'order item.id'),
      itemId: _requiredString(json['itemId'], 'order item.itemId'),
      name: _requiredString(json['name'], 'order item.name'),
      qty: _requiredInt(json['qty'], 'order item.qty'),
      unit: _optionalString(json['unit'], 'order item.unit'),
      modifiers: modifiers is List ? modifiers.whereType<String>().toList(growable: false) : const <String>[],
      selectedOptions: options is List
          ? options.whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList(growable: false)
          : const <Map<String, dynamic>>[],
      optionsTotalPesewas: (json['optionsTotalPesewas'] as num?)?.toInt() ?? 0,
      prescriptionOnly: json['prescriptionOnly'] == true,
      handlingFlags: handlingFlags is List ? handlingFlags.whereType<String>().toList(growable: false) : const <String>[],
    );
  }
}

class RiderRouteStop {
  const RiderRouteStop({
    required this.stopId,
    required this.orderId,
    required this.sequence,
    required this.kind,
    required this.label,
    required this.lat,
    required this.lng,
    this.address,
    this.status,
    this.serviceCode,
  });

  final String stopId;
  final String orderId;
  final int sequence;
  final String kind;
  final String label;
  final String? address;
  final double lat;
  final double lng;
  final String? status;
  final String? serviceCode;

  bool get hasValidPoint => (lat.abs() > 0.0001 || lng.abs() > 0.0001) && lat.abs() <= 90 && lng.abs() <= 180;

  bool get isPickupKind => kind.contains('PICKUP') || kind == 'LAUNDRY_COLLECTION';

  bool get isDropKind => kind.contains('DROPOFF') || kind == 'LAUNDRY_RETURN';

  String get kindLabel {
    switch (kind) {
      case 'PICKUP':
        return 'Pickup';
      case 'DROPOFF':
        return 'Drop-off';
      case 'LAUNDRY_COLLECTION':
        return 'Collection';
      case 'LAUNDRY_RETURN':
        return 'Return';
      default:
        return kind.replaceAll('_', ' ');
    }
  }

  factory RiderRouteStop.fromJson(Object? json) {
    if (json is! Map) throw const FormatException('Rider route stop must be an object');
    return RiderRouteStop(
      stopId: _requiredString(json['stopId'], 'route stop.stopId'),
      orderId: _requiredString(json['orderId'], 'route stop.orderId'),
      sequence: _requiredInt(json['sequence'], 'route stop.sequence'),
      kind: _requiredString(json['kind'], 'route stop.kind'),
      label: _requiredString(json['label'], 'route stop.label'),
      address: _optionalString(json['address'], 'route stop.address'),
      lat: _requiredDouble(json['lat'], 'route stop.lat'),
      lng: _requiredDouble(json['lng'], 'route stop.lng'),
      status: _optionalString(json['status'], 'route stop.status'),
      serviceCode: _optionalString(json['serviceCode'], 'route stop.serviceCode'),
    );
  }
}

class RiderLaundryContext {
  const RiderLaundryContext({this.stage, this.leg, this.nextStopKind, this.packageSealed = false});

  final String? stage;
  final String? leg;
  final String? nextStopKind;
  final bool packageSealed;

  factory RiderLaundryContext.fromJson(Object? json) {
    if (json == null) return const RiderLaundryContext();
    if (json is! Map) throw const FormatException('Laundry context must be an object or null');
    return RiderLaundryContext(
      stage: _optionalString(json['stage'], 'laundry.stage'),
      leg: _optionalString(json['leg'], 'laundry.leg'),
      nextStopKind: _optionalString(json['nextStopKind'], 'laundry.nextStopKind'),
      packageSealed: json['packageSealed'] == true,
    );
  }
}

class RiderMarketContext {
  const RiderMarketContext({required this.fulfillmentRecorded, this.lines = const <Map<String, dynamic>>[]});

  final bool fulfillmentRecorded;
  final List<Map<String, dynamic>> lines;

  factory RiderMarketContext.fromJson(Object? json) {
    if (json == null) return const RiderMarketContext(fulfillmentRecorded: false);
    if (json is! Map) throw const FormatException('Market context must be an object or null');
    final rawLines = json['lines'];
    return RiderMarketContext(
      fulfillmentRecorded: json['fulfillmentRecorded'] == true,
      lines: rawLines is List
          ? rawLines.whereType<Map>().map((line) => Map<String, dynamic>.from(line)).toList(growable: false)
          : const <Map<String, dynamic>>[],
    );
  }
}

class RiderPharmacyContext {
  const RiderPharmacyContext({required this.operationalFlag});

  final String operationalFlag;

  factory RiderPharmacyContext.fromJson(Object? json) {
    if (json == null) return const RiderPharmacyContext(operationalFlag: 'SEALED_PACKAGE');
    if (json is! Map) throw const FormatException('Pharmacy context must be an object or null');
    return RiderPharmacyContext(
      operationalFlag: _requiredString(json['operationalFlag'], 'pharmacy.operationalFlag'),
    );
  }
}

class RiderErrandContext {
  const RiderErrandContext({
    required this.task,
    required this.shopName,
    required this.shopLat,
    required this.shopLng,
    required this.budgetPesewas,
    required this.spentPesewas,
    required this.remainingBudgetPesewas,
    required this.errandStatus,
    required this.receiptCount,
    required this.requiresReceipt,
    this.substitution,
  });

  final String task;
  final String? shopName;
  final double shopLat;
  final double shopLng;
  final int budgetPesewas;
  final int spentPesewas;
  final int remainingBudgetPesewas;
  final String errandStatus;
  final int receiptCount;
  final bool requiresReceipt;
  final Map<String, dynamic>? substitution;

  bool get isShopping => errandStatus == 'SHOPPING';
  bool get isPurchased => errandStatus == 'PURCHASED';

  factory RiderErrandContext.fromJson(Object? json) {
    if (json == null) throw const FormatException('Errand context is required for an Errand task');
    if (json is! Map) throw const FormatException('Errand context must be an object');
    final substitution = json['substitution'];
    return RiderErrandContext(
      task: _requiredString(json['task'], 'errand.task'),
      shopName: _optionalString(json['shopName'], 'errand.shopName'),
      shopLat: _requiredDouble(json['shopLat'], 'errand.shopLat'),
      shopLng: _requiredDouble(json['shopLng'], 'errand.shopLng'),
      budgetPesewas: _requiredInt(json['budgetPesewas'], 'errand.budgetPesewas'),
      spentPesewas: _requiredInt(json['spentPesewas'], 'errand.spentPesewas'),
      remainingBudgetPesewas: _requiredInt(json['remainingBudgetPesewas'], 'errand.remainingBudgetPesewas'),
      errandStatus: _requiredString(json['errandStatus'], 'errand.errandStatus'),
      receiptCount: _requiredInt(json['receiptCount'], 'errand.receiptCount'),
      requiresReceipt: json['requiresReceipt'] == true,
      substitution: substitution is Map ? Map<String, dynamic>.from(substitution) : null,
    );
  }
}

class RiderParcelContext {
  const RiderParcelContext({
    required this.senderName,
    required this.senderPhone,
    required this.recipientName,
    required this.recipientPhone,
    required this.category,
    required this.weightKg,
    required this.dimensionsCm,
    required this.declaredValuePesewas,
    required this.description,
    required this.fragile,
    required this.sealed,
    required this.pickupMode,
    required this.proofMode,
    required this.parcelStatus,
    required this.returnReason,
  });

  final String senderName;
  final String senderPhone;
  final String recipientName;
  final String recipientPhone;
  final String category;
  final double weightKg;
  final Map<String, dynamic>? dimensionsCm;
  final int declaredValuePesewas;
  final String description;
  final bool fragile;
  final bool sealed;
  final String pickupMode;
  final String proofMode;
  final String parcelStatus;
  final String? returnReason;

  factory RiderParcelContext.fromJson(Object? json) {
    if (json == null) throw const FormatException('Parcel context is required for a Parcel task');
    if (json is! Map) throw const FormatException('Parcel context must be an object');
    final sender = json['sender'];
    final recipient = json['recipient'];
    if (sender is! Map || recipient is! Map) throw const FormatException('Parcel contacts are missing');
    if (sender['address'] is! Map || recipient['address'] is! Map) throw const FormatException('Parcel addresses are missing');
    return RiderParcelContext(
      senderName: _requiredString(sender['name'], 'parcel.sender.name'),
      senderPhone: _requiredString(sender['phone'], 'parcel.sender.phone'),
      recipientName: _requiredString(recipient['name'], 'parcel.recipient.name'),
      recipientPhone: _requiredString(recipient['phone'], 'parcel.recipient.phone'),
      category: _requiredString(json['category'], 'parcel.category'),
      weightKg: _requiredDouble(json['weightKg'], 'parcel.weightKg'),
      dimensionsCm: json['dimensionsCm'] is Map ? Map<String, dynamic>.from(json['dimensionsCm'] as Map) : null,
      declaredValuePesewas: _requiredInt(json['declaredValuePesewas'], 'parcel.declaredValuePesewas'),
      description: _requiredString(json['description'], 'parcel.description'),
      fragile: json['fragile'] == true,
      sealed: json['sealed'] == true,
      pickupMode: _requiredString(json['pickupMode'], 'parcel.pickupMode'),
      proofMode: _requiredString(json['proofMode'], 'parcel.proofMode'),
      parcelStatus: _requiredString(json['parcelStatus'], 'parcel.parcelStatus'),
      returnReason: _optionalString(json['returnReason'], 'parcel.returnReason'),
    );
  }
}

/// A pending delivery offer returned by Dispatch.
class RiderDispatchOffer {
  const RiderDispatchOffer({
    required this.id,
    required this.orderId,
    required this.vendorId,
    required this.vendorName,
    required this.vendorLat,
    required this.vendorLng,
    required this.dropLat,
    required this.dropLng,
    required this.dropAddress,
    this.vendorLocationId,
    this.vendorLocationName,
    this.pickupAddress,
    this.customerPhone,
    this.customerNote,
    this.items = const <RiderOrderItemSummary>[],
    this.pharmacy,
    this.market,
    this.laundry,
    this.errand,
    this.parcel,
    this.batchStops = const <RiderRouteStop>[],
    required this.expiresAt,
    required this.riderFeePesewas,
    this.tipPesewas = 0,
    this.peakPayPesewas = 0,
    this.leaveAtDoor = false,
    this.dropNote,
    this.scheduledFor,
    this.signatureRequired = false,
    required this.pickupDistanceKm,
    required this.deliveryDistanceKm,
    required this.totalRouteKm,
    required this.codExposurePesewas,
    required this.serviceCode,
    required this.acceptanceWindowSec,
    this.pickupWindowMin,
    this.pickupCount = 1,
    this.dropCount = 1,
    this.vendorReadiness,
    this.batchId,
  });

  final String id;
  final String orderId;
  final String vendorId;
  final String vendorName;
  final String? vendorLocationId;
  final String? vendorLocationName;
  final String? pickupAddress;
  final String? customerNote;
  final List<RiderOrderItemSummary> items;
  final RiderPharmacyContext? pharmacy;
  final RiderMarketContext? market;
  final RiderLaundryContext? laundry;
  final RiderErrandContext? errand;
  final RiderParcelContext? parcel;
  final List<RiderRouteStop> batchStops;
  final int? pickupWindowMin;
  final int pickupCount;
  final int dropCount;
  final String? vendorReadiness;
  final double vendorLat;
  final double vendorLng;
  final double dropLat;
  final double dropLng;
  final String dropAddress;
  final String? customerPhone;
  final DateTime expiresAt;
  final int riderFeePesewas;
  final int tipPesewas;
  final int peakPayPesewas;
  final bool leaveAtDoor;
  final String? dropNote;
  final DateTime? scheduledFor;
  final bool signatureRequired;
  final double pickupDistanceKm;
  final double deliveryDistanceKm;
  final double totalRouteKm;
  final int codExposurePesewas;
  final String serviceCode;
  final int acceptanceWindowSec;
  final String? batchId;

  factory RiderDispatchOffer.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Dispatch offer must be a JSON object');
    }

    return RiderDispatchOffer(
      id: _requiredString(json['id'], 'offer.id'),
      orderId: _requiredString(json['orderId'], 'offer.orderId'),
      vendorId: _requiredString(json['vendorId'], 'offer.vendorId'),
      vendorName: _requiredString(json['vendorName'], 'offer.vendorName'),
      vendorLat: _requiredDouble(json['vendorLat'], 'offer.vendorLat'),
      vendorLng: _requiredDouble(json['vendorLng'], 'offer.vendorLng'),
      dropLat: _requiredDouble(json['dropLat'], 'offer.dropLat'),
      dropLng: _requiredDouble(json['dropLng'], 'offer.dropLng'),
      dropAddress: _requiredString(json['dropAddress'], 'offer.dropAddress'),
      vendorLocationId: _optionalString(json['vendorLocationId'], 'offer.vendorLocationId'),
      vendorLocationName: _optionalString(json['vendorLocationName'], 'offer.vendorLocationName'),
      pickupAddress: _optionalString(json['pickupAddress'], 'offer.pickupAddress'),
      customerPhone: _optionalString(json['customerPhone'], 'offer.customerPhone'),
      customerNote: _optionalString(json['customerNote'], 'offer.customerNote'),
      items: _parseItems(json['items'], 'offer.items'),
      pharmacy: _parsePharmacy(json['pharmacy']),
      market: _parseMarket(json['market']),
      laundry: _parseLaundry(json['laundry']),
      errand: _parseErrand(json['errand']),
      parcel: _parseParcel(json['parcel']),
      batchStops: _parseStops(json['batchStops'], 'offer.batchStops'),
      expiresAt: _requiredDateTime(json['expiresAt'], 'offer.expiresAt'),
      riderFeePesewas: _requiredInt(json['riderFeePesewas'], 'offer.riderFeePesewas'),
      tipPesewas: json['tipPesewas'] is num ? (json['tipPesewas'] as num).toInt() : 0,
      peakPayPesewas: json['peakPayPesewas'] is num ? (json['peakPayPesewas'] as num).toInt() : 0,
      leaveAtDoor: json['leaveAtDoor'] == true,
      dropNote: _optionalString(json['dropNote'], 'offer.dropNote'),
      scheduledFor: _optionalDateTime(json['scheduledFor'], 'offer.scheduledFor'),
      signatureRequired: json['signatureRequired'] == true ||
          json['leaveAtDoor'] == true ||
          json['parcel'] is Map &&
              ((json['parcel'] as Map)['proofMode'] == 'SIGNATURE' ||
                  (json['parcel'] as Map)['proofMode'] == 'PIN_AND_PHOTO'),
      pickupDistanceKm: _requiredDouble(json['pickupDistanceKm'], 'offer.pickupDistanceKm'),
      deliveryDistanceKm: _requiredDouble(json['deliveryDistanceKm'], 'offer.deliveryDistanceKm'),
      totalRouteKm: _requiredDouble(json['totalRouteKm'], 'offer.totalRouteKm'),
      codExposurePesewas: _requiredInt(json['codExposurePesewas'], 'offer.codExposurePesewas'),
      serviceCode: _requiredString(json['serviceCode'], 'offer.serviceCode'),
      acceptanceWindowSec: _requiredInt(json['acceptanceWindowSec'], 'offer.acceptanceWindowSec'),
      pickupWindowMin: (json['pickupWindowMin'] as num?)?.toInt(),
      pickupCount: (json['pickupCount'] as num?)?.toInt() ?? 1,
      dropCount: (json['dropCount'] as num?)?.toInt() ?? 1,
      vendorReadiness: _optionalString(json['vendorReadiness'], 'offer.vendorReadiness'),
      batchId: json['batchId'] as String?,
    );
  }
}

class RiderActiveOrder {
  const RiderActiveOrder({
    required this.orderId,
    required this.status,
    required this.vendorId,
    required this.vendorName,
    required this.vendorLat,
    required this.vendorLng,
    required this.dropLat,
    required this.dropLng,
    required this.dropAddress,
    required this.paymentMethod,
    required this.codAmountPesewas,
    this.vendorLocationId,
    this.vendorLocationName,
    this.pickupAddress,
    this.customerPhone,
    this.customerNote,
    this.items = const <RiderOrderItemSummary>[],
    this.pharmacy,
    this.market,
    this.laundry,
    this.errand,
    this.parcel,
    this.stops = const <RiderRouteStop>[],
    required this.riderFeePesewas,
    this.tipPesewas = 0,
    this.peakPayPesewas = 0,
    this.leaveAtDoor = false,
    this.dropNote,
    this.scheduledFor,
    this.signatureRequired = false,
    required this.serviceCode,
  });

  final String orderId;
  final String status;
  final String vendorId;
  final String vendorName;
  final String? vendorLocationId;
  final String? vendorLocationName;
  final String? pickupAddress;
  final String? customerNote;
  final List<RiderOrderItemSummary> items;
  final RiderPharmacyContext? pharmacy;
  final RiderMarketContext? market;
  final RiderLaundryContext? laundry;
  final RiderErrandContext? errand;
  final RiderParcelContext? parcel;
  final List<RiderRouteStop> stops;
  final double vendorLat;
  final double vendorLng;
  final double dropLat;
  final double dropLng;
  final String dropAddress;
  final String paymentMethod;
  final int codAmountPesewas;
  final String? customerPhone;
  final int riderFeePesewas;
  final int tipPesewas;
  final int peakPayPesewas;
  final bool leaveAtDoor;
  final String? dropNote;
  final DateTime? scheduledFor;
  final bool signatureRequired;
  final String serviceCode;

  factory RiderActiveOrder.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Active rider order must be a JSON object');
    }
    return RiderActiveOrder(
      orderId: _requiredString(json['orderId'], 'task.orderId'),
      status: _requiredString(json['status'], 'task.status'),
      vendorId: _requiredString(json['vendorId'], 'task.vendorId'),
      vendorName: _requiredString(json['vendorName'], 'task.vendorName'),
      vendorLat: _requiredDouble(json['vendorLat'], 'task.vendorLat'),
      vendorLng: _requiredDouble(json['vendorLng'], 'task.vendorLng'),
      dropLat: _requiredDouble(json['dropLat'], 'task.dropLat'),
      dropLng: _requiredDouble(json['dropLng'], 'task.dropLng'),
      dropAddress: _requiredString(json['dropAddress'], 'task.dropAddress'),
      paymentMethod: _requiredString(json['paymentMethod'], 'task.paymentMethod'),
      codAmountPesewas: _requiredInt(json['codAmountPesewas'], 'task.codAmountPesewas'),
      vendorLocationId: _optionalString(json['vendorLocationId'], 'task.vendorLocationId'),
      vendorLocationName: _optionalString(json['vendorLocationName'], 'task.vendorLocationName'),
      pickupAddress: _optionalString(json['pickupAddress'], 'task.pickupAddress'),
      customerPhone: _optionalString(json['customerPhone'], 'task.customerPhone'),
      customerNote: _optionalString(json['customerNote'], 'task.customerNote'),
      items: _parseItems(json['items'], 'task.items'),
      pharmacy: _parsePharmacy(json['pharmacy']),
      market: _parseMarket(json['market']),
      laundry: _parseLaundry(json['laundry']),
      errand: _parseErrand(json['errand']),
      parcel: _parseParcel(json['parcel']),
      stops: _parseStops(json['stops'], 'task.stops'),
      riderFeePesewas: _requiredInt(json['riderFeePesewas'], 'task.riderFeePesewas'),
      tipPesewas: json['tipPesewas'] is num ? (json['tipPesewas'] as num).toInt() : 0,
      peakPayPesewas: json['peakPayPesewas'] is num ? (json['peakPayPesewas'] as num).toInt() : 0,
      leaveAtDoor: json['leaveAtDoor'] == true,
      dropNote: _optionalString(json['dropNote'], 'task.dropNote'),
      scheduledFor: _optionalDateTime(json['scheduledFor'], 'task.scheduledFor'),
      signatureRequired: json['signatureRequired'] == true ||
          json['leaveAtDoor'] == true ||
          json['parcel'] is Map &&
              ((json['parcel'] as Map)['proofMode'] == 'SIGNATURE' ||
                  (json['parcel'] as Map)['proofMode'] == 'PIN_AND_PHOTO'),
      serviceCode: _requiredString(json['serviceCode'], 'task.serviceCode'),
    );
  }
}

class RiderActiveTask {
  const RiderActiveTask({this.offerId, this.currentOrder});

  final String? offerId;
  final RiderActiveOrder? currentOrder;

  factory RiderActiveTask.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Active rider task must be a JSON object');
    }
    final offerId = json['offerId'];
    if (offerId != null && offerId is! String) {
      throw const FormatException('Task offerId must be a string or null');
    }
    final current = json['currentOrder'];
    return RiderActiveTask(
      offerId: offerId as String?,
      currentOrder: current == null ? null : RiderActiveOrder.fromJson(current),
    );
  }
}

class RiderPerformance {
  const RiderPerformance({
    required this.periodDays,
    required this.generatedAt,
    required this.rating,
    required this.reliabilityScore,
    required this.completedDeliveries,
    required this.declineCount,
    required this.totalAnsweredOffers,
    required this.acceptedOffers,
    required this.acceptanceRate,
    required this.completedAssignments,
    required this.releasedAssignments,
    required this.completionRate,
  });

  final int periodDays;
  final DateTime generatedAt;
  final double rating;
  final double reliabilityScore;
  final int completedDeliveries;
  final int declineCount;
  final int totalAnsweredOffers;
  final int acceptedOffers;
  final double? acceptanceRate;
  final int completedAssignments;
  final int releasedAssignments;
  final double? completionRate;

  factory RiderPerformance.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) throw const FormatException('Rider performance must be an object');
    final generatedAt = DateTime.tryParse(json['generatedAt']?.toString() ?? '');
    if (generatedAt == null) throw const FormatException('Rider performance timestamp is invalid');
    return RiderPerformance(
      periodDays: _requiredInt(json['periodDays'], 'performance.periodDays'),
      generatedAt: generatedAt,
      rating: _requiredDouble(json['rating'], 'performance.rating'),
      reliabilityScore: _requiredDouble(json['reliabilityScore'], 'performance.reliabilityScore'),
      completedDeliveries: _requiredInt(json['completedDeliveries'], 'performance.completedDeliveries'),
      declineCount: _requiredInt(json['declineCount'], 'performance.declineCount'),
      totalAnsweredOffers: _requiredInt(json['totalAnsweredOffers'], 'performance.totalAnsweredOffers'),
      acceptedOffers: _requiredInt(json['acceptedOffers'], 'performance.acceptedOffers'),
      acceptanceRate: _optionalDouble(json['acceptanceRate'], 'performance.acceptanceRate'),
      completedAssignments: _requiredInt(json['completedAssignments'], 'performance.completedAssignments'),
      releasedAssignments: _requiredInt(json['releasedAssignments'], 'performance.releasedAssignments'),
      completionRate: _optionalDouble(json['completionRate'], 'performance.completionRate'),
    );
  }
}

/// Active funded peak for the rider's current location. 0 when no window matches.
class RiderPeakPay {
  const RiderPeakPay({
    required this.amountPesewas,
    this.title,
    this.endsAt,
  });

  final int amountPesewas;
  final String? title;
  final DateTime? endsAt;

  factory RiderPeakPay.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Peak pay must be a JSON object');
    }
    final amount = json['amountPesewas'];
    if (amount is! num) {
      throw const FormatException('Peak pay amountPesewas must be a number');
    }
    final title = json['title'];
    if (title != null && title is! String) {
      throw const FormatException('Peak pay title must be a string or null');
    }
    final endsAtRaw = json['endsAt'];
    DateTime? endsAt;
    if (endsAtRaw is String && endsAtRaw.isNotEmpty) {
      endsAt = DateTime.tryParse(endsAtRaw);
      if (endsAt == null) {
        throw const FormatException('Peak pay endsAt must be an ISO date or null');
      }
    } else if (endsAtRaw != null) {
      throw const FormatException('Peak pay endsAt must be a string or null');
    }
    return RiderPeakPay(
      amountPesewas: amount.toInt(),
      title: title is String && title.isNotEmpty ? title : null,
      endsAt: endsAt,
    );
  }
}

/// Dispatch-service operations for the authenticated rider.
class RiderDispatchRepository {
  const RiderDispatchRepository(this._client);

  final OreApiClient _client;

  Future<RiderDispatchProfile> getProfile() async {
    final response = await _client.getFresh<Map<String, dynamic>>(
      OreEndpoints.riderProfile,
    );
    return RiderDispatchProfile.fromJson(response.data);
  }

  Future<RiderDispatchProfile> updateProfile({
    required String vehicle,
    String? licensePlate,
  }) async {
    if (vehicle != 'BICYCLE' && vehicle != 'MOTORBIKE' && vehicle != 'CAR') {
      throw ArgumentError.value(vehicle, 'vehicle', 'Vehicle must be BICYCLE, MOTORBIKE, or CAR');
    }
    if ((vehicle == 'MOTORBIKE' || vehicle == 'CAR') && (licensePlate == null || licensePlate.trim().isEmpty)) {
      throw ArgumentError.value(licensePlate, 'licensePlate', 'A license plate is required for motorbike and car');
    }
    final response = await _client.patch<Map<String, dynamic>>(
      OreEndpoints.riderProfile,
      data: <String, dynamic>{
        'vehicle': vehicle,
        'licensePlate': vehicle == 'BICYCLE' ? (licensePlate?.trim().isEmpty == true ? null : licensePlate?.trim()) : licensePlate!.trim(),
      },
    );
    return RiderDispatchProfile.fromJson(response.data);
  }

  Future<RiderPerformance> getPerformance() async {
    final response = await _client.getFresh<Map<String, dynamic>>(
      OreEndpoints.riderPerformance,
    );
    return RiderPerformance.fromJson(response.data);
  }

  Future<RiderPeakPay> getPeakPay() async {
    final response = await _client.getFresh<Map<String, dynamic>>(
      OreEndpoints.riderPeakPay,
    );
    return RiderPeakPay.fromJson(response.data);
  }

  Future<List<RiderDispatchOffer>> getPendingOffers() async {
    // Offers are polled every five seconds. Never serve an in-memory cached
    // response here; Dispatch is the source of truth for availability.
    final response = await _client.getFresh<List<dynamic>>(OreEndpoints.riderOffers);
    final data = response.data ?? const <dynamic>[];
    return data.map(RiderDispatchOffer.fromJson).toList();
  }

  Future<RiderActiveTask> getActiveTask() async {
    final response = await _client.getFresh<Map<String, dynamic>>(OreEndpoints.riderTasks);
    return RiderActiveTask.fromJson(response.data);
  }

  Future<void> acceptOffer(String offerId) async {
    await _client.post<Map<String, dynamic>>(
      OreEndpoints.acceptOffer(offerId),
    );
  }

  Future<void> declineOffer(String offerId) async {
    await _client.post<Map<String, dynamic>>(
      OreEndpoints.declineOffer(offerId),
    );
  }

  /// Assigned rider drops the task before pickup. Does not cancel the order.
  Future<void> releaseOrder(String orderId) async {
    await _client.post<Map<String, dynamic>>(
      OreEndpoints.riderRelease(orderId),
    );
  }

  Future<void> confirmErrandArrival({
    required String orderId,
    required double riderLat,
    required double riderLng,
  }) async {
    await _client.post<Map<String, dynamic>>(
      OreEndpoints.errandArrivedAtShop(orderId),
      data: <String, double>{
        'riderLat': riderLat,
        'riderLng': riderLng,
      },
    );
  }

  Future<void> confirmLaundryHandoff({
    required String orderId,
    required double riderLat,
    required double riderLng,
  }) async {
    await _client.post<Map<String, dynamic>>(
      OreEndpoints.laundryHandoff(orderId),
      data: <String, double>{
        'riderLat': riderLat,
        'riderLng': riderLng,
      },
    );
  }

  /// Synchronizes the rider's online/offline state with Dispatch.
  Future<RiderDispatchProfile> setAvailability({required bool available}) async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.riderAvailability,
      data: <String, String>{
        'status': available ? 'AVAILABLE' : 'OFFLINE',
      },
    );
    return RiderDispatchProfile.fromJson(response.data);
  }

  Future<RiderDispatchProfile> pause({int minutes = 30}) async {
    if (minutes < 1 || minutes > 120) throw ArgumentError.value(minutes, 'minutes', 'Pause must be between 1 and 120 minutes');
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.riderPause,
      data: <String, int>{'minutes': minutes},
    );
    return RiderDispatchProfile.fromJson(response.data);
  }

  Future<RiderDispatchProfile> resume() async {
    final response = await _client.post<Map<String, dynamic>>(OreEndpoints.riderResume);
    return RiderDispatchProfile.fromJson(response.data);
  }

  Future<RiderDispatchProfile> extendSession({int minutes = 60}) async {
    if (minutes < 15 || minutes > 720) throw ArgumentError.value(minutes, 'minutes', 'Session extension must be between 15 and 720 minutes');
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.riderSessionExtend,
      data: <String, int>{'durationMin': minutes},
    );
    return RiderDispatchProfile.fromJson(response.data);
  }

  /// Creates the dispatch profile linked to the authenticated user.
  Future<RiderDispatchProfile> registerRider({
    required String name,
    required String phone,
    String vehicle = 'MOTORBIKE',
    String? licensePlate,
    double? lat,
    double? lng,
  }) async {
    final trimmedName = name.trim();
    if (trimmedName.isEmpty) {
      throw ArgumentError.value(name, 'name', 'Rider name cannot be empty');
    }
    if (vehicle != 'BICYCLE' && vehicle != 'MOTORBIKE' && vehicle != 'CAR') {
      throw ArgumentError.value(
        vehicle,
        'vehicle',
        'Vehicle must be BICYCLE, MOTORBIKE, or CAR',
      );
    }

    final normalizedPhone = _normalizeE164Phone(phone);
    final data = <String, dynamic>{
      'name': trimmedName,
      'phone': normalizedPhone,
      'vehicle': vehicle,
      if (licensePlate != null && licensePlate.trim().isNotEmpty)
        'licensePlate': licensePlate.trim(),
      if (lat != null) 'lat': lat,
      if (lng != null) 'lng': lng,
    };

    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.registerRider,
      data: data,
    );
    return RiderDispatchProfile.fromJson(response.data);
  }
}

List<RiderOrderItemSummary> _parseItems(Object? value, String field) {
  if (value == null) return const <RiderOrderItemSummary>[];
  if (value is! List) throw FormatException('Rider $field must be a list or null');
  return value.map(RiderOrderItemSummary.fromJson).toList(growable: false);
}

List<RiderRouteStop> _parseStops(Object? value, String field) {
  if (value == null) return const <RiderRouteStop>[];
  if (value is! List) throw FormatException('Rider $field must be a list or null');
  return value.map(RiderRouteStop.fromJson).toList(growable: false);
}

RiderPharmacyContext? _parsePharmacy(Object? value) {
  if (value == null) return null;
  return RiderPharmacyContext.fromJson(value);
}

RiderMarketContext? _parseMarket(Object? value) {
  if (value == null) return null;
  return RiderMarketContext.fromJson(value);
}

RiderLaundryContext? _parseLaundry(Object? value) {
  if (value == null) return null;
  return RiderLaundryContext.fromJson(value);
}

RiderErrandContext? _parseErrand(Object? value) {
  if (value == null) return null;
  return RiderErrandContext.fromJson(value);
}

RiderParcelContext? _parseParcel(Object? value) {
  if (value == null) return null;
  return RiderParcelContext.fromJson(value);
}

String? _optionalString(Object? value, String field) {
  if (value == null) return null;
  if (value is String) return value;
  throw FormatException('Rider $field must be a string or null');
}

String _requiredString(Object? value, String field) {
  if (value is! String || value.isEmpty) {
    throw FormatException('Missing or invalid rider $field');
  }
  return value;
}

double _requiredDouble(Object? value, String field) {
  if (value is num) return value.toDouble();
  throw FormatException('Missing or invalid rider $field');
}

int _requiredInt(Object? value, String field) {
  if (value is num) return value.toInt();
  throw FormatException('Missing or invalid rider $field');
}

DateTime _requiredDateTime(Object? value, String field) {
  if (value is String) {
    final parsed = DateTime.tryParse(value);
    if (parsed != null) return parsed;
  }
  throw FormatException('Missing or invalid rider $field');
}

double? _optionalDouble(Object? value, String field) {
  if (value == null) return null;
  if (value is num) return value.toDouble();
  throw FormatException('Rider $field must be a number or null');
}

DateTime? _optionalDateTime(Object? value, String field) {
  if (value == null) return null;
  if (value is String) {
    final parsed = DateTime.tryParse(value);
    if (parsed != null) return parsed;
  }
  throw FormatException('Rider $field must be an ISO date or null');
}

String _normalizeBackendPhone(String phone) {
  final compact = phone.replaceAll(RegExp(r'\s+'), '');
  if (compact.startsWith('+')) return compact;
  if (compact.startsWith('233')) return '+$compact';
  if (compact.startsWith('0')) return '+233${compact.substring(1)}';
  return '+$compact';
}

String _normalizeE164Phone(String phone) {
  final normalized = phone.replaceAll(RegExp(r'\s+'), '');
  if (!RegExp(r'^\+\d{8,15}$').hasMatch(normalized)) {
    throw ArgumentError.value(
      phone,
      'phone',
      'Phone must be an E.164-formatted number such as +233241234567',
    );
  }
  return normalized;
}
