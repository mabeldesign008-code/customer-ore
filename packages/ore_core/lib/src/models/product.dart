/// A selectable option within an addon group (e.g. "Grilled Chicken" in Protein or "500g" in Weight).
class AddonOption {
  final String id;
  final String name;
  final double priceAdjustment; // 0 means included; positive means extra charge.

  const AddonOption({
    required this.id,
    required this.name,
    this.priceAdjustment = 0,
  });

  String display([String currency = '₵']) => priceAdjustment <= 0
      ? name
      : '$name (+$currency${priceAdjustment.toStringAsFixed(2)})';

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'price_adjustment': priceAdjustment,
      };

  factory AddonOption.fromJson(Map<String, dynamic> json) => AddonOption(
        id: json['id'] as String? ?? '',
        name: json['name'] as String? ?? '',
        priceAdjustment: (json['price_adjustment'] as num?)?.toDouble() ??
            (json['priceAdjustmentPesewas'] is num ? (json['priceAdjustmentPesewas'] as num).toDouble() / 100 : null) ??
            (json['priceAdjustment'] as num?)?.toDouble() ??
            (json['price'] as num?)?.toDouble() ??
            0,
      );
}

/// A group of addon options (e.g. "Choose protein", "Size", "Add extras").
class AddonGroup {
  final String id;
  final String name;
  final bool isRequired;
  final int minSelections;
  final int maxSelections;
  final List<AddonOption> options;

  const AddonGroup({
    required this.id,
    required this.name,
    required this.isRequired,
    required this.minSelections,
    required this.maxSelections,
    required this.options,
  });

  bool get isSingleSelect => maxSelections == 1;
  bool get isMultiSelect => maxSelections > 1;

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'is_required': isRequired,
        'min_selections': minSelections,
        'max_selections': maxSelections,
        'options': options.map((e) => e.toJson()).toList(),
      };

  factory AddonGroup.fromJson(Map<String, dynamic> json) => AddonGroup(
        id: json['id'] as String? ?? '',
        name: json['name'] as String? ?? '',
        isRequired: json['is_required'] as bool? ?? json['required'] as bool? ?? false,
        minSelections: (json['min_selections'] as num?)?.toInt() ?? (json['min'] as num?)?.toInt() ?? 0,
        maxSelections: (json['max_selections'] as num?)?.toInt() ?? (json['max'] as num?)?.toInt() ?? 1,
        options: ((json['options'] as List?) ?? [])
            .map((e) => AddonOption.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

/// A product / catalogue item sold by a vendor across any of the 6 verticals.
class OreProduct {
  final String id;
  final String name;
  final String? description;
  final double price;
  final String? imageUrl;
  final String vendorId;
  final String categoryId;
  final String categoryName;
  final bool isAvailable;
  final bool isPopular;
  final double rating;
  final int ratingCount;
  final int? prepTimeMinutes;
  final int? calories;
  final List<AddonGroup> addonGroups;

  // ── Multi-Vertical Specialized Fields ──────────────────────────────
  final String? unit; // 'kg', 'olonka', 'bucket', 'portion', 'pack', 'piece'
  final bool requiresPrescription; // Pharmacy prescription upload gate
  final String? dosage; // Pharmacy: e.g. "500mg", "10ml"
  final String? turnaround; // Laundry: e.g. "24h Express", "48h Standard"
  final int? stock; // Groceries & Shop inventory count
  final bool dailyMarketPrice; // Market fresh daily price toggle
  final String? sku; // Shop / Groceries SKU barcode

  const OreProduct({
    required this.id,
    required this.name,
    this.description,
    required this.price,
    this.imageUrl,
    required this.vendorId,
    this.categoryId = '',
    this.categoryName = '',
    this.isAvailable = true,
    this.isPopular = false,
    this.rating = 0,
    this.ratingCount = 0,
    this.prepTimeMinutes,
    this.calories,
    this.addonGroups = const [],
    this.unit,
    this.requiresPrescription = false,
    this.dosage,
    this.turnaround,
    this.stock,
    this.dailyMarketPrice = false,
    this.sku,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'description': description,
        'price': price,
        'image_url': imageUrl,
        'vendor_id': vendorId,
        'category_id': categoryId,
        'category_name': categoryName,
        'is_available': isAvailable,
        'is_popular': isPopular,
        'rating': rating,
        'rating_count': ratingCount,
        'prep_time_minutes': prepTimeMinutes,
        'calories': calories,
        'addon_groups': addonGroups.map((e) => e.toJson()).toList(),
        'unit': unit,
        'requires_prescription': requiresPrescription,
        'dosage': dosage,
        'turnaround': turnaround,
        'stock': stock,
        'daily_market_price': dailyMarketPrice,
        'sku': sku,
      };

  factory OreProduct.fromJson(Map<String, dynamic> json) => OreProduct(
        id: json['id'] as String? ?? json['_id'] as String? ?? '',
        name: json['name'] as String? ?? json['title'] as String? ?? '',
        description: json['description'] as String?,
        price: (json['price'] as num?)?.toDouble() ??
            ((json['pricePesewas'] as num?)?.toDouble() != null
                ? (json['pricePesewas'] as num).toDouble() / 100
                : 0),
        imageUrl: json['image_url'] as String? ?? json['imageUrl'] as String?,
        vendorId: json['vendor_id'] as String? ?? json['vendorId'] as String? ?? '',
        categoryId: json['category_id'] as String? ?? json['categoryId'] as String? ?? '',
        categoryName: json['category_name'] as String? ?? json['category'] as String? ?? '',
        isAvailable: json['is_available'] as bool? ?? json['available'] as bool? ?? true,
        isPopular: json['is_popular'] as bool? ?? json['popular'] as bool? ?? false,
        rating: (json['rating'] as num?)?.toDouble() ?? 0,
        ratingCount: (json['rating_count'] as num?)?.toInt() ?? 0,
        prepTimeMinutes: (json['prep_time_minutes'] as num?)?.toInt() ?? (json['prepTimeMin'] as num?)?.toInt(),
        calories: (json['calories'] as num?)?.toInt(),
        addonGroups: ((json['addon_groups'] ?? json['addonGroups']) as List? ?? [])
            .map((e) => AddonGroup.fromJson(e as Map<String, dynamic>))
            .toList(),
        unit: json['unit'] as String?,
        requiresPrescription: json['requires_prescription'] as bool? ?? json['prescriptionOnly'] as bool? ?? false,
        dosage: json['dosage'] as String?,
        turnaround: json['turnaround'] as String?,
        stock: (json['stock'] as num?)?.toInt(),
        dailyMarketPrice: json['daily_market_price'] as bool? ?? false,
        sku: json['sku'] as String?,
      );
}

/// A product category (e.g. "Rice dishes", "Produce", "OTC Medicines").
class ProductCategory {
  final String id;
  final String vendorId;
  final String name;
  final String? icon;
  final int sortOrder;
  final bool isActive;

  const ProductCategory({
    required this.id,
    required this.vendorId,
    required this.name,
    this.icon,
    this.sortOrder = 0,
    this.isActive = true,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'vendor_id': vendorId,
        'name': name,
        'icon': icon,
        'sort_order': sortOrder,
        'is_active': isActive,
      };

  factory ProductCategory.fromJson(Map<String, dynamic> json) => ProductCategory(
        id: json['id'] as String? ?? '',
        vendorId: json['vendor_id'] as String? ?? '',
        name: json['name'] as String? ?? '',
        icon: json['icon'] as String?,
        sortOrder: (json['sort_order'] as num?)?.toInt() ?? 0,
        isActive: json['is_active'] as bool? ?? true,
      );
}
