import 'dart:convert';

import 'package:image_picker/image_picker.dart';
import 'package:ore_core/ore_core.dart';

import '../dispatch/rider_dispatch_repository.dart';

/// Verified rider-side order actions exposed by the current backend.
class RiderHistoryOrder {
  const RiderHistoryOrder({
    required this.orderId,
    required this.ref,
    required this.serviceCode,
    required this.status,
    required this.vendorName,
    required this.dropoffLabel,
    required this.dropoffLat,
    required this.dropoffLng,
    required this.riderFeePesewas,
    this.tipPesewas = 0,
    this.peakPayPesewas = 0,
    required this.completedAt,
    this.pickupLabel,
    this.pickupAddress,
    this.pickupLat,
    this.pickupLng,
    this.itemsPreview = const <String>[],
  });

  final String orderId;
  final String ref;
  final String serviceCode;
  final String status;
  final String vendorName;
  final String dropoffLabel;
  final double dropoffLat;
  final double dropoffLng;
  final int riderFeePesewas;
  final int tipPesewas;
  final int peakPayPesewas;
  final DateTime completedAt;
  final String? pickupLabel;
  final String? pickupAddress;
  final double? pickupLat;
  final double? pickupLng;
  final List<String> itemsPreview;

  factory RiderHistoryOrder.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('History order must be a JSON object');
    }
    final dropoff = json['dropoff'];
    if (dropoff is! Map) throw const FormatException('History order dropoff is missing');
    final completed = json['completedAt'];
    if (completed is! String) throw const FormatException('History order completion time is missing');
    final completedAt = DateTime.tryParse(completed);
    if (completedAt == null) throw const FormatException('History order completion time is invalid');
    final pickup = json['pickup'];
    final rawItems = json['items'];
    final itemPreview = rawItems is List
        ? rawItems.whereType<Map>().map((item) {
            final qty = (item['qty'] as num?)?.toInt() ?? 1;
            final name = item['name'] is String ? item['name'] as String : 'Item';
            return '${qty}× $name';
          }).toList(growable: false)
        : const <String>[];
    return RiderHistoryOrder(
      orderId: _requiredString(json['orderId'], 'orderId'),
      ref: _requiredString(json['ref'], 'ref'),
      serviceCode: _requiredString(json['serviceCode'], 'serviceCode'),
      status: _requiredString(json['status'], 'status'),
      vendorName: _requiredString(json['vendorName'], 'vendorName'),
      dropoffLabel: _requiredString(dropoff['label'], 'dropoff.label'),
      dropoffLat: (dropoff['lat'] as num).toDouble(),
      dropoffLng: (dropoff['lng'] as num).toDouble(),
      riderFeePesewas: (json['riderFeePesewas'] as num?)?.toInt() ?? 0,
      tipPesewas: (json['tipPesewas'] as num?)?.toInt() ?? 0,
      peakPayPesewas: (json['peakPayPesewas'] as num?)?.toInt() ?? 0,
      completedAt: completedAt,
      pickupLabel: pickup is Map && pickup['name'] is String ? pickup['name'] as String : null,
      pickupAddress: pickup is Map && pickup['address'] is String ? pickup['address'] as String : null,
      pickupLat: pickup is Map && pickup['lat'] is num ? (pickup['lat'] as num).toDouble() : null,
      pickupLng: pickup is Map && pickup['lng'] is num ? (pickup['lng'] as num).toDouble() : null,
      itemsPreview: itemPreview,
    );
  }
}

class RiderOrderRepository {
  const RiderOrderRepository(this._client);

  final OreApiClient _client;

  Future<List<RiderHistoryOrder>> getHistory() async {
    final response = await _client.getFresh<List<dynamic>>(OreEndpoints.riderOrders);
    return (response.data ?? const <dynamic>[]).map(RiderHistoryOrder.fromJson).toList();
  }

  Future<RiderOrderStatus> getOrderStatus(String orderId) async {
    // Delivery status is polled while the rider is active; a cached response
    // would leave the UI behind the backend state machine.
    final response = await _client.getFresh<Map<String, dynamic>>(
      OreEndpoints.orderById(orderId),
    );
    return RiderOrderStatus.fromJson(response.data);
  }

  /// Confirms pickup through Dispatch after the rider is at the vendor.
  Future<void> confirmPickup({
    required String orderId,
    required double riderLat,
    required double riderLng,
  }) async {
    await _client.post<Map<String, dynamic>>(
      OreEndpoints.pickedUp(orderId),
      data: <String, double>{
        'riderLat': riderLat,
        'riderLng': riderLng,
      },
    );
  }

  Future<void> startErrandShopping(String orderId) async {
    await _client.post<Map<String, dynamic>>(OreEndpoints.errandShopping(orderId));
  }

  Future<void> submitErrandReceipt({
    required String orderId,
    required int amountPesewas,
    required XFile photo,
    String? note,
  }) async {
    final bytes = await photo.readAsBytes();
    if (bytes.isEmpty || bytes.length > 5 * 1024 * 1024) {
      throw ArgumentError('Errand receipt photo must be between 1 byte and 5 MB');
    }
    final filename = photo.name.toLowerCase();
    final contentType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
    await _client.post<Map<String, dynamic>>(
      OreEndpoints.errandReceipt(orderId),
      data: <String, dynamic>{
        'amountPesewas': amountPesewas,
        'dataBase64': base64Encode(bytes),
        'contentType': contentType,
        if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
      },
    );
  }

  Future<void> requestErrandSubstitution({
    required String orderId,
    required String item,
    required int pricePesewas,
  }) async {
    await _client.post<Map<String, dynamic>>(
      OreEndpoints.errandSubstitution(orderId),
      data: <String, dynamic>{'item': item, 'pricePesewas': pricePesewas},
    );
  }

  Future<void> readyErrandForDelivery(String orderId) async {
    await _client.post<Map<String, dynamic>>(OreEndpoints.errandReadyForDelivery(orderId));
  }

  Future<void> uploadDeliverySignature({
    required String orderId,
    required String signatureBase64,
    String contentType = 'image/png',
  }) async {
    if (signatureBase64.isEmpty) {
      throw ArgumentError('A signature image is required');
    }
    await _client.post<Map<String, dynamic>>(
      OreEndpoints.deliverySignature(orderId),
      data: <String, dynamic>{
        'signatureBase64': signatureBase64,
        'contentType': contentType,
      },
    );
  }

  Future<void> uploadDeliveryProof({
    required String orderId,
    required XFile photo,
  }) async {
    final bytes = await photo.readAsBytes();
    if (bytes.isEmpty || bytes.length > 2 * 1024 * 1024) {
      throw ArgumentError('Delivery proof photo must be between 1 byte and 2 MB');
    }
    final filename = photo.name.toLowerCase();
    final contentType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
    await _client.post<Map<String, dynamic>>(
      OreEndpoints.deliveryProof(orderId),
      data: <String, dynamic>{
        'photoBase64': base64Encode(bytes),
        'contentType': contentType,
      },
    );
  }

  /// Confirms the customer OTP at the drop-off geofence.
  ///
  /// The current backend transitions the order through the remaining delivery
  /// states and publishes completion from this single verified endpoint.
  Future<RiderOrderActionResult> confirmDeliveryOtp({
    required String orderId,
    required String otp,
    required double riderLat,
    required double riderLng,
  }) async {
    if (!RegExp(r'^\d{4}$').hasMatch(otp)) {
      throw ArgumentError.value(otp, 'otp', 'Customer OTP must contain 4 digits');
    }

    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.confirmDeliveryOtp(orderId),
      data: <String, dynamic>{
        'otp': otp,
        'riderLat': riderLat,
        'riderLng': riderLng,
      },
    );
    return RiderOrderActionResult.fromJson(response.data);
  }
}

class RiderOrderStatus {
  const RiderOrderStatus({
    required this.orderId,
    required this.status,
    required this.otpRequired,
    this.customerName,
    this.customerPhone,
    this.errand,
    this.parcel,
  });

  final String orderId;
  final String status;
  final bool otpRequired;
  final String? customerName;
  final String? customerPhone;
  final RiderErrandContext? errand;
  final RiderParcelContext? parcel;

  factory RiderOrderStatus.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Order status must be a JSON object');
    }
    final otpRequired = json['otpRequired'];
    if (otpRequired is! bool) {
      throw const FormatException('Order status otpRequired must be a boolean');
    }
    final customer = json['customer'];
    final customerName = customer is Map ? customer['name'] : null;
    final customerPhone = customer is Map ? customer['phone'] : null;
    if (customerName != null && customerName is! String) {
      throw const FormatException('Order customer name must be a string or null');
    }
    if (customerPhone != null && customerPhone is! String) {
      throw const FormatException('Order customer phone must be a string or null');
    }
    return RiderOrderStatus(
      orderId: _requiredString(json['orderId'], 'orderId'),
      status: _requiredString(json['status'], 'status'),
      otpRequired: otpRequired,
      customerName: customerName as String?,
      customerPhone: customerPhone as String?,
      errand: _errandFromOrderJson(json['errand']),
      parcel: _parcelFromOrderJson(json['parcel']),
    );
  }
}

class RiderOrderActionResult {
  const RiderOrderActionResult({
    required this.orderId,
    required this.status,
    required this.otpRequired,
  });

  final String orderId;
  final String status;
  final bool otpRequired;

  factory RiderOrderActionResult.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Order action response must be a JSON object');
    }
    final otpRequired = json['otpRequired'];
    if (otpRequired is! bool) {
      throw const FormatException('Order action otpRequired must be a boolean');
    }
    return RiderOrderActionResult(
      orderId: _requiredString(json['orderId'], 'orderId'),
      status: _requiredString(json['status'], 'status'),
      otpRequired: otpRequired,
    );
  }
}

RiderErrandContext? _errandFromOrderJson(Object? value) {
  if (value is! Map) return null;
  final rawReceipts = value['receipts'];
  final substitution = value['substitution'];
  return RiderErrandContext.fromJson(<String, dynamic>{
    'task': value['task'],
    'shopName': value['shopName'],
    'shopLat': value['shopLat'],
    'shopLng': value['shopLng'],
    'budgetPesewas': value['budgetPesewas'],
    'spentPesewas': value['spentPesewas'],
    'remainingBudgetPesewas': ((value['budgetPesewas'] as num?)?.toInt() ?? 0) - ((value['spentPesewas'] as num?)?.toInt() ?? 0),
    'errandStatus': value['errandStatus'],
    'receiptCount': rawReceipts is List ? rawReceipts.length : 0,
    'requiresReceipt': true,
    'substitution': substitution,
  });
}

RiderParcelContext? _parcelFromOrderJson(Object? value) {
  if (value is! Map) return null;
  return RiderParcelContext.fromJson(value);
}

String _requiredString(Object? value, String field) {
  if (value is! String || value.isEmpty) {
    throw FormatException('Missing or invalid order $field');
  }
  return value;
}
