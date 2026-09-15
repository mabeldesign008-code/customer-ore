/// Simple physical address used across all three apps.
class OreAddress {
  final String id;
  final String label; // Home / Work / Other
  final String street;
  final String? apartment;
  final String? landmark;
  final String city;
  final String region;
  final String? ghanaPost; // e.g., GA-123-4567
  final String? what3words;
  final double? lat;
  final double? lng;
  final bool isDefault;

  const OreAddress({
    this.id = '',
    this.label = 'Home',
    required this.street,
    this.apartment,
    this.landmark,
    this.city = 'Cape Coast',
    this.region = 'Central Region',
    this.ghanaPost,
    this.what3words,
    this.lat,
    this.lng,
    this.isDefault = false,
  });

  String get displayLabel => [
        street,
        if (apartment != null && apartment!.isNotEmpty) apartment!,
        if (landmark != null && landmark!.isNotEmpty) 'near $landmark',
        city,
      ].where((s) => s.trim().isNotEmpty).join(', ');

  String get shortLabel => '$label · $street';

  Map<String, dynamic> toJson() => {
        'id': id,
        'label': label,
        'street': street,
        'apartment': apartment,
        'landmark': landmark,
        'city': city,
        'region': region,
        'ghana_post': ghanaPost,
        'what3words': what3words,
        'lat': lat,
        'lng': lng,
        'is_default': isDefault,
      };

  factory OreAddress.fromJson(Map<String, dynamic> json) => OreAddress(
        id: json['id'] as String? ?? '',
        label: json['label'] as String? ?? 'Home',
        street: json['street'] as String? ?? '',
        apartment: json['apartment'] as String?,
        landmark: json['landmark'] as String?,
        city: json['city'] as String? ?? 'Cape Coast',
        region: json['region'] as String? ?? 'Central Region',
        ghanaPost: json['ghana_post'] as String?,
        what3words: json['what3words'] as String?,
        lat: (json['lat'] as num?)?.toDouble(),
        lng: (json['lng'] as num?)?.toDouble(),
        isDefault: json['is_default'] as bool? ?? false,
      );

  OreAddress copyWith({
    String? id,
    String? label,
    String? street,
    String? apartment,
    String? landmark,
    String? city,
    String? region,
    String? ghanaPost,
    String? what3words,
    double? lat,
    double? lng,
    bool? isDefault,
  }) =>
      OreAddress(
        id: id ?? this.id,
        label: label ?? this.label,
        street: street ?? this.street,
        apartment: apartment ?? this.apartment,
        landmark: landmark ?? this.landmark,
        city: city ?? this.city,
        region: region ?? this.region,
        ghanaPost: ghanaPost ?? this.ghanaPost,
        what3words: what3words ?? this.what3words,
        lat: lat ?? this.lat,
        lng: lng ?? this.lng,
        isDefault: isDefault ?? this.isDefault,
      );
}
