import 'dart:convert';
import 'dart:typed_data';

import 'package:ore_core/ore_core.dart';

class VendorOrderItem {
  const VendorOrderItem({
    required this.id,
    required this.itemId,
    required this.name,
    required this.qty,
    required this.unitPricePesewas,
    required this.prepTimeMin,
    required this.modifiers,
    required this.selectedOptions,
    required this.optionsTotalPesewas,
  });

  final String id;
  final String itemId;
  final String name;
  final int qty;
  final int unitPricePesewas;
  final int prepTimeMin;
  final List<String> modifiers;
  final List<Map<String, dynamic>> selectedOptions;
  final int optionsTotalPesewas;

  factory VendorOrderItem.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Vendor order item must be an object');
    }
    return VendorOrderItem(
      id: _requiredString(json['id'], 'item.id'),
      itemId: _requiredString(json['itemId'], 'item.itemId'),
      name: _requiredString(json['name'], 'item.name'),
      qty: _requiredInt(json['qty'], 'item.qty'),
      unitPricePesewas: _requiredInt(json['unitPricePesewas'], 'item.unitPricePesewas'),
      prepTimeMin: _requiredInt(json['prepTimeMin'], 'item.prepTimeMin'),
      modifiers: json['modifiers'] is List
          ? (json['modifiers'] as List).whereType<String>().toList()
          : const <String>[],
      selectedOptions: json['selectedOptions'] is List
          ? (json['selectedOptions'] as List).whereType<Map>().map((option) => Map<String, dynamic>.from(option)).toList()
          : const <Map<String, dynamic>>[],
      optionsTotalPesewas: (json['optionsTotalPesewas'] as num?)?.toInt() ?? 0,
    );
  }
}

class VendorOrderIssue {
  const VendorOrderIssue({required this.id, required this.orderId, required this.category, required this.status, this.note, this.resolutionNote, this.createdAt, this.resolvedAt});

  final String id;
  final String orderId;
  final String category;
  final String status;
  final String? note;
  final String? resolutionNote;
  final DateTime? createdAt;
  final DateTime? resolvedAt;

  factory VendorOrderIssue.fromJson(Object? json) {
    if (json is! Map || json['id'] is! String || json['orderId'] is! String || json['category'] is! String || json['status'] is! String) throw const FormatException('Order issue fields are invalid');
    return VendorOrderIssue(id: json['id'] as String, orderId: json['orderId'] as String, category: json['category'] as String, status: json['status'] as String, note: json['note'] as String?, resolutionNote: json['resolutionNote'] as String?, createdAt: json['createdAt'] is String ? DateTime.tryParse(json['createdAt'] as String) : null, resolvedAt: json['resolvedAt'] is String ? DateTime.tryParse(json['resolvedAt'] as String) : null);
  }
}

class VendorMarketFulfillmentLine {
  const VendorMarketFulfillmentLine({required this.orderItemId, required this.actualQuantity, required this.unit, this.actualPricePesewas, this.note});

  final String orderItemId;
  final double actualQuantity;
  final String unit;
  final int? actualPricePesewas;
  final String? note;

  factory VendorMarketFulfillmentLine.fromJson(Object? json) {
    if (json is! Map) throw const FormatException('Market fulfillment line must be an object');
    return VendorMarketFulfillmentLine(
      orderItemId: _requiredString(json['orderItemId'], 'marketFulfillment.orderItemId'),
      actualQuantity: _requiredDouble(json['actualQuantity'], 'marketFulfillment.actualQuantity'),
      unit: _requiredString(json['unit'], 'marketFulfillment.unit'),
      actualPricePesewas: json['actualPricePesewas'] is num ? (json['actualPricePesewas'] as num).toInt() : null,
      note: json['note'] as String?,
    );
  }
}

class VendorMarketFulfillment {
  const VendorMarketFulfillment({required this.recordedAt, required this.lines});

  final DateTime recordedAt;
  final List<VendorMarketFulfillmentLine> lines;

  factory VendorMarketFulfillment.fromJson(Object? json) {
    if (json is! Map || json['recordedAt'] is! String || json['lines'] is! List) {
      throw const FormatException('Market fulfillment must contain a timestamp and lines');
    }
    final recordedAt = DateTime.tryParse(json['recordedAt'] as String);
    if (recordedAt == null) throw const FormatException('Market fulfillment timestamp is invalid');
    return VendorMarketFulfillment(recordedAt: recordedAt, lines: (json['lines'] as List).map(VendorMarketFulfillmentLine.fromJson).toList());
  }
}

class VendorOrder {
  const VendorOrder({
    required this.orderId,
    required this.ref,
    required this.serviceCode,
    required this.status,
    required this.paymentMethod,
    required this.totalPesewas,
    required this.prepTimeMin,
    required this.createdAt,
    required this.items,
    this.customer,
    this.rider,
    this.completedAt,
    this.etaMinutes,
    this.note,
    this.promotionTitle,
    this.promotionDiscountPesewas = 0,
    this.tipPesewas = 0,
    this.peakPayPesewas = 0,
    this.prescriptionRequired = false,
    this.prescriptionStatus = 'NOT_REQUIRED',
    this.prescriptionReviewNote,
    this.conditionJson,
    this.marketFulfillment,
    this.laundryStage,
    this.leaveAtDoor = false,
    this.dropNote,
    this.scheduledFor,
  });

  final String orderId;
  final String ref;
  final String serviceCode;
  final String status;
  final String paymentMethod;
  final int totalPesewas;
  final int prepTimeMin;
  final DateTime createdAt;
  final DateTime? completedAt;
  final int? etaMinutes;
  final String? note;
  final String? promotionTitle;
  final int promotionDiscountPesewas;
  final int tipPesewas;
  final int peakPayPesewas;
  final List<VendorOrderItem> items;
  final VendorOrderContact? customer;
  final VendorOrderContact? rider;
  final bool prescriptionRequired;
  final String prescriptionStatus;
  final String? prescriptionReviewNote;
  final Map<String, dynamic>? conditionJson;
  final VendorMarketFulfillment? marketFulfillment;
  final String? laundryStage;
  final bool leaveAtDoor;
  final String? dropNote;
  final DateTime? scheduledFor;

  factory VendorOrder.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Vendor order must be an object');
    }
    final itemJson = json['items'];
    if (itemJson is! List) throw const FormatException('Vendor order items must be a list');
    return VendorOrder(
      orderId: _requiredString(json['orderId'], 'order.orderId'),
      ref: _requiredString(json['ref'], 'order.ref'),
      serviceCode: _requiredString(json['serviceCode'], 'order.serviceCode'),
      status: _requiredString(json['status'], 'order.status'),
      paymentMethod: _requiredString(json['paymentMethod'], 'order.paymentMethod'),
      totalPesewas: _requiredInt(json['totalPesewas'], 'order.totalPesewas'),
      prepTimeMin: _requiredInt(json['prepTimeMin'], 'order.prepTimeMin'),
      createdAt: _requiredDateTime(json['timeline']),
      completedAt: _optionalDateTime(json['completedAt']),
      etaMinutes: json['etaMinutes'] is num ? (json['etaMinutes'] as num).toInt() : null,
      note: json['note'] as String?,
      promotionTitle: json['promotionTitle'] as String?,
      promotionDiscountPesewas: json['promotionDiscountPesewas'] is num ? (json['promotionDiscountPesewas'] as num).toInt() : 0,
      tipPesewas: json['tipPesewas'] is num ? (json['tipPesewas'] as num).toInt() : 0,
      peakPayPesewas: json['peakPayPesewas'] is num ? (json['peakPayPesewas'] as num).toInt() : 0,
      items: itemJson.map(VendorOrderItem.fromJson).toList(),
      customer: _optionalContact(json['customer']),
      rider: _optionalContact(json['rider']),
      prescriptionRequired: json['prescriptionRequired'] is bool ? json['prescriptionRequired'] as bool : false,
      prescriptionStatus: (json['prescriptionStatus'] as String?) ?? 'NOT_REQUIRED',
      prescriptionReviewNote: json['prescriptionReviewNote'] as String?,
      conditionJson: json['conditionJson'] is Map ? Map<String, dynamic>.from(json['conditionJson'] as Map) : null,
      marketFulfillment: json['marketFulfillment'] == null ? null : VendorMarketFulfillment.fromJson(json['marketFulfillment']),
      laundryStage: json['laundryStage'] as String?,
      leaveAtDoor: json['leaveAtDoor'] == true,
      dropNote: json['dropNote'] as String?,
      scheduledFor: json['scheduledFor'] is String ? DateTime.tryParse(json['scheduledFor'] as String) : null,
    );
  }
}

class VendorPrescriptionContent {
  const VendorPrescriptionContent({required this.contentType, this.bytes, this.downloadUrl});

  final String contentType;
  final Uint8List? bytes;
  final String? downloadUrl;
}

class VendorOrderContact {
  const VendorOrderContact({required this.id, required this.name, required this.phone});

  final String id;
  final String name;
  final String phone;
}

class VendorOrderRepository {
  const VendorOrderRepository(this._client);

  final OreApiClient _client;

  Future<List<VendorOrder>> list({required String vendorId, String? status, String? query, DateTime? from, DateTime? to}) async {
    final response = await _client.getFresh<List<dynamic>>(
      OreEndpoints.vendorOrders(vendorId),
      query: <String, dynamic>{
        if (status != null) 'status': status,
        if (query != null && query.trim().isNotEmpty) 'q': query.trim(),
        if (from != null) 'from': from.toUtc().toIso8601String(),
        if (to != null) 'to': to.toUtc().toIso8601String(),
      },
    );
    return (response.data ?? const <dynamic>[]).map(VendorOrder.fromJson).toList();
  }

  Future<VendorOrder> get(String orderId) async {
    final response = await _client.getFresh<Map<String, dynamic>>(
      OreEndpoints.orderById(orderId),
    );
    return VendorOrder.fromJson(response.data);
  }

  Future<VendorOrder> accept(String orderId) => _action(OreEndpoints.acceptOrder(orderId));
  Future<VendorOrder> reject(String orderId, {String? reason}) =>
      _action(OreEndpoints.rejectOrder(orderId), data: <String, dynamic>{'reason': reason});
  Future<VendorOrder> ready(String orderId) => _action(OreEndpoints.readyOrder(orderId));
  Future<VendorOrder> delay(String orderId, int extraMinutes) =>
      _action(OreEndpoints.delayOrder(orderId), data: <String, dynamic>{'extraMinutes': extraMinutes});

  Future<VendorOrder> updateLaundryStage(String orderId, String stage) =>
      _action(OreEndpoints.laundryStage(orderId), data: <String, dynamic>{'stage': stage});

  Future<VendorOrder> recordLaundryCondition(String orderId, Map<String, dynamic> condition) =>
      _action(OreEndpoints.laundryCondition(orderId), data: <String, dynamic>{'condition': condition});

  Future<VendorOrder> recordMarketFulfillment(String orderId, List<Map<String, dynamic>> lines) =>
      _action(OreEndpoints.marketFulfillment(orderId), data: <String, dynamic>{'lines': lines});

  Future<void> uploadLaundryConditionPhoto({
    required String orderId,
    required List<int> bytes,
    required String contentType,
  }) async {
    if (bytes.isEmpty || bytes.length > 5 * 1024 * 1024) throw ArgumentError('Laundry condition photo must be between 1 byte and 5 MB');
    await _client.post<Map<String, dynamic>>(
      OreEndpoints.laundryConditionPhotos(orderId),
      data: <String, dynamic>{'dataBase64': base64Encode(bytes), 'contentType': contentType},
    );
  }

  Future<void> reportIssue(String orderId, String category, {String? note}) async {
    await _client.post<Map<String, dynamic>>(
      OreEndpoints.orderIssues(orderId),
      data: <String, dynamic>{'category': category, 'note': note},
    );
  }

  Future<List<VendorOrderIssue>> listIssues(String orderId) async {
    final response = await _client.getFresh<List<dynamic>>(OreEndpoints.orderIssues(orderId));
    return (response.data ?? const <dynamic>[]).map(VendorOrderIssue.fromJson).toList();
  }

  Future<VendorOrderIssue> acknowledgeIssue(String orderId, String issueId, {String? note}) async {
    final response = await _client.patch<Map<String, dynamic>>(OreEndpoints.orderIssue(orderId, issueId), data: <String, dynamic>{'status': 'ACKNOWLEDGED', 'note': note});
    return VendorOrderIssue.fromJson(response.data);
  }

  Future<VendorPrescriptionContent> getPrescription(String orderId) async {
    final response = await _client.getFresh<Map<String, dynamic>>(OreEndpoints.prescription(orderId));
    final body = response.data;
    if (body == null) throw const FormatException('Prescription response is empty');
    return VendorPrescriptionContent(
      contentType: _requiredString(body['contentType'], 'prescription.contentType'),
      bytes: body['dataBase64'] is String ? Uint8List.fromList(base64Decode(body['dataBase64'] as String)) : null,
      downloadUrl: body['downloadUrl'] as String?,
    );
  }

  Future<VendorOrder> approvePrescription(String orderId, {String? note}) =>
      _action(OreEndpoints.approvePrescription(orderId), data: <String, dynamic>{'note': note});

  Future<VendorOrder> rejectPrescription(String orderId, {String? note}) =>
      _action(OreEndpoints.rejectPrescription(orderId), data: <String, dynamic>{'note': note});

  Future<VendorOrder> _action(String path, {Map<String, dynamic>? data}) async {
    final response = await _client.post<Map<String, dynamic>>(path, data: data);
    return VendorOrder.fromJson(response.data);
  }
}

String _requiredString(Object? value, String field) {
  if (value is! String || value.isEmpty) throw FormatException('Missing or invalid $field');
  return value;
}

int _requiredInt(Object? value, String field) {
  if (value is num) return value.toInt();
  throw FormatException('Missing or invalid $field');
}

double _requiredDouble(Object? value, String field) {
  if (value is num && value.isFinite) return value.toDouble();
  throw FormatException('Missing or invalid $field');
}

DateTime _requiredDateTime(Object? timeline) {
  if (timeline is List && timeline.isNotEmpty && timeline.first is Map) {
    final at = (timeline.first as Map)['at'];
    if (at is String) {
      final parsed = DateTime.tryParse(at);
      if (parsed != null) return parsed;
    }
  }
  throw const FormatException('Vendor order timeline is missing a valid timestamp');
}

DateTime? _optionalDateTime(Object? value) {
  if (value == null) return null;
  if (value is String) return DateTime.tryParse(value);
  throw const FormatException('Optional order timestamp must be a string or null');
}

VendorOrderContact? _optionalContact(Object? value) {
  if (value == null) return null;
  if (value is! Map) throw const FormatException('Order contact must be an object or null');
  return VendorOrderContact(
    id: _requiredString(value['id'], 'contact.id'),
    name: _requiredString(value['name'], 'contact.name'),
    phone: value['phone'] is String ? value['phone'] as String : '',
  );
}
