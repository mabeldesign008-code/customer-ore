import 'product.dart';

/// A single selected customization option for a cart line (e.g. "Extra meat").
class SelectedAddon {
  final String groupId;
  final String groupName;
  final String optionId;
  final String optionName;
  final double priceAdjustment;

  const SelectedAddon({
    required this.groupId,
    required this.groupName,
    required this.optionId,
    required this.optionName,
    this.priceAdjustment = 0,
  });

  Map<String, dynamic> toJson() => {
        'group_id': groupId,
        'group_name': groupName,
        'option_id': optionId,
        'option_name': optionName,
        'price_adjustment': priceAdjustment,
      };

  factory SelectedAddon.fromJson(Map<String, dynamic> json) => SelectedAddon(
        groupId: json['group_id'] as String,
        groupName: json['group_name'] as String,
        optionId: json['option_id'] as String,
        optionName: json['option_name'] as String,
        priceAdjustment: (json['price_adjustment'] as num?)?.toDouble() ?? 0,
      );
}

/// A line in the cart.
class CartItem {
  final String productId;
  final String? backendLineId;
  final String title;
  final String? description;
  final double unitPrice; // base price before addons
  final int quantity;
  final String? imageUrl;
  final String vendorId;
  final String vendorName;
  final String? specialInstructions;
  final List<SelectedAddon> selectedAddons;

  const CartItem({
    required this.productId,
    this.backendLineId,
    required this.title,
    this.description,
    required this.unitPrice,
    this.quantity = 1,
    this.imageUrl,
    required this.vendorId,
    required this.vendorName,
    this.specialInstructions,
    this.selectedAddons = const [],
  });

  double get addonsTotal =>
      selectedAddons.fold(0.0, (s, a) => s + a.priceAdjustment);

  double get finalUnitPrice => unitPrice + addonsTotal;

  double get lineTotal => finalUnitPrice * quantity;

  /// Uniquely identifies this exact product + customization combo so two
  /// "Jollof rice" lines with different addons don't get merged incorrectly.
  String get customizationKey {
    final addons = selectedAddons
        .map((a) => '${a.groupId}:${a.optionId}:${a.priceAdjustment}')
        .toList()
      ..sort();
    return [
      vendorId,
      productId,
      addons.join('|'),
      specialInstructions ?? '',
    ].join('::');
  }

  CartItem copyWith({
    int? quantity,
    String? specialInstructions,
    List<SelectedAddon>? selectedAddons,
  }) =>
      CartItem(
        productId: productId,
        backendLineId: backendLineId,
        title: title,
        description: description,
        unitPrice: unitPrice,
        quantity: quantity ?? this.quantity,
        imageUrl: imageUrl,
        vendorId: vendorId,
        vendorName: vendorName,
        specialInstructions: specialInstructions ?? this.specialInstructions,
        selectedAddons: selectedAddons ?? this.selectedAddons,
      );

  Map<String, dynamic> toJson() => {
        'product_id': productId,
        'backend_line_id': backendLineId,
        'title': title,
        'description': description,
        'unit_price': unitPrice,
        'quantity': quantity,
        'image_url': imageUrl,
        'vendor_id': vendorId,
        'vendor_name': vendorName,
        'special_instructions': specialInstructions,
        'selected_addons': selectedAddons.map((e) => e.toJson()).toList(),
      };

  factory CartItem.fromProduct(OreProduct product,
          {String? backendLineId,
          required String vendorId,
          required String vendorName,
          int quantity = 1,
          String? specialInstructions,
          List<SelectedAddon> selectedAddons = const []}) =>
      CartItem(
        productId: product.id,
        backendLineId: backendLineId,
        title: product.name,
        description: product.description,
        unitPrice: product.price,
        quantity: quantity,
        imageUrl: product.imageUrl,
        vendorId: vendorId,
        vendorName: vendorName,
        specialInstructions: specialInstructions,
        selectedAddons: selectedAddons,
      );
}
