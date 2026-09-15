class OrderStage {
  final String id;
  final String label;

  const OrderStage({required this.id, required this.label});
}

class VendorConfig {
  final String id;
  final String label;
  final String icon;
  final String catalogLabel;
  final String itemLabel;
  final String itemLabelPlural;
  final List<String> categories;
  final List<Map<String, dynamic>> defaultCategories;
  final List<OrderStage> orderStages;
  final List<String> pricingTypes;
  final Map<String, bool> fields;
  final String prepTimeLabel;
  final List<String> prepTimeOptions;
  final String analyticsItemLabel;
  final String analyticsTopLabel;
  final String searchPlaceholder;
  final bool hasRxFlow;
  final bool hasPickingFlow;
  final bool hasConditionLog;
  final bool hasDailyPricing;

  const VendorConfig({
    required this.id,
    required this.label,
    required this.icon,
    required this.catalogLabel,
    required this.itemLabel,
    required this.itemLabelPlural,
    required this.categories,
    required this.defaultCategories,
    required this.orderStages,
    required this.pricingTypes,
    required this.fields,
    required this.prepTimeLabel,
    required this.prepTimeOptions,
    required this.analyticsItemLabel,
    required this.analyticsTopLabel,
    required this.searchPlaceholder,
    required this.hasRxFlow,
    required this.hasPickingFlow,
    required this.hasConditionLog,
    required this.hasDailyPricing,
  });
}

const Map<String, VendorConfig> vendorConfigs = {
  // ── 1. Food ────────────────────────────────────────────────────────
  'food': VendorConfig(
    id: 'food',
    label: 'Food',
    icon: 'utensils',
    catalogLabel: 'Menu',
    itemLabel: 'Dish',
    itemLabelPlural: 'Dishes',
    categories: ['All', 'Starters', 'Mains', 'Desserts', 'Drinks', 'Combos'],
    defaultCategories: [
      {'name': 'Starters', 'items': 4},
      {'name': 'Mains', 'items': 12},
      {'name': 'Drinks', 'items': 8},
      {'name': 'Combos', 'items': 3},
    ],
    orderStages: [
      OrderStage(id: 'new', label: 'New'),
      OrderStage(id: 'preparing', label: 'Preparing'),
      OrderStage(id: 'ready', label: 'Ready'),
      OrderStage(id: 'completed', label: 'Completed'),
    ],
    pricingTypes: ['Standard', 'Variable (Portions/Sizes)'],
    fields: {
      'prepTime': true,
      'turnaround': false,
      'rxRequired': false,
      'weightUnit': false,
      'variants': true,
      'expiryDate': false,
      'dailyPrice': false,
      'garmentType': false,
      'dietary': true,
      'sku': false,
      'stockQty': false,
    },
    prepTimeLabel: 'Kitchen Prep Time',
    prepTimeOptions: ['5-10 mins', '15-20 mins', '25-35 mins', '45+ mins'],
    analyticsItemLabel: 'Dishes Sold',
    analyticsTopLabel: 'Top Dishes',
    searchPlaceholder: 'Search menu dishes...',
    hasRxFlow: false,
    hasPickingFlow: false,
    hasConditionLog: false,
    hasDailyPricing: false,
  ),

  // ── 2. Groceries ───────────────────────────────────────────────────
  'groceries': VendorConfig(
    id: 'groceries',
    label: 'Groceries',
    icon: 'shopping-cart',
    catalogLabel: 'Inventory',
    itemLabel: 'Product',
    itemLabelPlural: 'Products',
    categories: ['All', 'Dairy & Eggs', 'Produce', 'Beverages', 'Pantry', 'Snacks', 'Household'],
    defaultCategories: [
      {'name': 'Dairy & Eggs', 'items': 24},
      {'name': 'Produce', 'items': 45},
      {'name': 'Pantry', 'items': 112},
      {'name': 'Beverages', 'items': 38},
    ],
    orderStages: [
      OrderStage(id: 'new', label: 'New'),
      OrderStage(id: 'picking', label: 'Picking'),
      OrderStage(id: 'packed', label: 'Packed & Ready'),
      OrderStage(id: 'completed', label: 'Completed'),
    ],
    pricingTypes: ['Standard', 'By Weight (kg/g)', 'Per Pack/Crate'],
    fields: {
      'prepTime': false,
      'turnaround': false,
      'rxRequired': false,
      'weightUnit': true,
      'variants': true,
      'expiryDate': true,
      'dailyPrice': false,
      'garmentType': false,
      'dietary': false,
      'sku': true,
      'stockQty': true,
    },
    prepTimeLabel: 'Packing / Fulfillment Time',
    prepTimeOptions: ['5-10 mins', '15 mins', '30 mins'],
    analyticsItemLabel: 'Items Sold',
    analyticsTopLabel: 'Top Groceries',
    searchPlaceholder: 'Search inventory by name or barcode...',
    hasRxFlow: false,
    hasPickingFlow: true,
    hasConditionLog: false,
    hasDailyPricing: false,
  ),

  // ── 3. Market ──────────────────────────────────────────────────────
  'market': VendorConfig(
    id: 'market',
    label: 'Market',
    icon: 'store',
    catalogLabel: 'Stall',
    itemLabel: 'Item',
    itemLabelPlural: 'Items',
    categories: ['All', 'Vegetables', 'Tubers', 'Fish & Meat', 'Grains', 'Fruits', 'Spices'],
    defaultCategories: [
      {'name': 'Vegetables', 'items': 18},
      {'name': 'Tubers', 'items': 8},
      {'name': 'Spices', 'items': 22},
      {'name': 'Fish & Meat', 'items': 14},
    ],
    orderStages: [
      OrderStage(id: 'new', label: 'New'),
      OrderStage(id: 'weighing', label: 'Weighing & Packing'),
      OrderStage(id: 'ready', label: 'Ready for Courier'),
      OrderStage(id: 'completed', label: 'Completed'),
    ],
    pricingTypes: ['Per Item', 'Per Olonka / Bucket', 'Per 3 Tubers', 'Daily Market Rate'],
    fields: {
      'prepTime': false,
      'turnaround': false,
      'rxRequired': false,
      'weightUnit': true,
      'variants': true,
      'expiryDate': false,
      'dailyPrice': true,
      'garmentType': false,
      'dietary': false,
      'sku': false,
      'stockQty': false,
    },
    prepTimeLabel: 'Stall Packing Time',
    prepTimeOptions: ['10-15 mins', '20-30 mins', '45 mins'],
    analyticsItemLabel: 'Units Sold',
    analyticsTopLabel: 'Best Selling Produce',
    searchPlaceholder: 'Search stall items (Yam, Plantain, Fish)...',
    hasRxFlow: false,
    hasPickingFlow: true,
    hasConditionLog: false,
    hasDailyPricing: true,
  ),

  // ── 4. Pharmacy ────────────────────────────────────────────────────
  'pharmacy': VendorConfig(
    id: 'pharmacy',
    label: 'Pharmacy',
    icon: 'pill',
    catalogLabel: 'Medicines',
    itemLabel: 'Medicine',
    itemLabelPlural: 'Medicines',
    categories: ['All', 'OTC Pain & Flu', 'Prescription', 'Vitamins & Supplements', 'First Aid', 'Personal Care'],
    defaultCategories: [
      {'name': 'OTC Pain & Flu', 'items': 85},
      {'name': 'Prescription', 'items': 142},
      {'name': 'Vitamins & Supplements', 'items': 34},
      {'name': 'First Aid', 'items': 28},
    ],
    orderStages: [
      OrderStage(id: 'new', label: 'New Order'),
      OrderStage(id: 'rx-check', label: 'Prescription Verification'),
      OrderStage(id: 'approved', label: 'Dispensed & Bagged'),
      OrderStage(id: 'completed', label: 'Completed'),
    ],
    pricingTypes: ['Standard', 'Per Blister Strip', 'Per Bottle/Pack'],
    fields: {
      'prepTime': false,
      'turnaround': false,
      'rxRequired': true,
      'weightUnit': false,
      'variants': true,
      'expiryDate': true,
      'dailyPrice': false,
      'garmentType': false,
      'dietary': false,
      'sku': true,
      'stockQty': true,
    },
    prepTimeLabel: 'Pharmacist Dispensing Time',
    prepTimeOptions: ['Immediate (5m)', '15 mins', '30 mins'],
    analyticsItemLabel: 'Units Dispensed',
    analyticsTopLabel: 'Top Medicines',
    searchPlaceholder: 'Search medicines by generic or brand name...',
    hasRxFlow: true,
    hasPickingFlow: true,
    hasConditionLog: false,
    hasDailyPricing: false,
  ),

  // ── 5. Shop ────────────────────────────────────────────────────────
  'shop': VendorConfig(
    id: 'shop',
    label: 'Shop',
    icon: 'shopping-bag',
    catalogLabel: 'Products',
    itemLabel: 'Product',
    itemLabelPlural: 'Products',
    categories: ['All', 'Phones & Accessories', 'Electronics', 'Clothing & Shoes', 'Beauty', 'Home & Living'],
    defaultCategories: [
      {'name': 'Phones & Accessories', 'items': 45},
      {'name': 'Electronics', 'items': 32},
      {'name': 'Clothing & Shoes', 'items': 88},
    ],
    orderStages: [
      OrderStage(id: 'new', label: 'New Order'),
      OrderStage(id: 'packing', label: 'Inspecting & Packing'),
      OrderStage(id: 'ready', label: 'Ready for Dispatch'),
      OrderStage(id: 'completed', label: 'Completed'),
    ],
    pricingTypes: ['Standard', 'Matrix Variants (Size / Color / Storage)'],
    fields: {
      'prepTime': false,
      'turnaround': false,
      'rxRequired': false,
      'weightUnit': false,
      'variants': true,
      'expiryDate': false,
      'dailyPrice': false,
      'garmentType': false,
      'dietary': false,
      'sku': true,
      'stockQty': true,
    },
    prepTimeLabel: 'Packaging Time',
    prepTimeOptions: ['15-30 mins', '1-2 hours', 'Same Day Dispatch'],
    analyticsItemLabel: 'Items Sold',
    analyticsTopLabel: 'Top Selling Products',
    searchPlaceholder: 'Search shop inventory...',
    hasRxFlow: false,
    hasPickingFlow: true,
    hasConditionLog: false,
    hasDailyPricing: false,
  ),

  // ── 6. Laundry ─────────────────────────────────────────────────────
  'laundry': VendorConfig(
    id: 'laundry',
    label: 'Laundry',
    icon: 'shirt',
    catalogLabel: 'Services',
    itemLabel: 'Service',
    itemLabelPlural: 'Services',
    categories: ['All', 'Wash & Fold', 'Dry Cleaning', 'Ironing Only', 'Express Service', 'Bedding & Curtains'],
    defaultCategories: [
      {'name': 'Wash & Fold', 'items': 3},
      {'name': 'Dry Cleaning', 'items': 12},
      {'name': 'Ironing Only', 'items': 6},
      {'name': 'Bedding & Curtains', 'items': 4},
    ],
    orderStages: [
      OrderStage(id: 'collected', label: 'Collected from Client'),
      OrderStage(id: 'sorting', label: 'Sorting & Inspection'),
      OrderStage(id: 'washing', label: 'Washing / Dry Cleaning'),
      OrderStage(id: 'drying', label: 'Drying & Pressing'),
      OrderStage(id: 'qc', label: 'Quality Check & Bagged'),
      OrderStage(id: 'completed', label: 'Delivered Back'),
    ],
    pricingTypes: ['Per Kg', 'Per Garment Type (Suit/Dress/Shirt)', 'Flat Rate'],
    fields: {
      'prepTime': false,
      'turnaround': true,
      'rxRequired': false,
      'weightUnit': true,
      'variants': true,
      'expiryDate': false,
      'dailyPrice': false,
      'garmentType': true,
      'dietary': false,
      'sku': false,
      'stockQty': false,
    },
    prepTimeLabel: 'Service Turnaround Time',
    prepTimeOptions: ['Express (Same Day / 24h)', 'Standard (48 hours)', 'Extended (72 hours)'],
    analyticsItemLabel: 'Garments Cleaned',
    analyticsTopLabel: 'Popular Laundry Services',
    searchPlaceholder: 'Search laundry service tiers...',
    hasRxFlow: false,
    hasPickingFlow: false,
    hasConditionLog: true,
    hasDailyPricing: false,
  ),
};

VendorConfig getVendorConfig([String vendorType = 'food']) {
  final normalized = vendorType.toLowerCase() == 'restaurant'
      ? 'food'
      : (vendorType.toLowerCase() == 'retail' ? 'shop' : vendorType.toLowerCase());
  return vendorConfigs[normalized] ?? vendorConfigs['food']!;
}
