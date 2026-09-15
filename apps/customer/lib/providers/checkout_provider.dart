import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:ore_core/ore_core.dart';

import '../data/cart/customer_cart_repository.dart';
import '../data/payment/customer_payment_launcher.dart';
import 'cart_provider.dart';
import 'customer_address_provider.dart';
import 'customer_auth_provider.dart';
import 'wallet_provider.dart';

/// The method a customer picks for each vendor order at checkout.
enum CheckoutPayMethod { cash, prepaid }

@immutable
class CheckoutVendorEntry {
  const CheckoutVendorEntry({
    required this.vendorId,
    required this.vendorName,
    required this.subtotal,
    this.deliveryFee = 0,
    this.serviceFee = 0,
    this.total = 0,
    this.method = CheckoutPayMethod.prepaid,
    this.codAvailable = true,
    this.discount = 0,
  });

  final String vendorId;
  final String vendorName;
  final double subtotal;
  final double deliveryFee;
  final double serviceFee;
  final double total;
  final double discount;
  final CheckoutPayMethod method;
  final bool codAvailable;

  CheckoutVendorEntry copyWith({
    CheckoutPayMethod? method,
    double? total,
    double? deliveryFee,
    double? serviceFee,
    double? discount,
    bool? codAvailable,
  }) =>
      CheckoutVendorEntry(
        vendorId: vendorId,
        vendorName: vendorName,
        subtotal: subtotal,
        deliveryFee: deliveryFee ?? this.deliveryFee,
        serviceFee: serviceFee ?? this.serviceFee,
        total: total ?? this.total,
        discount: discount ?? this.discount,
        method: method ?? this.method,
        codAvailable: codAvailable ?? this.codAvailable,
      );
}

@immutable
class CheckoutState {
  const CheckoutState({
    required this.vendors,
    this.feeEstimate,
    this.estimating = false,
    this.placing = false,
    this.error,
    this.deliveryNote,
    this.leaveAtDoor = false,
    this.tipPesewas = 0,
    this.useWalletCredit = false,
    this.walletCreditPesewasAvailable = 0,
    this.voucherCode,
    this.scheduledFor,
  });

  final List<CheckoutVendorEntry> vendors;
  final CartFeeEstimate? feeEstimate;
  final bool estimating;
  final bool placing;
  final String? error;
  final String? deliveryNote;
  final bool leaveAtDoor;
  final int tipPesewas;
  final bool useWalletCredit;
  final int walletCreditPesewasAvailable;
  final String? voucherCode;
  final DateTime? scheduledFor;

  double get subtotal => vendors.fold(0.0, (s, v) => s + v.subtotal);
  double get deliveryFeesTotal => vendors.fold(0.0, (s, v) => s + v.deliveryFee);
  double get serviceFeesTotal => vendors.fold(0.0, (s, v) => s + v.serviceFee);
  double get discountTotal => vendors.fold(0.0, (s, v) => s + v.discount);
  double get tipTotal => tipPesewas / 100;
  int get walletAppliedPesewas => useWalletCredit
      ? (walletCreditPesewasAvailable > totalPrepaidPesewas ? totalPrepaidPesewas : walletCreditPesewasAvailable)
      : 0;
  int get totalPrepaidPesewas {
    double total = 0;
    for (final v in vendors) {
      if (v.method == CheckoutPayMethod.prepaid) total += v.total;
    }
    total += tipPesewas / 100;
    return (total * 100).round() - walletAppliedPesewas;
  }

  double get grandTotal {
    final base = subtotal + deliveryFeesTotal + serviceFeesTotal + tipTotal - discountTotal;
    final wallet = walletAppliedPesewas / 100;
    return double.parse((base - wallet).toStringAsFixed(2));
  }

  bool get isReadyToPlace {
    if (vendors.isEmpty) return false;
    if (estimating || placing) return false;
    if (feeEstimate == null) return false;
    if (!feeEstimate!.zoneOk) return false;
    return vendors.every((v) => v.method != CheckoutPayMethod.cash || v.codAvailable);
  }

  CheckoutState copyWith({
    List<CheckoutVendorEntry>? vendors,
    CartFeeEstimate? feeEstimate,
    bool? estimating,
    bool? placing,
    String? error,
    String? deliveryNote,
    bool? leaveAtDoor,
    int? tipPesewas,
    bool? useWalletCredit,
    int? walletCreditPesewasAvailable,
    String? voucherCode,
    DateTime? scheduledFor,
    bool clearError = false,
    bool clearVoucher = false,
    bool clearScheduled = false,
  }) =>
      CheckoutState(
        vendors: vendors ?? this.vendors,
        feeEstimate: feeEstimate ?? this.feeEstimate,
        estimating: estimating ?? this.estimating,
        placing: placing ?? this.placing,
        error: clearError ? null : (error ?? this.error),
        deliveryNote: deliveryNote ?? this.deliveryNote,
        leaveAtDoor: leaveAtDoor ?? this.leaveAtDoor,
        tipPesewas: tipPesewas ?? this.tipPesewas,
        useWalletCredit: useWalletCredit ?? this.useWalletCredit,
        walletCreditPesewasAvailable: walletCreditPesewasAvailable ?? this.walletCreditPesewasAvailable,
        voucherCode: clearVoucher ? null : (voucherCode ?? this.voucherCode),
        scheduledFor: clearScheduled ? null : (scheduledFor ?? this.scheduledFor),
      );
}

class CheckoutNotifier extends StateNotifier<CheckoutState> {
  CheckoutNotifier(this._ref) : super(const CheckoutState(vendors: <CheckoutVendorEntry>[])) {
    _hydrate();
  }

  final Ref _ref;

  void _hydrate() {
    final cart = _ref.read(cartProvider);
    final itemsByVendor = _ref.read(cartProvider.notifier).itemsByVendor;
    final vendors = <CheckoutVendorEntry>[];
    final vendorSubtotals = <String, double>{};
    for (final item in cart) {
      vendorSubtotals.update(item.vendorId, (v) => v + item.lineTotal, ifAbsent: () => item.lineTotal);
    }
    for (final entry in itemsByVendor.entries) {
      final firstItem = entry.value.first;
      vendors.add(CheckoutVendorEntry(
        vendorId: entry.key,
        vendorName: firstItem.vendorName,
        subtotal: vendorSubtotals[entry.key] ?? 0,
      ));
    }
    state = state.copyWith(vendors: vendors);
    // Estimate fees once address is known.
    _estimate();
  }

  Future<void> _estimate() async {
    final address = _ref.read(selectedAddressProvider).selected;
    if (address == null || address.address.lat == null || address.address.lng == null) return;
    state = state.copyWith(estimating: true, clearError: true);
    try {
      final cart = _ref.read(cartProvider.notifier);
      final repo = _ref.read(customerCartRepositoryProvider);
      final estimate = await repo.estimateFees(
        lat: address.address.lat!,
        lng: address.address.lng!,
      );
      final byVendor = <String, CartFeeEstimateRow>{for (final v in estimate.vendors) v.vendorId: v};
      final updatedVendors = state.vendors.map((v) {
        final row = byVendor[v.vendorId];
        if (row == null) return v;
        final totalPesewas = row.subtotalPesewas + row.deliveryFeePesewas + row.serviceFeePesewas;
        return v.copyWith(
          deliveryFee: row.deliveryFeePesewas / 100,
          serviceFee: row.serviceFeePesewas / 100,
          total: totalPesewas / 100,
          codAvailable: estimate.zoneOk,
        );
      }).toList();
      state = state.copyWith(
        vendors: updatedVendors,
        feeEstimate: estimate,
        estimating: false,
      );
    } catch (e) {
      state = state.copyWith(estimating: false, error: e.toString().replaceFirst('Exception: ', ''));
    }
  }

  void onAddressChanged() => _estimate();

  void setMethod(String vendorId, CheckoutPayMethod method) {
    state = state.copyWith(
      vendors: state.vendors
          .map((v) => v.vendorId == vendorId ? v.copyWith(method: method) : v)
          .toList(),
    );
  }

  void setLeaveAtDoor(bool value) => state = state.copyWith(leaveAtDoor: value);
  void setDeliveryNote(String note) => state = state.copyWith(deliveryNote: note);
  void setTipPesewas(int pesewas) => state = state.copyWith(tipPesewas: pesewas);
  void setUseWallet(bool value) => state = state.copyWith(useWalletCredit: value);
  void setWalletAvailable(int pesewas) => state = state.copyWith(walletCreditPesewasAvailable: pesewas);
  void setVoucher(String? code) => state = state.copyWith(voucherCode: code, clearVoucher: code == null || code.isEmpty);
  void setScheduledFor(DateTime? dt) => state = state.copyWith(scheduledFor: dt, clearScheduled: dt == null);

  /// Places the order. Returns the first orderId (for routing). Throws on error.
  Future<String> placeOrder() async {
    final address = _ref.read(selectedAddressProvider).selected;
    if (address == null) {
      throw StateError('Please choose a delivery address');
    }
    if (address.address.lat == null || address.address.lng == null) {
      throw StateError('Address needs a valid map pin');
    }
    state = state.copyWith(placing: true, clearError: true);
    try {
      final repo = _ref.read(customerCartRepositoryProvider);
      final oreAddress = OreAddress(
        label: address.address.label,
        street: address.address.street.isNotEmpty ? address.address.street : address.address.label,
        apartment: address.address.apartment,
        landmark: address.address.landmark,
        city: address.address.city,
        region: address.address.region,
        lat: address.address.lat,
        lng: address.address.lng,
      );
      final methods = state.vendors
          .map((v) => <String, dynamic>{
                'vendorId': v.vendorId,
                'method': v.method == CheckoutPayMethod.cash ? 'COD' : 'PREPAID',
              })
          .toList(growable: false);

      final tips = state.tipPesewas > 0
          ? state.vendors
              .map((v) => <String, dynamic>{
                    'vendorId': v.vendorId,
                    'tipPesewas': (state.tipPesewas / state.vendors.length).round(),
                  })
              .toList()
          : null;

      final result = await repo.checkout(
        address: oreAddress,
        paymentMethod: state.vendors.any((v) => v.method == CheckoutPayMethod.cash)
            ? PaymentMethod.cash
            : PaymentMethod.momo,
        vendorIds: state.vendors.map((v) => v.vendorId).toList(),
        note: state.deliveryNote,
        leaveAtDoor: state.leaveAtDoor,
        dropNote: state.deliveryNote,
        voucherCode: state.voucherCode,
        creditPesewas: state.useWalletCredit ? state.walletAppliedPesewas : null,
        tips: tips,
        scheduledFor: state.scheduledFor,
      );

      // Open Paystack if there's a prepaid URL.
      final payment = result['payment'];
      String? paystackUrl;
      if (payment is Map) paystackUrl = payment['paystackUrl']?.toString();
      String? firstOrderId;
      final orders = result['orders'];
      if (orders is List && orders.isNotEmpty) {
        firstOrderId = orders.first['orderId']?.toString();
      }
      if (paystackUrl != null && paystackUrl.isNotEmpty) {
        await openCustomerPayment(paystackUrl);
      }
      await _ref.read(cartProvider.notifier).clearRemote();
      return firstOrderId ?? (result['orderId']?.toString() ?? '');
    } catch (e) {
      state = state.copyWith(placing: false, error: e.toString().replaceFirst('Exception: ', ''));
      rethrow;
    } finally {
      if (state.placing) state = state.copyWith(placing: false);
    }
  }
}

final checkoutProvider = StateNotifierProvider<CheckoutNotifier, CheckoutState>((ref) {
  return CheckoutNotifier(ref);
});

/// Forces the checkout notifier to re-hydrate (e.g. after navigating back to cart
/// and changing the cart).
final checkoutResetProvider = Provider<void>((ref) {
  return;
});
