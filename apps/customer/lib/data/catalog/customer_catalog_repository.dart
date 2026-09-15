import 'package:ore_core/ore_core.dart';

class CustomerCatalogRepository {
  const CustomerCatalogRepository(this._client);

  final OreApiClient _client;

  Future<List<OreVendor>> listVendors({required double lat, required double lng, ServiceType? type}) async {
    final response = await _client.getFresh<Map<String, dynamic>>(
      OreEndpoints.vendors,
      query: <String, dynamic>{
        'lat': lat,
        'lng': lng,
        if (type != null) 'type': _backendVendorType(type),
      },
    );
    final raw = response.data?['vendors'];
    if (raw is! List) throw const FormatException('Catalog vendor response is missing vendors');
    return raw.whereType<Map>().map((item) => _vendorFromBackend(Map<String, dynamic>.from(item))).toList(growable: false);
  }

  Future<CustomerVendorDetail> getVendor(String vendorId) async {
    final response = await _client.getFresh<Map<String, dynamic>>(OreEndpoints.vendorById(vendorId));
    final body = response.data;
    if (body == null || body['vendor'] is! Map || body['menu'] is! List) {
      throw const FormatException('Catalog vendor detail response is invalid');
    }
    final vendor = _vendorFromBackend(Map<String, dynamic>.from(body['vendor'] as Map));
    final products = (body['menu'] as List).whereType<Map>().map((item) => OreProduct.fromJson(_normalizeItem(Map<String, dynamic>.from(item)))).toList(growable: false);
    final categories = <ProductCategory>[];
    final names = <String>{};
    for (final product in products) {
      if (product.categoryName.trim().isEmpty || !names.add(product.categoryName)) continue;
      categories.add(ProductCategory(id: product.categoryName, vendorId: vendorId, name: product.categoryName, sortOrder: categories.length));
    }
    return CustomerVendorDetail(vendor: vendor, products: products, categories: categories);
  }

  Future<List<CustomerSearchResult>> searchItems({required String query, required double lat, required double lng}) async {
    final response = await _client.getFresh<List<dynamic>>(
      OreEndpoints.searchItems,
      query: <String, dynamic>{'q': query, 'lat': lat, 'lng': lng},
    );
    return (response.data ?? const <dynamic>[]).whereType<Map>().map((item) {
      final json = Map<String, dynamic>.from(item);
      return CustomerSearchResult(
        product: OreProduct.fromJson(_normalizeItem(json)),
        vendorName: json['vendorName'] as String? ?? '',
        serviceType: _serviceType(json['vendorType']?.toString()),
        vendorLat: (json['vendorLat'] as num?)?.toDouble(),
        vendorLng: (json['vendorLng'] as num?)?.toDouble(),
      );
    }).toList(growable: false);
  }

  Future<List<CustomerVendorPromotion>> listActivePromotions(String vendorId) async {
    final response = await _client.getFresh<List<dynamic>>(OreEndpoints.vendorActivePromotions(vendorId));
    return (response.data ?? const <dynamic>[])
        .map(CustomerVendorPromotion.tryParse)
        .whereType<CustomerVendorPromotion>()
        .toList(growable: false);
  }

  Future<List<Map<String, dynamic>>> stories() async {
    final response = await _client.getFresh<List<dynamic>>(OreEndpoints.stories);
    return (response.data ?? const <dynamic>[]).whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList(growable: false);
  }

  Map<String, dynamic> _normalizeItem(Map<String, dynamic> json) {
    return <String, dynamic>{
      ...json,
      'price': json['price'] ?? ((json['pricePesewas'] as num?)?.toDouble() ?? 0) / 100,
      'imageUrl': json['imageUrl'] ?? json['image_url'],
      'vendorId': json['vendorId'] ?? json['vendor_id'],
      'categoryName': json['categoryName'] ?? json['category'],
      'isAvailable': json['available'] ?? json['isAvailable'],
      'requires_prescription': json['prescriptionOnly'] ?? json['requires_prescription'],
      'addon_groups': json['addonGroups'] ?? json['addon_groups'],
    };
  }

  OreVendor _vendorFromBackend(Map<String, dynamic> json) {
    final type = _serviceType(json['vendorType']?.toString() ?? json['serviceType']?.toString());
    final locations = json['locations'];
    final location = locations is List && locations.isNotEmpty && locations.first is Map
        ? Map<String, dynamic>.from(locations.first as Map)
        : null;
    final lat = (location?['lat'] as num?)?.toDouble() ?? (json['lat'] as num?)?.toDouble();
    final lng = (location?['lng'] as num?)?.toDouble() ?? (json['lng'] as num?)?.toDouble();
    return OreVendor(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      logoUrl: json['logoUrl'] as String? ?? json['logo_url'] as String?,
      coverUrl: json['bannerUrl'] as String? ?? json['banner_url'] as String?,
      serviceType: type,
      category: type.label,
      deliveryFeeLabel: 'Calculated at checkout',
      etaLabel: '${json['defaultPrepTimeMin'] ?? 20} min prep',
      etaMinutes: (json['defaultPrepTimeMin'] as num?)?.toInt() ?? 20,
      distanceKm: (json['distanceKm'] as num?)?.toDouble() ?? 0,
      isOpen: json['openNow'] as bool? ?? true,
      isFeatured: false,
      description: null,
      address: location?['address'] as String? ?? '',
      lat: lat,
      lng: lng,
    );
  }

  String _backendVendorType(ServiceType type) {
    switch (type) {
      case ServiceType.groceries: return 'GROCERY';
      case ServiceType.food: return 'FOOD';
      case ServiceType.market: return 'MARKET';
      case ServiceType.shop: return 'SHOP';
      case ServiceType.pharmacy: return 'PHARMACY';
      case ServiceType.laundry: return 'LAUNDRY';
      default: return type.name.toUpperCase();
    }
  }

  ServiceType _serviceType(String? value) {
    switch (value?.trim().toUpperCase()) {
      case 'FOOD': return ServiceType.food;
      case 'GROCERY':
      case 'GROCERIES': return ServiceType.groceries;
      case 'MARKET': return ServiceType.market;
      case 'SHOP': return ServiceType.shop;
      case 'PARCEL': return ServiceType.parcel;
      case 'ERRAND': return ServiceType.errand;
      case 'PHARMACY': return ServiceType.pharmacy;
      case 'LAUNDRY': return ServiceType.laundry;
      default: return ServiceType.food;
    }
  }
}

class CustomerVendorDetail {
  const CustomerVendorDetail({required this.vendor, required this.products, required this.categories});

  final OreVendor vendor;
  final List<OreProduct> products;
  final List<ProductCategory> categories;
}

class CustomerVendorPromotion {
  const CustomerVendorPromotion({
    required this.id,
    required this.vendorId,
    required this.title,
    required this.discountType,
    required this.discountValue,
    required this.minimumSubtotalPesewas,
    required this.endsAt,
  });

  final String id;
  final String vendorId;
  final String title;
  final String discountType;
  final int discountValue;
  final int minimumSubtotalPesewas;
  final DateTime endsAt;

  String get label {
    final off = discountType == 'PERCENT'
        ? '$discountValue% off'
        : 'GHS ${(discountValue / 100).toStringAsFixed(2)} off';
    if (minimumSubtotalPesewas > 0) {
      return '$title · $off · min GHS ${(minimumSubtotalPesewas / 100).toStringAsFixed(2)}';
    }
    return '$title · $off';
  }

  static CustomerVendorPromotion? tryParse(Object? json) {
    if (json is! Map) return null;
    final row = Map<String, dynamic>.from(json);
    final id = row['id']?.toString().trim() ?? '';
    final vendorId = row['vendorId']?.toString().trim() ?? '';
    final title = row['title']?.toString().trim() ?? '';
    final type = row['discountType']?.toString();
    if (id.isEmpty || vendorId.isEmpty || title.isEmpty) return null;
    if (type != 'PERCENT' && type != 'FIXED') return null;
    if (row['discountValue'] is! num) return null;
    final endsAt = DateTime.tryParse(row['endsAt']?.toString() ?? '');
    if (endsAt == null) return null;
    return CustomerVendorPromotion(
      id: id,
      vendorId: vendorId,
      title: title,
      discountType: type!,
      discountValue: (row['discountValue'] as num).toInt(),
      minimumSubtotalPesewas: row['minimumSubtotalPesewas'] is num ? (row['minimumSubtotalPesewas'] as num).toInt() : 0,
      endsAt: endsAt,
    );
  }
}

class CustomerSearchResult {
  const CustomerSearchResult({required this.product, required this.vendorName, required this.serviceType, this.vendorLat, this.vendorLng});

  final OreProduct product;
  final String vendorName;
  final ServiceType serviceType;
  final double? vendorLat;
  final double? vendorLng;
}
