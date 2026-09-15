import 'dart:convert';

import 'package:ore_core/ore_core.dart';

/// Maps the order service's customer-safe DTO into the shared mobile order
/// model. The order service remains the source of truth for status, money and
/// timestamps; this repository deliberately does not invent local state.
class CustomerDeliveryProof {
  const CustomerDeliveryProof({required this.contentType, this.dataBase64, this.downloadUrl});

  final String contentType;
  final String? dataBase64;
  final String? downloadUrl;

  factory CustomerDeliveryProof.fromJson(Object? json) {
    if (json is! Map) throw const FormatException('Delivery proof response is invalid');
    final row = Map<String, dynamic>.from(json);
    return CustomerDeliveryProof(
      contentType: row['contentType']?.toString() ?? 'image/jpeg',
      dataBase64: row['dataBase64']?.toString(),
      downloadUrl: row['downloadUrl']?.toString(),
    );
  }
}

class CustomerLaundryConditionPhoto {
  const CustomerLaundryConditionPhoto({
    required this.contentType,
    required this.uploadedAt,
    this.dataBase64,
    this.downloadUrl,
  });

  final String contentType;
  final DateTime uploadedAt;
  final String? dataBase64;
  final String? downloadUrl;

  factory CustomerLaundryConditionPhoto.fromJson(Object? json) {
    if (json is! Map) throw const FormatException('Laundry condition photo is invalid');
    final row = Map<String, dynamic>.from(json);
    return CustomerLaundryConditionPhoto(
      contentType: row['contentType']?.toString() ?? 'image/jpeg',
      uploadedAt: DateTime.tryParse(row['uploadedAt']?.toString() ?? '') ?? DateTime.now(),
      dataBase64: row['dataBase64']?.toString(),
      downloadUrl: row['downloadUrl']?.toString(),
    );
  }
}

class CustomerOrderRepository {
  const CustomerOrderRepository(this._client);

  final OreApiClient _client;

  Future<OreOrder> getOrder(String orderId) async {
    final response = await _client.getFresh<Map<String, dynamic>>(
      OreEndpoints.orderById(orderId),
    );
    return _orderFromBackend(response.data);
  }

  Future<List<OreOrder>> getHistory() async {
    final response = await _client.getFresh<List<dynamic>>(
      OreEndpoints.customerOrders,
    );
    final rows = response.data ?? const <dynamic>[];
    return rows
        .whereType<Map>()
        .map((row) => _orderFromBackend(Map<String, dynamic>.from(row)))
        .toList(growable: false);
  }

  Future<void> reportIssue({
    required String orderId,
    required String category,
    String? note,
  }) async {
    await _client.post<Map<String, dynamic>>(
      OreEndpoints.orderIssues(orderId),
      data: <String, dynamic>{
        'category': category,
        'note': note,
      },
    );
  }

  /// Customer abort before pickup. The order service is the source of truth;
  /// illegal states return a 409 that the UI must surface.
  Future<OreOrder> cancel({required String orderId, String? reason}) async {
    final trimmed = reason?.trim();
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.cancelOrder(orderId),
      data: <String, dynamic>{
        if (trimmed != null && trimmed.isNotEmpty) 'reason': trimmed,
      },
    );
    return _orderFromBackend(response.data);
  }

  Future<String> getDeliveryOtp(String orderId) async {
    final response = await _client.getFresh<Map<String, dynamic>>(
      OreEndpoints.orderOtp(orderId),
    );
    final otp = response.data?['otp'];
    if (otp is! String || otp.isEmpty) {
      throw const FormatException('Delivery PIN is not available yet');
    }
    return otp;
  }

  Future<CustomerDeliveryProof> getDeliveryProof(String orderId) async {
    final response = await _client.getFresh<Map<String, dynamic>>(
      OreEndpoints.deliveryProof(orderId),
    );
    return CustomerDeliveryProof.fromJson(response.data);
  }

  Future<List<CustomerLaundryConditionPhoto>> getLaundryConditionPhotos(String orderId) async {
    final response = await _client.getFresh<List<dynamic>>(
      OreEndpoints.laundryConditionPhotos(orderId),
    );
    return (response.data ?? const <dynamic>[])
        .map(CustomerLaundryConditionPhoto.fromJson)
        .toList(growable: false);
  }

  Future<void> uploadPrescription({
    required String orderId,
    required List<int> bytes,
    required String contentType,
  }) async {
    await _client.post<Map<String, dynamic>>(
      OreEndpoints.prescription(orderId),
      data: <String, dynamic>{
        'dataBase64': base64Encode(bytes),
        'contentType': contentType,
      },
    );
  }

  /// Fetch receipt photos the rider uploaded for an errand order (baskets /
  /// receipts from the shop), so the customer can verify what was bought.
  Future<List<CustomerDeliveryProof>> getErrandReceipts(String orderId) async {
    final response = await _client.getFresh<List<dynamic>>(OreEndpoints.errandReceipt(orderId));
    final rows = response.data ?? const <dynamic>[];
    return rows
        .whereType<Map>()
        .map((row) => CustomerDeliveryProof.fromJson(row))
        .toList(growable: false);
  }

  OreOrder _orderFromBackend(Map<String, dynamic>? json) {
    if (json == null) {
      throw const FormatException('Customer order response is empty');
    }

    final rawStatus = json['status']?.toString();
    final status = OrderStatus.fromApi(rawStatus);
    final paymentMethod = _paymentMethod(json['paymentMethod']);
    final rawItems = json['items'];
    final items = rawItems is List
        ? rawItems.whereType<Map>().map(_lineItemFromBackend).toList(growable: false)
        : const <OrderLineItem>[];

    final dropoff = _asMap(json['dropoff']);
    final parcel = _asMap(json['parcel']);
    final errand = _asMap(json['errand']);
    final pickup = _asMap(json['pickup']);
    final customer = _asMap(json['customer']);
    final rider = _asMap(json['rider']);

    final parcelSender = _asMap(parcel['sender']);
    final parcelSenderAddress = _asMap(parcelSender['address']);
    final fallbackPickupLat = _number(pickup['lat']) ??
        _number(parcelSenderAddress['lat']) ??
        _number(errand['shopLat']);
    final fallbackPickupLng = _number(pickup['lng']) ??
        _number(parcelSenderAddress['lng']) ??
        _number(errand['shopLng']);

    final riderLat = _number(rider['lat']);
    final riderLng = _number(rider['lng']);
    final hasRiderPosition = riderLat != null &&
        riderLng != null &&
        riderLat != 0 &&
        riderLng != 0;

    final placedAt = _date(json['createdAt']) ??
        _firstTimelineDate(json['timeline']) ??
        DateTime.now();
    final updatedAt = _date(json['updatedAt']) ?? placedAt;
    final etaMinutes = _number(json['etaMinutes'])?.round();

    return OreOrder(
      id: _string(json['orderId']),
      serviceType: _serviceType(
        json['serviceCode']?.toString() ?? json['vendorType']?.toString(),
      ),
      items: items,
      subtotal: _money(json['subtotalPesewas']) ?? _money(json['totalPesewas']) ?? 0,
      deliveryFee: _money(json['deliveryFeePesewas']) ?? 0,
      serviceFee: _money(json['serviceFeePesewas']) ?? 0,
      discount: _money(json['promotionDiscountPesewas']) ?? 0,
      riderTip: _money(json['tipPesewas']),
      total: _money(json['totalPesewas']) ?? 0,
      paymentMethod: paymentMethod,
      isPaid: paymentMethod != PaymentMethod.cash &&
          rawStatus?.toUpperCase() != 'PENDING_PAYMENT' &&
          rawStatus?.toUpperCase() != 'AWAITING_RECIPIENT',
      paymentPending: rawStatus?.toUpperCase() == 'PENDING_PAYMENT',
      address: OreAddress(
        label: _string(dropoff['label'], fallback: 'Delivery address'),
        street: _string(dropoff['label']),
        city: 'Cape Coast',
        lat: _number(dropoff['lat']),
        lng: _number(dropoff['lng']),
      ),
      vendorId: _string(json['vendorId']),
      vendorName: _string(json['vendorName'], fallback: 'Ore order'),
      riderId: _stringOrNull(rider['id']),
      riderName: _stringOrNull(rider['name']),
      riderPhone: _stringOrNull(rider['phone']),
      pickupLat: fallbackPickupLat,
      pickupLng: fallbackPickupLng,
      riderLat: hasRiderPosition ? riderLat : null,
      riderLng: hasRiderPosition ? riderLng : null,
      status: status,
      placedAt: placedAt,
      updatedAt: updatedAt,
      eta: etaMinutes == null ? '' : '~$etaMinutes min',
      otpRequired: json['otpRequired'] as bool? ?? false,
      prescriptionRequired: json['prescriptionRequired'] as bool? ?? false,
      prescriptionStatus: _stringOrNull(json['prescriptionStatus']),
      prescriptionReviewNote: _stringOrNull(json['prescriptionReviewNote']),
      laundryStage: _stringOrNull(json['laundryStage']),
      marketFulfillment: json['marketFulfillment'] is Map
          ? Map<String, dynamic>.from(json['marketFulfillment'] as Map)
          : null,
      specialInstructions: _stringOrNull(json['dropNote']) ?? _stringOrNull(json['note']),
      leaveAtDoor: json['leaveAtDoor'] == true,
      parcelDetails: parcel.isEmpty ? null : _parcelDetails(parcel),
      errandDetails: errand.isEmpty ? null : _errandDetails(errand),
      customerName: _stringOrNull(customer['name']),
      customerPhone: _stringOrNull(customer['phone']),
    );
  }

  OrderLineItem _lineItemFromBackend(Map raw) {
    final item = Map<String, dynamic>.from(raw);
    final selected = item['selectedOptions'];
    final addons = selected is List
        ? selected.whereType<Map>().map((option) {
            final row = Map<String, dynamic>.from(option);
            return SelectedAddon(
              groupId: _string(row['groupId']),
              groupName: _string(row['groupName']),
              optionId: _string(row['optionId']),
              optionName: _string(row['optionName']),
              priceAdjustment: _money(row['priceAdjustmentPesewas']) ?? 0,
            );
          }).toList(growable: false)
        : const <SelectedAddon>[];

    return OrderLineItem(
      productId: _string(item['itemId']),
      title: _string(item['name'], fallback: 'Item'),
      unitPrice: _money(item['unitPricePesewas']) ?? 0,
      quantity: _number(item['qty'])?.toInt() ?? 1,
      addons: addons
          .map((addon) => <String, dynamic>{
                'group': addon.groupName,
                'name': addon.optionName,
                'price': addon.priceAdjustment,
              })
          .toList(growable: false),
    );
  }

  ParcelDetails _parcelDetails(Map<String, dynamic> json) {
    final sender = _asMap(json['sender']);
    final recipient = _asMap(json['recipient']);
    return ParcelDetails(
      category: _string(json['category'], fallback: 'PACKAGE'),
      weightKg: _number(json['weightKg']),
      value: _money(json['declaredValuePesewas']) ?? 0,
      description: _stringOrNull(json['description']),
      isFragile: json['fragile'] as bool? ?? false,
      sealed: json['sealed'] as bool? ?? false,
      proofMode: _stringOrNull(json['proofMode']),
      parcelStatus: _stringOrNull(json['parcelStatus']),
      returnReason: _stringOrNull(json['returnReason']),
      pickupAddress: _parcelAddress(_asMap(sender['address'])),
      recipientAddress: _parcelAddress(_asMap(recipient['address'])),
      recipientName: _stringOrNull(recipient['name']),
      recipientPhone: _stringOrNull(recipient['phone']),
    );
  }

  ErrandDetails _errandDetails(Map<String, dynamic> json) {
    final lat = _number(json['shopLat']);
    final lng = _number(json['shopLng']);
    final substitution = _asMap(json['substitution']);
    return ErrandDetails(
      taskTitle: _string(json['task'], fallback: 'Errand'),
      budget: _money(json['budgetPesewas']) ?? 0,
      spent: _money(json['spentPesewas']) ?? 0,
      receiptCount: json['receipts'] is List ? (json['receipts'] as List).length : 0,
      description: _stringOrNull(json['errandStatus']),
      errandStatus: _stringOrNull(json['errandStatus']),
      substitutionItem: _stringOrNull(substitution['item']),
      substitutionPrice: _money(substitution['pricePesewas']),
      substitutionStatus: _stringOrNull(substitution['status']),
      compensation: _money(json['compensationPesewas']) ?? 0,
      location: OreAddress(
        label: _string(json['shopName'], fallback: 'Shop'),
        street: _string(json['shopName'], fallback: 'Shop'),
        city: 'Cape Coast',
        lat: lat,
        lng: lng,
      ),
      requiresReceipt: true,
    );
  }

  OreAddress _parcelAddress(Map<String, dynamic> json) => OreAddress(
        label: _string(json['label'], fallback: 'Address'),
        street: _string(json['label'], fallback: 'Address'),
        city: 'Cape Coast',
        lat: _number(json['lat']),
        lng: _number(json['lng']),
      );

  PaymentMethod _paymentMethod(Object? value) {
    switch (value?.toString().toUpperCase()) {
      case 'COD':
        return PaymentMethod.cash;
      case 'WALLET':
        return PaymentMethod.wallet;
      case 'CARD':
        return PaymentMethod.card;
      case 'PREPAID':
      default:
        return PaymentMethod.momo;
    }
  }

  ServiceType _serviceType(String? value) {
    switch (value?.toUpperCase()) {
      case 'FO':
      case 'FOOD':
        return ServiceType.food;
      case 'GR':
      case 'GROCERY':
      case 'GROCERIES':
        return ServiceType.groceries;
      case 'MK':
      case 'MARKET':
        return ServiceType.market;
      case 'SH':
      case 'SHOP':
        return ServiceType.shop;
      case 'PH':
      case 'PHARMACY':
        return ServiceType.pharmacy;
      case 'LD':
      case 'LAUNDRY':
        return ServiceType.laundry;
      case 'PR':
      case 'PARCEL':
        return ServiceType.parcel;
      case 'ER':
      case 'ERRAND':
        return ServiceType.errand;
      default:
        return ServiceType.food;
    }
  }
}

Map<String, dynamic> _asMap(Object? value) => value is Map
    ? Map<String, dynamic>.from(value)
    : <String, dynamic>{};

String _string(Object? value, {String fallback = ''}) =>
    value is String && value.trim().isNotEmpty ? value : fallback;

String? _stringOrNull(Object? value) {
  final result = _string(value);
  return result.isEmpty ? null : result;
}

double? _number(Object? value) => value is num ? value.toDouble() : double.tryParse(value?.toString() ?? '');

double? _money(Object? value) {
  final pesewas = _number(value);
  return pesewas == null ? null : pesewas / 100;
}

DateTime? _date(Object? value) => value is String ? DateTime.tryParse(value) : null;

DateTime? _firstTimelineDate(Object? value) {
  if (value is! List) return null;
  for (final row in value.whereType<Map>()) {
    final date = _date(row['at']);
    if (date != null) return date;
  }
  return null;
}
