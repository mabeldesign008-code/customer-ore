import 'package:ore_core/ore_core.dart';

class CustomerCartRepository {
  const CustomerCartRepository(this._client);

  final OreApiClient _client;

  Future<List<CartItem>> getCart() async {
    final response = await _client.getFresh<Map<String, dynamic>>(
      OreEndpoints.cart,
    );
    final lines = response.data?['lines'];
    if (lines is! List)
      throw const FormatException('Cart response is missing lines');
    final vendors = <String, String>{};
    final vendorRows = response.data?['vendors'];
    if (vendorRows is List) {
      for (final row in vendorRows.whereType<Map>()) {
        final json = Map<String, dynamic>.from(row);
        if (json['vendorId'] is String && json['vendorName'] is String)
          vendors[json['vendorId'] as String] = json['vendorName'] as String;
      }
    }
    return lines
        .whereType<Map>()
        .map((line) {
          final json = Map<String, dynamic>.from(line);
          final selected = json['selectedOptions'];
          final addons = selected is List
              ? selected
                    .whereType<Map>()
                    .map((item) {
                      final option = Map<String, dynamic>.from(item);
                      return SelectedAddon(
                        groupId: option['groupId'] as String? ?? '',
                        groupName: option['groupName'] as String? ?? '',
                        optionId: option['optionId'] as String? ?? '',
                        optionName: option['optionName'] as String? ?? '',
                        priceAdjustment:
                            ((option['priceAdjustmentPesewas'] as num?)
                                    ?.toDouble() ??
                                0) /
                            100,
                      );
                    })
                    .toList(growable: false)
              : const <SelectedAddon>[];
          final vendorId = json['vendorId'] as String? ?? '';
          final unitPricePesewas =
              (json['unitPricePesewas'] as num?)?.toInt() ?? 0;
          return CartItem(
            backendLineId: json['id'] as String?,
            productId: json['itemId'] as String? ?? '',
            title: json['itemName'] as String? ?? 'Item',
            unitPrice: unitPricePesewas / 100,
            quantity: (json['qty'] as num?)?.toInt() ?? 1,
            vendorId: vendorId,
            vendorName: vendors[vendorId] ?? 'Vendor',
            selectedAddons: addons,
          );
        })
        .toList(growable: false);
  }

  Future<void> addItem(CartItem item) async {
    await _client.post<Map<String, dynamic>>(
      OreEndpoints.cartItems,
      data: <String, dynamic>{
        'itemId': item.productId,
        'qty': item.quantity,
        'modifiers': item.specialInstructions == null
            ? <String>[]
            : <String>[item.specialInstructions!],
        'selectedOptions': item.selectedAddons
            .map(
              (addon) => <String, dynamic>{
                'groupId': addon.groupId,
                'groupName': addon.groupName,
                'optionId': addon.optionId,
                'optionName': addon.optionName,
                'priceAdjustmentPesewas': (addon.priceAdjustment * 100).round(),
              },
            )
            .toList(),
      },
    );
  }

  Future<void> updateQuantity({
    required String lineId,
    required int quantity,
  }) async {
    await _client.patch<Map<String, dynamic>>(
      '${OreEndpoints.cartItems}/$lineId?qty=$quantity',
    );
  }

  Future<void> remove(String lineId) async {
    await _client.delete<Map<String, dynamic>>(
      '${OreEndpoints.cartItems}/$lineId',
    );
  }

  Future<({int added, List<String> skipped})> reorder(String orderId) async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.cartReorder,
      data: <String, String>{'orderId': orderId},
    );
    final body = response.data ?? const <String, dynamic>{};
    final skipped = body['skipped'];
    return (
      added: (body['added'] as num?)?.toInt() ?? 0,
      skipped: skipped is List
          ? skipped
                .whereType<Map>()
                .map(
                  (row) =>
                      '${row['name'] ?? 'Item'}: ${row['reason'] ?? 'unavailable'}',
                )
                .toList()
          : const <String>[],
    );
  }

  Future<void> clear() async {
    await _client.delete<Map<String, dynamic>>(OreEndpoints.cart);
  }

  Future<Map<String, dynamic>> checkout({
    required OreAddress address,
    required PaymentMethod paymentMethod,
    required Iterable<String> vendorIds,
    String? note,
    int? creditPesewas,
    List<Map<String, String>>? promotions,
    List<Map<String, dynamic>>? tips,
    bool leaveAtDoor = false,
    String? dropNote,
    DateTime? scheduledFor,
    String? voucherCode,
  }) async {
    if (address.lat == null || address.lng == null)
      throw StateError(
        'A map-verified delivery address is required before checkout',
      );
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.cartCheckout,
      data: <String, dynamic>{
        'address': <String, dynamic>{
          'label': address.label,
          'lat': address.lat,
          'lng': address.lng,
          if (address.landmark != null && address.landmark!.trim().isNotEmpty)
            'details': address.landmark!.trim(),
          'source': 'CUSTOMER',
        },
        'paymentMethods': vendorIds
            .map(
              (vendorId) => <String, dynamic>{
                'vendorId': vendorId,
                'method': paymentMethod == PaymentMethod.cash
                    ? 'COD'
                    : 'PREPAID',
              },
            )
            .toList(),
        if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
        if (creditPesewas != null) 'creditPesewas': creditPesewas,
        if (promotions != null) 'promotions': promotions,
        if (tips != null) 'tips': tips,
        if (leaveAtDoor) 'leaveAtDoor': true,
        if (dropNote != null && dropNote.trim().isNotEmpty)
          'dropNote': dropNote.trim(),
        if (scheduledFor != null)
          'scheduledFor': scheduledFor.toUtc().toIso8601String(),
        if (voucherCode != null && voucherCode.trim().isNotEmpty)
          'voucherCode': voucherCode.trim().toUpperCase(),
      },
    );
    return response.data ?? <String, dynamic>{};
  }

  /// Delivery + service fee estimate for the current cart (backend-computed,
  /// zone-gated) so the cart is not a "surprise at checkout".
  Future<CartFeeEstimate> estimateFees({
    required double lat,
    required double lng,
  }) async {
    final response = await _client.getFresh<Map<String, dynamic>>(
      '${OreEndpoints.cartEstimate}?lat=$lat&lng=$lng',
    );
    final json = response.data ?? const <String, dynamic>{};
    final rows = json['vendors'];
    return CartFeeEstimate(
      zoneOk: json['zoneOk'] as bool? ?? true,
      subtotalPesewas: (json['subtotalPesewas'] as num?)?.toInt() ?? 0,
      deliveryFeePesewas: (json['deliveryFeePesewas'] as num?)?.toInt() ?? 0,
      serviceFeePesewas: (json['serviceFeePesewas'] as num?)?.toInt() ?? 0,
      totalPesewas: (json['totalPesewas'] as num?)?.toInt() ?? 0,
      vendors: rows is List
          ? rows
                .whereType<Map>()
                .map((r) {
                  final row = Map<String, dynamic>.from(r);
                  return CartFeeEstimateRow(
                    vendorId: row['vendorId'] as String? ?? '',
                    vendorName: row['vendorName'] as String? ?? 'Vendor',
                    subtotalPesewas:
                        (row['subtotalPesewas'] as num?)?.toInt() ?? 0,
                    deliveryFeePesewas:
                        (row['deliveryFeePesewas'] as num?)?.toInt() ?? 0,
                    serviceFeePesewas:
                        (row['serviceFeePesewas'] as num?)?.toInt() ?? 0,
                    totalPesewas: (row['totalPesewas'] as num?)?.toInt() ?? 0,
                  );
                })
                .toList(growable: false)
          : const <CartFeeEstimateRow>[],
    );
  }
}

/// Fee preview row (matches GET /cart/estimate).
class CartFeeEstimateRow {
  const CartFeeEstimateRow({
    required this.vendorId,
    required this.vendorName,
    required this.subtotalPesewas,
    required this.deliveryFeePesewas,
    required this.serviceFeePesewas,
    required this.totalPesewas,
  });
  final String vendorId;
  final String vendorName;
  final int subtotalPesewas;
  final int deliveryFeePesewas;
  final int serviceFeePesewas;
  final int totalPesewas;
}

class CartFeeEstimate {
  const CartFeeEstimate({
    required this.zoneOk,
    required this.vendors,
    required this.subtotalPesewas,
    required this.deliveryFeePesewas,
    required this.serviceFeePesewas,
    required this.totalPesewas,
  });
  final bool zoneOk;
  final List<CartFeeEstimateRow> vendors;
  final int subtotalPesewas;
  final int deliveryFeePesewas;
  final int serviceFeePesewas;
  final int totalPesewas;
}

/// Delivery + service fee estimate for the current cart (backend-computed,
/// zone-gated) so the cart is not a "surprise at checkout".
