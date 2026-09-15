import 'service_type.dart';

class OreVendor {
  final String id;
  final String name;
  final String? logoUrl;
  final String? coverUrl;
  final ServiceType serviceType;
  final double rating;
  final int reviewCount;
  final String category;
  final String deliveryFeeLabel;
  final double? deliveryFee;
  final double? minOrder;
  final String etaLabel;
  final int etaMinutes;
  final double distanceKm;
  final bool isOpen;
  final bool isFeatured;
  final String? promo; // e.g. "Free delivery", "20% off"
  final String? description;
  final String address;
  final double? lat;
  final double? lng;

  const OreVendor({
    required this.id,
    required this.name,
    this.logoUrl,
    this.coverUrl,
    required this.serviceType,
    this.rating = 0,
    this.reviewCount = 0,
    this.category = '',
    this.deliveryFeeLabel = '',
    this.deliveryFee,
    this.minOrder,
    this.etaLabel = '20–30 min',
    this.etaMinutes = 25,
    this.distanceKm = 0,
    this.isOpen = true,
    this.isFeatured = false,
    this.promo,
    this.description,
    this.address = '',
    this.lat,
    this.lng,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'logo_url': logoUrl,
        'cover_url': coverUrl,
        'service_type': serviceType.name,
        'rating': rating,
        'review_count': reviewCount,
        'category': category,
        'delivery_fee': deliveryFee,
        'min_order': minOrder,
        'eta_label': etaLabel,
        'eta_minutes': etaMinutes,
        'distance_km': distanceKm,
        'is_open': isOpen,
        'is_featured': isFeatured,
        'promo': promo,
        'description': description,
        'address': address,
        'lat': lat,
        'lng': lng,
      };

  factory OreVendor.fromJson(Map<String, dynamic> json) => OreVendor(
        id: json['id'] as String,
        name: json['name'] as String? ?? '',
        logoUrl: json['logo_url'] as String?,
        coverUrl: json['cover_url'] as String?,
        serviceType: ServiceType.fromJson(json['service_type'] as String?),
        rating: (json['rating'] as num?)?.toDouble() ?? 0,
        reviewCount: (json['review_count'] as num?)?.toInt() ?? 0,
        category: json['category'] as String? ?? '',
        deliveryFee: (json['delivery_fee'] as num?)?.toDouble(),
        minOrder: (json['min_order'] as num?)?.toDouble(),
        etaLabel: json['eta_label'] as String? ?? '20–30 min',
        etaMinutes: (json['eta_minutes'] as num?)?.toInt() ?? 25,
        distanceKm: (json['distance_km'] as num?)?.toDouble() ?? 0,
        isOpen: json['is_open'] as bool? ?? true,
        isFeatured: json['is_featured'] as bool? ?? false,
        promo: json['promo'] as String?,
        description: json['description'] as String?,
        address: json['address'] as String? ?? '',
        lat: (json['lat'] as num?)?.toDouble(),
        lng: (json['lng'] as num?)?.toDouble(),
      );
}
