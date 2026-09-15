import 'dart:convert';

import 'package:ore_core/ore_core.dart';

class VendorMenuItem {
  const VendorMenuItem({
    required this.id,
    required this.vendorId,
    required this.name,
    required this.category,
    required this.pricePesewas,
    required this.prepTimeMin,
    required this.available,
    this.unit = 'each',
    this.stock,
    this.prescriptionOnly = false,
    this.modifiers = const <String>[],
    this.addonGroups = const <Map<String, dynamic>>[],
    this.imageKey,
    this.imageUrl,
    this.imageContentType,
    this.sku,
    this.expiryDate,
    this.dosage,
    this.turnaround,
    this.dailyMarketPrice = false,
    this.garmentType,
    this.conditionJson,
    this.dietaryTags = const <String>[],
    this.description,
  });

  final String id;
  final String vendorId;
  final String name;
  final String category;
  final int pricePesewas;
  final int prepTimeMin;
  final bool available;
  final String unit;
  final int? stock;
  final bool prescriptionOnly;
  final List<String> modifiers;
  final List<Map<String, dynamic>> addonGroups;
  final String? imageKey;
  final String? imageUrl;
  final String? imageContentType;
  final String? sku;
  final DateTime? expiryDate;
  final String? dosage;
  final String? turnaround;
  final bool dailyMarketPrice;
  final String? garmentType;
  final Map<String, dynamic>? conditionJson;
  final List<String> dietaryTags;
  final String? description;

  factory VendorMenuItem.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Vendor menu item must be a JSON object');
    }
    return VendorMenuItem(
      id: _requiredString(json['id'], 'item.id'),
      vendorId: _requiredString(json['vendorId'], 'item.vendorId'),
      name: _requiredString(json['name'], 'item.name'),
      category: _requiredString(json['category'], 'item.category'),
      pricePesewas: _requiredInt(json['pricePesewas'], 'item.pricePesewas'),
      prepTimeMin: _requiredInt(json['prepTimeMin'], 'item.prepTimeMin'),
      available: _requiredBool(json['available'], 'item.available'),
      unit: json['unit'] is String ? json['unit'] as String : 'each',
      stock: json['stock'] is num ? (json['stock'] as num).toInt() : null,
      prescriptionOnly: json['prescriptionOnly'] is bool ? json['prescriptionOnly'] as bool : false,
      modifiers: json['modifiers'] is List
          ? (json['modifiers'] as List).whereType<String>().toList()
          : const <String>[],
      addonGroups: json['addonGroups'] is List
          ? (json['addonGroups'] as List).whereType<Map>().map((group) => Map<String, dynamic>.from(group)).toList()
          : const <Map<String, dynamic>>[],
      imageKey: json['imageKey'] as String?,
      imageUrl: json['imageUrl'] as String?,
      imageContentType: json['imageContentType'] as String?,
      sku: json['sku'] as String?,
      expiryDate: _optionalDateTime(json['expiryDate']),
      dosage: json['dosage'] as String?,
      turnaround: json['turnaround'] as String?,
      dailyMarketPrice: json['dailyMarketPrice'] is bool ? json['dailyMarketPrice'] as bool : false,
      garmentType: json['garmentType'] as String?,
      conditionJson: json['conditionJson'] is Map ? Map<String, dynamic>.from(json['conditionJson'] as Map) : null,
      dietaryTags: json['dietaryTags'] is List ? (json['dietaryTags'] as List).whereType<String>().toList() : const <String>[],
      description: json['description'] as String?,
    );
  }

  VendorMenuItem copyWith({
    String? name,
    String? category,
    int? pricePesewas,
    int? prepTimeMin,
    bool? available,
    String? description,
    String? imageUrl,
  }) {
    return VendorMenuItem(
      id: id,
      vendorId: vendorId,
      name: name ?? this.name,
      category: category ?? this.category,
      pricePesewas: pricePesewas ?? this.pricePesewas,
      prepTimeMin: prepTimeMin ?? this.prepTimeMin,
      available: available ?? this.available,
      unit: unit,
      stock: stock,
      prescriptionOnly: prescriptionOnly,
      modifiers: modifiers,
      addonGroups: addonGroups,
      imageKey: imageKey,
      imageUrl: imageUrl ?? this.imageUrl,
      imageContentType: imageContentType,
      sku: sku,
      expiryDate: expiryDate,
      dosage: dosage,
      turnaround: turnaround,
      dailyMarketPrice: dailyMarketPrice,
      garmentType: garmentType,
      conditionJson: conditionJson,
      dietaryTags: dietaryTags,
      description: description ?? this.description,
    );
  }
}

class VendorLocationRecord {
  const VendorLocationRecord({required this.id, required this.name, required this.address, required this.lat, required this.lng, required this.deliveryRadiusKm, required this.accepting});

  final String id;
  final String name;
  final String address;
  final double lat;
  final double lng;
  final double deliveryRadiusKm;
  final bool accepting;

  factory VendorLocationRecord.fromJson(Object? json) {
    if (json is! Map) throw const FormatException('Vendor location fields are invalid');
    if (json['id'] is! String || json['name'] is! String || json['address'] is! String || json['lat'] is! num || json['lng'] is! num || json['deliveryRadiusKm'] is! num || json['accepting'] is! bool) throw const FormatException('Vendor location fields are invalid');
    return VendorLocationRecord(id: json['id'] as String, name: json['name'] as String, address: json['address'] as String, lat: (json['lat'] as num).toDouble(), lng: (json['lng'] as num).toDouble(), deliveryRadiusKm: (json['deliveryRadiusKm'] as num).toDouble(), accepting: json['accepting'] as bool);
  }
}

class VendorStaffRecord {
  const VendorStaffRecord({required this.id, required this.userId, required this.displayName, required this.staffRole, required this.active, this.phone});

  final String id;
  final String userId;
  final String displayName;
  final String staffRole;
  final bool active;
  final String? phone;

  factory VendorStaffRecord.fromJson(Object? json) {
    if (json is! Map || json['id'] is! String || json['userId'] is! String || json['displayName'] is! String || json['staffRole'] is! String || json['active'] is! bool) throw const FormatException('Vendor staff fields are invalid');
    return VendorStaffRecord(id: json['id'] as String, userId: json['userId'] as String, displayName: json['displayName'] as String, staffRole: json['staffRole'] as String, active: json['active'] as bool, phone: json['phone'] as String?);
  }
}

class VendorPosConnectionRecord {
  const VendorPosConnectionRecord({required this.id, required this.provider, required this.active, required this.webhookPath, this.externalStoreId, this.lastReceivedAt});

  final String id;
  final String provider;
  final String? externalStoreId;
  final bool active;
  final String webhookPath;
  final DateTime? lastReceivedAt;

  factory VendorPosConnectionRecord.fromJson(Object? json) {
    if (json is! Map || json['id'] is! String || json['provider'] is! String || json['active'] is! bool || json['webhookPath'] is! String) throw const FormatException('POS connection fields are invalid');
    return VendorPosConnectionRecord(id: json['id'] as String, provider: json['provider'] as String, externalStoreId: json['externalStoreId'] as String?, active: json['active'] as bool, webhookPath: json['webhookPath'] as String, lastReceivedAt: json['lastReceivedAt'] is String ? DateTime.tryParse(json['lastReceivedAt'] as String) : null);
  }
}

class VendorProfile {
  const VendorProfile({
    required this.id,
    required this.name,
    required this.vendorType,
    required this.approved,
    required this.lat,
    required this.lng,
    required this.deliveryRadiusKm,
    required this.acceptsCod,
    required this.accepting,
    required this.openNow,
    required this.plan,
    this.defaultPrepTimeMin = 10,
    this.maxConcurrentOrders = 5,
    this.hoursJson = const <String, List<Map<String, String>>>{},
    this.holidayHoursJson = const <String, Map<String, dynamic>>{},
    this.publicId,
    this.logoUrl,
    this.bannerUrl,
    this.suspendUntil,
  });

  final String id;
  final String name;
  final String vendorType;
  final bool approved;
  final String? publicId;
  final String? logoUrl;
  final String? bannerUrl;
  final double lat;
  final double lng;
  final double deliveryRadiusKm;
  final bool acceptsCod;
  final bool accepting;
  final bool openNow;
  final String plan;
  final int defaultPrepTimeMin;
  final int maxConcurrentOrders;
  final Map<String, List<Map<String, String>>> hoursJson;
  final Map<String, Map<String, dynamic>> holidayHoursJson;
  final DateTime? suspendUntil;

  factory VendorProfile.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Vendor profile must be a JSON object');
    }
    return VendorProfile(
      id: _requiredString(json['id'], 'vendor.id'),
      name: _requiredString(json['name'], 'vendor.name'),
      vendorType: _requiredString(json['vendorType'], 'vendor.vendorType'),
      approved: _requiredBool(json['approved'], 'vendor.approved'),
      publicId: json['publicId'] as String?,
      logoUrl: _absoluteUrl(json['logoUrl'] as String?, OreApiClient.defaultBaseUrl),
      bannerUrl: _absoluteUrl(json['bannerUrl'] as String?, OreApiClient.defaultBaseUrl),
      lat: _requiredDouble(json['lat'], 'vendor.lat'),
      lng: _requiredDouble(json['lng'], 'vendor.lng'),
      deliveryRadiusKm: _requiredDouble(json['deliveryRadiusKm'], 'vendor.deliveryRadiusKm'),
      acceptsCod: _requiredBool(json['acceptsCod'], 'vendor.acceptsCod'),
      accepting: _requiredBool(json['accepting'], 'vendor.accepting'),
      openNow: _requiredBool(json['openNow'], 'vendor.openNow'),
      plan: (json['plan'] as String?) ?? 'STANDARD',
      defaultPrepTimeMin: json['defaultPrepTimeMin'] is num ? (json['defaultPrepTimeMin'] as num).toInt() : 10,
      maxConcurrentOrders: json['maxConcurrentOrders'] is num ? (json['maxConcurrentOrders'] as num).toInt() : 5,
      hoursJson: _parseHours(json['hoursJson']),
      holidayHoursJson: json['holidayHoursJson'] is Map ? (json['holidayHoursJson'] as Map).map((key, value) => MapEntry(key.toString(), value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{})) : const <String, Map<String, dynamic>>{},
      suspendUntil: _optionalDateTime(json['suspendUntil']),
    );
  }
}

class VendorSnapshot {
  const VendorSnapshot({required this.vendor, required this.menu});

  final VendorProfile vendor;
  final List<VendorMenuItem> menu;

  factory VendorSnapshot.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Vendor snapshot must be a JSON object');
    }
    final menuJson = json['menu'];
    if (menuJson is! List) {
      throw const FormatException('Vendor snapshot menu must be a list');
    }
    return VendorSnapshot(
      vendor: VendorProfile.fromJson(json['vendor']),
      menu: menuJson.map(VendorMenuItem.fromJson).toList(),
    );
  }
}

class VendorReviewRecord {
  const VendorReviewRecord({required this.id, required this.orderId, required this.rating, required this.createdAt, this.comment, this.vendorResponse, this.respondedAt});

  final String id;
  final String orderId;
  final int rating;
  final DateTime createdAt;
  final String? comment;
  final String? vendorResponse;
  final DateTime? respondedAt;

  factory VendorReviewRecord.fromJson(Object? json) {
    if (json is! Map || json['id'] is! String || json['orderId'] is! String || json['rating'] is! num || json['createdAt'] is! String) throw const FormatException('Vendor review fields are invalid');
    final createdAt = DateTime.tryParse(json['createdAt'] as String);
    if (createdAt == null) throw const FormatException('Vendor review date is invalid');
    return VendorReviewRecord(id: json['id'] as String, orderId: json['orderId'] as String, rating: (json['rating'] as num).toInt(), createdAt: createdAt, comment: json['comment'] as String?, vendorResponse: json['vendorResponse'] as String?, respondedAt: json['respondedAt'] is String ? DateTime.tryParse(json['respondedAt'] as String) : null);
  }
}

class VendorPromotionRecord {
  const VendorPromotionRecord({required this.id, required this.title, required this.discountType, required this.discountValue, required this.minimumSubtotalPesewas, required this.startsAt, required this.endsAt, required this.active, this.budgetPesewas, this.redemptionLimit, this.spentPesewas = 0, this.redemptionsUsed = 0, this.code});

  final String id;
  final String title;
  final String discountType;
  final int discountValue;
  final int minimumSubtotalPesewas;
  final DateTime startsAt;
  final DateTime endsAt;
  final bool active;
  final int? budgetPesewas;
  final int? redemptionLimit;
  final int spentPesewas;
  final int redemptionsUsed;
  final String? code;

  factory VendorPromotionRecord.fromJson(Object? json) {
    if (json is! Map) throw const FormatException('Vendor promotion must be an object');
    final startsAt = DateTime.tryParse(json['startsAt']?.toString() ?? '');
    final endsAt = DateTime.tryParse(json['endsAt']?.toString() ?? '');
    if (json['id'] is! String || json['title'] is! String || json['discountType'] is! String || json['discountValue'] is! num || startsAt == null || endsAt == null || json['active'] is! bool) {
      throw const FormatException('Vendor promotion fields are invalid');
    }
    return VendorPromotionRecord(id: json['id'] as String, title: json['title'] as String, discountType: json['discountType'] as String, discountValue: (json['discountValue'] as num).toInt(), minimumSubtotalPesewas: json['minimumSubtotalPesewas'] is num ? (json['minimumSubtotalPesewas'] as num).toInt() : 0, startsAt: startsAt, endsAt: endsAt, active: json['active'] as bool, budgetPesewas: json['budgetPesewas'] is num ? (json['budgetPesewas'] as num).toInt() : null, redemptionLimit: json['redemptionLimit'] is num ? (json['redemptionLimit'] as num).toInt() : null, spentPesewas: json['spentPesewas'] is num ? (json['spentPesewas'] as num).toInt() : 0, redemptionsUsed: json['redemptionsUsed'] is num ? (json['redemptionsUsed'] as num).toInt() : 0, code: json['code'] is String && (json['code'] as String).isNotEmpty ? json['code'] as String : null);
  }
}

class VendorStoryRecord {
  const VendorStoryRecord({required this.id, required this.kind, required this.mediaUrl, this.caption, this.expiresAt});

  final String id;
  final String kind;
  final String mediaUrl;
  final String? caption;
  final DateTime? expiresAt;

  factory VendorStoryRecord.fromJson(Object? json) {
    if (json is! Map || json['id'] is! String || json['kind'] is! String || json['mediaUrl'] is! String) {
      throw const FormatException('Vendor story fields are invalid');
    }
    return VendorStoryRecord(
      id: json['id'] as String,
      kind: json['kind'] as String,
      mediaUrl: json['mediaUrl'] as String,
      caption: json['caption'] as String?,
      expiresAt: json['expiresAt'] is String ? DateTime.tryParse(json['expiresAt'] as String) : null,
    );
  }

  VendorStoryRecord copyWith({String? mediaUrl}) => VendorStoryRecord(
        id: id,
        kind: kind,
        mediaUrl: mediaUrl ?? this.mediaUrl,
        caption: caption,
        expiresAt: expiresAt,
      );
}

class VendorCategorySummary {
  const VendorCategorySummary({required this.name, required this.itemCount});

  final String name;
  final int itemCount;

  factory VendorCategorySummary.fromJson(Object? json) {
    if (json is! Map) throw const FormatException('Vendor category must be an object');
    final name = json['name'];
    final count = json['itemCount'];
    if (name is! String || name.isEmpty || count is! num) throw const FormatException('Vendor category fields are invalid');
    return VendorCategorySummary(name: name, itemCount: count.toInt());
  }
}

class VendorCatalogRepository {
  const VendorCatalogRepository(this._client);

  final OreApiClient _client;

  Future<VendorSnapshot> getMyVendor() async {
    final response = await _client.getFresh<Map<String, dynamic>>(OreEndpoints.vendorMe);
    final snapshot = VendorSnapshot.fromJson(response.data);
    return VendorSnapshot(
      vendor: snapshot.vendor,
      menu: snapshot.menu.map((item) => item.copyWith(imageUrl: _absoluteUrl(item.imageUrl, _client.baseUrl))).toList(),
    );
  }

  Future<Map<String, dynamic>> getAnalytics(String period) async {
    final response = await _client.getFresh<Map<String, dynamic>>(
      OreEndpoints.vendorAnalytics,
      query: <String, dynamic>{'period': period},
    );
    return response.data ?? <String, dynamic>{};
  }

  Future<List<VendorReviewRecord>> getReviews(String vendorId) async {
    final response = await _client.getFresh<List<dynamic>>(OreEndpoints.vendorReviews(vendorId));
    return (response.data ?? const <dynamic>[]).map(VendorReviewRecord.fromJson).toList();
  }

  Future<VendorReviewRecord> respondToReview(String reviewId, String responseText) async {
    final response = await _client.post<Map<String, dynamic>>(OreEndpoints.reviewResponse(reviewId), data: <String, dynamic>{'response': responseText.trim()});
    return VendorReviewRecord.fromJson(response.data);
  }

  Future<List<VendorPromotionRecord>> getPromotions(String vendorId) async {
    final response = await _client.getFresh<List<dynamic>>(OreEndpoints.vendorPromotions(vendorId));
    return (response.data ?? const <dynamic>[]).map(VendorPromotionRecord.fromJson).toList();
  }

  Future<VendorPromotionRecord> createPromotion({required String vendorId, required String title, required String discountType, required int discountValue, required int minimumSubtotalPesewas, int? budgetPesewas, int? redemptionLimit, required DateTime startsAt, required DateTime endsAt, String? code}) async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.vendorPromotions(vendorId),
      data: <String, dynamic>{
        'title': title.trim(),
        'discountType': discountType,
        'discountValue': discountValue,
        'minimumSubtotalPesewas': minimumSubtotalPesewas,
        if (budgetPesewas != null) 'budgetPesewas': budgetPesewas,
        if (redemptionLimit != null) 'redemptionLimit': redemptionLimit,
        if (code != null && code.trim().isNotEmpty) 'code': code.trim().toUpperCase(),
        'startsAt': startsAt.toUtc().toIso8601String(),
        'endsAt': endsAt.toUtc().toIso8601String(),
      },
    );
    return VendorPromotionRecord.fromJson(response.data);
  }

  Future<Map<String, dynamic>> promotionAnalytics(String vendorId, String promotionId) async {
    final response = await _client.getFresh<Map<String, dynamic>>(OreEndpoints.vendorPromotionAnalytics(vendorId, promotionId));
    return response.data ?? <String, dynamic>{};
  }

  Future<VendorPromotionRecord> setPromotionActive(String vendorId, String promotionId, bool active) async {
    final response = await _client.patch<Map<String, dynamic>>(OreEndpoints.vendorPromotion(vendorId, promotionId), data: <String, dynamic>{'active': active});
    return VendorPromotionRecord.fromJson(response.data);
  }

  Future<List<VendorStoryRecord>> getActiveStories() async {
    final response = await _client.getFresh<List<dynamic>>(OreEndpoints.stories);
    return (response.data ?? const <dynamic>[])
        .map(VendorStoryRecord.fromJson)
        .map((story) => story.copyWith(mediaUrl: _absoluteUrl(story.mediaUrl, _client.baseUrl)))
        .toList();
  }

  Future<List<VendorLocationRecord>> getLocations(String vendorId) async {
    final response = await _client.getFresh<List<dynamic>>(OreEndpoints.vendorLocations(vendorId));
    return (response.data ?? const <dynamic>[]).map(VendorLocationRecord.fromJson).toList();
  }

  Future<VendorLocationRecord> createLocation({required String vendorId, required String name, required String address, required double lat, required double lng, double deliveryRadiusKm = 8, bool accepting = true}) async {
    final response = await _client.post<Map<String, dynamic>>(OreEndpoints.vendorLocations(vendorId), data: <String, dynamic>{'name': name.trim(), 'address': address.trim(), 'lat': lat, 'lng': lng, 'deliveryRadiusKm': deliveryRadiusKm, 'accepting': accepting});
    return VendorLocationRecord.fromJson(response.data);
  }

  Future<void> deactivateLocation(String vendorId, String locationId) async {
    await _client.post<Map<String, dynamic>>(OreEndpoints.vendorLocationDeactivate(vendorId, locationId));
  }

  Future<List<VendorStaffRecord>> getStaff(String vendorId) async {
    final response = await _client.getFresh<List<dynamic>>(OreEndpoints.vendorStaff(vendorId));
    return (response.data ?? const <dynamic>[]).map(VendorStaffRecord.fromJson).toList();
  }

  Future<VendorStaffRecord> addStaff({required String vendorId, required String userId, required String displayName, String? phone, String staffRole = 'ORDER_OPERATOR'}) async {
    final response = await _client.post<Map<String, dynamic>>(OreEndpoints.vendorStaff(vendorId), data: <String, dynamic>{'userId': userId.trim(), 'displayName': displayName.trim(), if (phone != null) 'phone': phone.trim(), 'staffRole': staffRole});
    return VendorStaffRecord.fromJson(response.data);
  }

  Future<VendorStaffRecord> setStaffActive(String vendorId, String staffId, bool active) async {
    final response = await _client.patch<Map<String, dynamic>>(OreEndpoints.vendorStaffMember(vendorId, staffId), data: <String, dynamic>{'active': active});
    return VendorStaffRecord.fromJson(response.data);
  }

  Future<VendorPosConnectionRecord?> getPosConnection(String vendorId) async {
    final response = await _client.getFresh<Map<String, dynamic>>(OreEndpoints.vendorPos(vendorId));
    if (response.data == null) return null;
    return VendorPosConnectionRecord.fromJson(response.data);
  }

  Future<(VendorPosConnectionRecord connection, String token)> connectPos(String vendorId, String provider, {String? externalStoreId}) async {
    final response = await _client.post<Map<String, dynamic>>(OreEndpoints.vendorPos(vendorId), data: <String, dynamic>{'provider': provider.trim(), if (externalStoreId != null) 'externalStoreId': externalStoreId.trim()});
    final body = response.data;
    if (body == null || body['connection'] == null || body['token'] is! String) throw const FormatException('POS connection response is invalid');
    return (VendorPosConnectionRecord.fromJson(body['connection']), body['token'] as String);
  }

  Future<void> disconnectPos(String vendorId) async {
    await _client.post<Map<String, dynamic>>(OreEndpoints.vendorPosDisconnect(vendorId));
  }

  Future<List<VendorCategorySummary>> getCategories(String vendorId) async {
    final response = await _client.getFresh<List<dynamic>>(OreEndpoints.vendorCategories(vendorId));
    return (response.data ?? const <dynamic>[]).map(VendorCategorySummary.fromJson).toList();
  }

  Future<List<VendorCategorySummary>> renameCategory(String vendorId, String oldName, String newName) async {
    final response = await _client.patch<List<dynamic>>(
      OreEndpoints.vendorCategory(vendorId, oldName),
      data: <String, dynamic>{'name': newName.trim()},
    );
    return (response.data ?? const <dynamic>[]).map(VendorCategorySummary.fromJson).toList();
  }

  Future<String> uploadStoryMedia({required String vendorId, required List<int> bytes, required String contentType}) async {
    if (bytes.isEmpty || bytes.length > 50 * 1024 * 1024) throw ArgumentError('Story media must be between 1 byte and 50 MB');
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.vendorStoryMedia(vendorId),
      data: <String, dynamic>{'contentType': contentType, 'dataBase64': base64Encode(bytes)},
    );
    final key = response.data?['mediaKey'];
    if (key is! String || key.isEmpty) throw const FormatException('Story upload did not return a media key');
    return key;
  }

  Future<Map<String, dynamic>> createStory({required String vendorId, required String kind, required String mediaKey, String? caption}) async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.vendorStories(vendorId),
      data: <String, dynamic>{'kind': kind, 'mediaKey': mediaKey, if (caption != null && caption.trim().isNotEmpty) 'caption': caption.trim()},
    );
    return response.data ?? <String, dynamic>{};
  }

  Future<Map<String, dynamic>> createImageStory({required String vendorId, required String mediaKey, String? caption}) => createStory(vendorId: vendorId, kind: 'IMAGE', mediaKey: mediaKey, caption: caption);

  Future<VendorSnapshot> updateVendor(String vendorId, Map<String, dynamic> updates) async {
    await _client.patch<Map<String, dynamic>>(
      OreEndpoints.vendorById(vendorId),
      data: updates,
    );
    return getMyVendor();
  }

  Future<VendorSnapshot> setAccepting(String vendorId, bool accepting) {
    return updateVendor(vendorId, <String, dynamic>{'accepting': accepting});
  }

  Future<VendorMenuItem> addItem({
    required String vendorId,
    required String name,
    required String category,
    required int pricePesewas,
    int prepTimeMin = 10,
    String unit = 'each',
    int? stock,
    bool prescriptionOnly = false,
    String? description,
    List<String> modifiers = const <String>[],
    List<Map<String, dynamic>> addonGroups = const <Map<String, dynamic>>[],
    String? imageKey,
    String? imageContentType,
    String? sku,
    DateTime? expiryDate,
    String? dosage,
    String? turnaround,
    bool dailyMarketPrice = false,
    String? garmentType,
    Map<String, dynamic>? conditionJson,
    List<String> dietaryTags = const <String>[],
  }) async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.vendorItems(vendorId),
      data: <String, dynamic>{
        'name': name.trim(),
        'category': category.trim(),
        'pricePesewas': pricePesewas,
        'prepTimeMin': prepTimeMin,
        'unit': unit,
        if (stock != null) 'stock': stock,
        'prescriptionOnly': prescriptionOnly,
        if (description != null) 'description': description,
        'modifiers': modifiers,
        'addonGroups': addonGroups,
        if (imageKey != null) 'imageKey': imageKey,
        if (imageContentType != null) 'imageContentType': imageContentType,
        if (sku != null) 'sku': sku,
        if (expiryDate != null) 'expiryDate': expiryDate.toUtc().toIso8601String(),
        if (dosage != null) 'dosage': dosage,
        if (turnaround != null) 'turnaround': turnaround,
        'dailyMarketPrice': dailyMarketPrice,
        if (garmentType != null) 'garmentType': garmentType,
        if (conditionJson != null) 'conditionJson': conditionJson,
        'dietaryTags': dietaryTags,
      },
    );
    return VendorMenuItem.fromJson(response.data);
  }

  Future<VendorMenuItem> updateItem(String itemId, Map<String, dynamic> updates) async {
    final response = await _client.patch<Map<String, dynamic>>(
      OreEndpoints.itemById(itemId),
      data: updates,
    );
    return VendorMenuItem.fromJson(response.data);
  }

  Future<String> uploadVendorMedia({required String vendorId, required String kind, required List<int> bytes, required String contentType}) async {
    if (bytes.isEmpty || bytes.length > 10 * 1024 * 1024) throw ArgumentError('Store media is too large');
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.vendorMedia(vendorId, kind),
      data: <String, dynamic>{'contentType': contentType, 'dataBase64': base64Encode(bytes)},
    );
    final url = response.data?['imageUrl'];
    if (url is! String || url.isEmpty) throw const FormatException('Store media upload did not return a URL');
    return _absoluteUrl(url, _client.baseUrl) ?? url;
  }

  Future<VendorMenuItem> uploadItemImage({
    required String itemId,
    required List<int> bytes,
    required String contentType,
  }) async {
    if (bytes.isEmpty || bytes.length > 10 * 1024 * 1024) throw ArgumentError('Product image must be between 1 byte and 10 MB');
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.itemMedia(itemId),
      data: <String, dynamic>{
        'contentType': contentType,
        'dataBase64': base64Encode(bytes),
      },
    );
    return VendorMenuItem.fromJson(response.data);
  }
}

String? _absoluteUrl(String? value, String baseUrl) {
  if (value == null || value.isEmpty) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return '$baseUrl${value.startsWith('/') ? value : '/$value'}';
}

String _requiredString(Object? value, String field) {
  if (value is! String || value.isEmpty) throw FormatException('Missing or invalid $field');
  return value;
}

int _requiredInt(Object? value, String field) {
  if (value is num) return value.toInt();
  throw FormatException('Missing or invalid $field');
}

bool _requiredBool(Object? value, String field) {
  if (value is bool) return value;
  throw FormatException('Missing or invalid $field');
}

double _requiredDouble(Object? value, String field) {
  if (value is num) return value.toDouble();
  throw FormatException('Missing or invalid $field');
}

DateTime? _optionalDateTime(Object? value) {
  if (value == null) return null;
  if (value is String) return DateTime.tryParse(value);
  throw const FormatException('Optional vendor timestamp must be a string or null');
}

Map<String, List<Map<String, String>>> _parseHours(Object? value) {
  if (value is! Map) return const <String, List<Map<String, String>>>{};
  final result = <String, List<Map<String, String>>>{};
  for (final entry in value.entries) {
    if (entry.value is! List) continue;
    final slots = <Map<String, String>>[];
    for (final slot in entry.value as List) {
      if (slot is Map && slot['open'] is String && slot['close'] is String) {
        slots.add(<String, String>{'open': slot['open'] as String, 'close': slot['close'] as String});
      }
    }
    result[entry.key.toString()] = slots;
  }
  return result;
}
