/// The 6 Canonical Catalogue-Based Service Verticals on Ore (Single Names).
class BusinessType {
  final String id;
  final String label;
  final String sub;

  const BusinessType({
    required this.id,
    required this.label,
    required this.sub,
  });

  /// All 6 catalogue service verticals — strictly single names matching architecture spec.
  static const List<BusinessType> all = [
    BusinessType(
      id: 'food',
      label: 'Food',
      sub: 'Fast food, chop bars, local dishes, drinks & snacks',
    ),
    BusinessType(
      id: 'groceries',
      label: 'Groceries',
      sub: 'Supermarkets, provisions, beverages & packaged goods',
    ),
    BusinessType(
      id: 'market',
      label: 'Market',
      sub: 'Fresh market produce, fish, meat, tubers & spices',
    ),
    BusinessType(
      id: 'pharmacy',
      label: 'Pharmacy',
      sub: 'Licensed OTC medicines, prescription drugs & health care',
    ),
    BusinessType(
      id: 'shop',
      label: 'Shop',
      sub: 'Electronics, fashion, beauty, phones & general retail',
    ),
    BusinessType(
      id: 'laundry',
      label: 'Laundry',
      sub: 'Wash & fold, dry cleaning, ironing & express laundry',
    ),
  ];

  static BusinessType? getById(String id) {
    try {
      final normalized = id.toLowerCase() == 'restaurant' ? 'food' : (id.toLowerCase() == 'retail' ? 'shop' : id.toLowerCase());
      return all.firstWhere((bt) => bt.id == normalized);
    } catch (e) {
      return all.first;
    }
  }

  static String getLabel(String id) {
    return getById(id)?.label ?? 'Food';
  }
}
