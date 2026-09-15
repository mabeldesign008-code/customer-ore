import 'package:uuid/uuid.dart';

import 'address.dart';
import 'cart_item.dart';
import 'order_status.dart';
import 'service_type.dart';

/// One line in a placed order — the finalized snapshot of an item.
class OrderLineItem {
  final String productId;
  final String title;
  final String? description;
  final double unitPrice;
  final int quantity;
  final String? imageUrl;
  final List<Map<String, dynamic>> addons;

  const OrderLineItem({
    required this.productId,
    required this.title,
    this.description,
    required this.unitPrice,
    this.quantity = 1,
    this.imageUrl,
    this.addons = const [],
  });

  double get lineTotal => unitPrice * quantity;

  Map<String, dynamic> toJson() => {
        'product_id': productId,
        'title': title,
        'description': description,
        'unit_price': unitPrice,
        'quantity': quantity,
        'image_url': imageUrl,
        'addons': addons,
      };

  factory OrderLineItem.fromJson(Map<String, dynamic> json) => OrderLineItem(
        productId: json['product_id'] as String? ?? json['id'] as String? ?? '',
        title: json['title'] as String,
        description: json['description'] as String?,
        unitPrice: (json['unit_price'] as num?)?.toDouble() ??
            (json['price'] as num?)?.toDouble() ??
            0,
        quantity: (json['quantity'] as num?)?.toInt() ?? 1,
        imageUrl: json['image_url'] as String?,
        addons: ((json['addons'] as List?) ?? [])
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList(),
      );

  factory OrderLineItem.fromCartItem(CartItem ci) => OrderLineItem(
        productId: ci.productId,
        title: ci.title,
        description: ci.description,
        unitPrice: ci.finalUnitPrice,
        quantity: ci.quantity,
        imageUrl: ci.imageUrl,
        addons: ci.selectedAddons
            .map((a) => {
                  'group': a.groupName,
                  'name': a.optionName,
                  'price': a.priceAdjustment,
                })
            .toList(),
      );
}

/// A placed order — shared across all three apps.
class OreOrder {
  final String id;
  final ServiceType serviceType;
  final List<OrderLineItem> items;
  final double subtotal;
  final double deliveryFee;
  final double returnDeliveryFee;
  final double serviceFee;
  final double? riderTip;
  final double discount;
  final double total;
  final PaymentMethod paymentMethod;
  final bool isPaid;
  final OreAddress address;
  final String vendorId;
  final String vendorName;
  final String? vendorImage;
  final String? riderId;
  final String? riderName;
  final String? riderPhoto;
  final double? riderRating;
  final String? riderPhone;
  final double? pickupLat;
  final double? pickupLng;
  final double? riderLat;
  final double? riderLng;
  final DateTime? riderPositionAt;
  final String? specialInstructions;
  final String? laundryStage;
  final Map<String, dynamic>? marketFulfillment;
  final bool prescriptionRequired;
  final String? prescriptionStatus;
  final String? prescriptionReviewNote;
  final OrderStatus status;
  final DateTime placedAt;
  final DateTime? updatedAt;
  final String eta;
  final DateTime? scheduledFor;
  final bool leaveAtDoor;
  final String? recipientName;
  final String? recipientPhone;
  final String? giftMessage;
  final ParcelDetails? parcelDetails;
  final ErrandDetails? errandDetails;
  final LaundryDetails? laundryDetails;
  final String? deliveryOtp;
  final bool otpRequired;
  final String? cancelReason;
  final String? customerName;
  final String? customerPhone;
  /// True while a prepaid order is waiting for the payment webhook.
  /// This is separate from [OrderStatus.pending], which also represents a
  /// legitimate waiting-for-vendor state.
  final bool paymentPending;

  const OreOrder({
    required this.id,
    required this.serviceType,
    required this.items,
    required this.subtotal,
    this.deliveryFee = 0,
    this.returnDeliveryFee = 0,
    this.serviceFee = 0,
    this.riderTip,
    this.discount = 0,
    required this.total,
    this.paymentMethod = PaymentMethod.cash,
    this.isPaid = false,
    required this.address,
    this.vendorId = '',
    this.vendorName = '',
    this.vendorImage,
    this.riderId,
    this.riderName,
    this.riderPhoto,
    this.riderRating,
    this.riderPhone,
    this.pickupLat,
    this.pickupLng,
    this.riderLat,
    this.riderLng,
    this.riderPositionAt,
    this.specialInstructions,
    this.laundryStage,
    this.marketFulfillment,
    this.prescriptionRequired = false,
    this.prescriptionStatus,
    this.prescriptionReviewNote,
    this.status = OrderStatus.pending,
    required this.placedAt,
    this.updatedAt,
    this.eta = '',
    this.scheduledFor,
    this.leaveAtDoor = false,
    this.recipientName,
    this.recipientPhone,
    this.giftMessage,
    this.parcelDetails,
    this.errandDetails,
    this.laundryDetails,
    this.deliveryOtp,
    this.otpRequired = false,
    this.cancelReason,
    this.customerName,
    this.customerPhone,
    this.paymentPending = false,
  });

  int get totalItems => items.fold(0, (s, i) => s + i.quantity);
  bool get isActive => status.isActive;
  bool get isGift =>
      recipientName != null && recipientName!.trim().isNotEmpty;

  String itemsSummary([String currency = '₵']) => items.isEmpty
      ? 'No items'
      : items.length == 1
          ? '${items.first.quantity}× ${items.first.title}'
          : '$totalItems item${totalItems == 1 ? '' : 's'} · $currency${total.toStringAsFixed(2)}';

  OreOrder copyWith({
    OrderStatus? status,
    OreAddress? address,
    String? riderId,
    String? riderName,
    String? riderPhoto,
    double? riderRating,
    String? riderPhone,
    String? eta,
    String? laundryStage,
    Map<String, dynamic>? marketFulfillment,
    bool? prescriptionRequired,
    String? prescriptionStatus,
    String? prescriptionReviewNote,
    DateTime? updatedAt,
    bool? isPaid,
    String? cancelReason,
    double? riderTip,
    String? deliveryOtp,
    bool? otpRequired,
    bool? paymentPending,
  }) =>
      OreOrder(
        id: id,
        serviceType: serviceType,
        items: items,
        subtotal: subtotal,
        deliveryFee: deliveryFee,
        returnDeliveryFee: returnDeliveryFee,
        serviceFee: serviceFee,
        riderTip: riderTip ?? this.riderTip,
        discount: discount,
        total: total,
        paymentMethod: paymentMethod,
        isPaid: isPaid ?? this.isPaid,
        address: address ?? this.address,
        vendorId: vendorId,
        vendorName: vendorName,
        vendorImage: vendorImage,
        riderId: riderId ?? this.riderId,
        riderName: riderName ?? this.riderName,
        riderPhoto: riderPhoto ?? this.riderPhoto,
        riderRating: riderRating ?? this.riderRating,
        riderPhone: riderPhone ?? this.riderPhone,
        pickupLat: pickupLat,
        pickupLng: pickupLng,
        riderLat: riderLat,
        riderLng: riderLng,
        riderPositionAt: riderPositionAt,
        specialInstructions: specialInstructions,
        laundryStage: laundryStage ?? this.laundryStage,
        marketFulfillment: marketFulfillment ?? this.marketFulfillment,
        prescriptionRequired: prescriptionRequired ?? this.prescriptionRequired,
        prescriptionStatus: prescriptionStatus ?? this.prescriptionStatus,
        prescriptionReviewNote: prescriptionReviewNote ?? this.prescriptionReviewNote,
        status: status ?? this.status,
        placedAt: placedAt,
        updatedAt: updatedAt ?? DateTime.now(),
        eta: eta ?? this.eta,
        scheduledFor: scheduledFor,
        leaveAtDoor: leaveAtDoor,
        recipientName: recipientName,
        recipientPhone: recipientPhone,
        giftMessage: giftMessage,
        parcelDetails: parcelDetails,
        errandDetails: errandDetails,
        laundryDetails: laundryDetails,
        deliveryOtp: deliveryOtp ?? this.deliveryOtp,
        otpRequired: otpRequired ?? this.otpRequired,
        cancelReason: cancelReason ?? this.cancelReason,
        customerName: customerName,
        customerPhone: customerPhone,
        paymentPending: paymentPending ?? this.paymentPending,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'service_type': serviceType.name,
        'items': items.map((e) => e.toJson()).toList(),
        'subtotal': subtotal,
        'delivery_fee': deliveryFee,
        'return_delivery_fee': returnDeliveryFee,
        'service_fee': serviceFee,
        'rider_tip': riderTip,
        'discount': discount,
        'total': total,
        'payment_method': paymentMethod.name,
        'is_paid': isPaid,
        'address': address.toJson(),
        'vendor_id': vendorId,
        'vendor_name': vendorName,
        'vendor_image': vendorImage,
        'rider_id': riderId,
        'rider_name': riderName,
        'rider_photo': riderPhoto,
        'rider_rating': riderRating,
        'rider_phone': riderPhone,
        'pickup_lat': pickupLat,
        'pickup_lng': pickupLng,
        'rider_lat': riderLat,
        'rider_lng': riderLng,
        'rider_position_at': riderPositionAt?.toIso8601String(),
        'special_instructions': specialInstructions,
        'laundry_stage': laundryStage,
        'market_fulfillment': marketFulfillment,
        'prescription_required': prescriptionRequired,
        'prescription_status': prescriptionStatus,
        'prescription_review_note': prescriptionReviewNote,
        'status': status.apiValue,
        'placed_at': placedAt.toIso8601String(),
        'updated_at': updatedAt?.toIso8601String(),
        'eta': eta,
        'scheduled_for': scheduledFor?.toIso8601String(),
        'leave_at_door': leaveAtDoor,
        'recipient_name': recipientName,
        'recipient_phone': recipientPhone,
        'gift_message': giftMessage,
        'parcel_details': parcelDetails?.toJson(),
        'errand_details': errandDetails?.toJson(),
        'laundry_details': laundryDetails?.toJson(),
        'delivery_otp': deliveryOtp,
        'otp_required': otpRequired,
        'cancel_reason': cancelReason,
        'customer_name': customerName,
        'customer_phone': customerPhone,
        'payment_pending': paymentPending,
      };

  factory OreOrder.fromJson(Map<String, dynamic> json) {
    final items = ((json['items'] as List?) ?? [])
        .map((e) => OrderLineItem.fromJson(e as Map<String, dynamic>))
        .toList();
    return OreOrder(
      id: json['id'] as String,
      serviceType: ServiceType.fromJson(json['service_type'] as String?),
      items: items,
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0,
      deliveryFee: (json['delivery_fee'] as num?)?.toDouble() ?? 0,
      returnDeliveryFee:
          (json['return_delivery_fee'] as num?)?.toDouble() ?? 0,
      serviceFee: (json['service_fee'] as num?)?.toDouble() ?? 0,
      riderTip: (json['rider_tip'] as num?)?.toDouble(),
      discount: (json['discount'] as num?)?.toDouble() ?? 0,
      total: (json['total'] as num?)?.toDouble() ?? 0,
      paymentMethod: PaymentMethod.values.firstWhere(
        (p) => p.name == json['payment_method'],
        orElse: () => PaymentMethod.cash,
      ),
      isPaid: json['is_paid'] as bool? ?? false,
      address: json['address'] != null
          ? OreAddress.fromJson(json['address'] as Map<String, dynamic>)
          : const OreAddress(street: ''),
      vendorId: json['vendor_id'] as String? ?? '',
      vendorName: json['vendor_name'] as String? ?? '',
      vendorImage: json['vendor_image'] as String?,
      riderId: json['rider_id'] as String?,
      riderName: json['rider_name'] as String?,
      riderPhoto: json['rider_photo'] as String?,
      riderRating: (json['rider_rating'] as num?)?.toDouble(),
      riderPhone: json['rider_phone'] as String?,
      pickupLat: (json['pickup_lat'] as num?)?.toDouble(),
      pickupLng: (json['pickup_lng'] as num?)?.toDouble(),
      riderLat: (json['rider_lat'] as num?)?.toDouble(),
      riderLng: (json['rider_lng'] as num?)?.toDouble(),
      riderPositionAt: json['rider_position_at'] is String ? DateTime.tryParse(json['rider_position_at'] as String) : null,
      specialInstructions: json['special_instructions'] as String?,
      laundryStage: json['laundry_stage'] as String?,
      marketFulfillment: json['market_fulfillment'] is Map
          ? Map<String, dynamic>.from(json['market_fulfillment'] as Map)
          : null,
      prescriptionRequired: json['prescription_required'] as bool? ?? false,
      prescriptionStatus: json['prescription_status'] as String?,
      prescriptionReviewNote: json['prescription_review_note'] as String?,
      status: OrderStatus.fromApi(json['status'] as String?),
      placedAt: json['placed_at'] != null
          ? DateTime.parse(json['placed_at'] as String)
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'] as String)
          : null,
      eta: json['eta'] as String? ?? '',
      scheduledFor: json['scheduled_for'] != null
          ? DateTime.tryParse(json['scheduled_for'] as String)
          : null,
      leaveAtDoor: json['leave_at_door'] as bool? ?? false,
      recipientName: json['recipient_name'] as String?,
      recipientPhone: json['recipient_phone'] as String?,
      giftMessage: json['gift_message'] as String?,
      parcelDetails: json['parcel_details'] != null
          ? ParcelDetails.fromJson(
              json['parcel_details'] as Map<String, dynamic>)
          : null,
      errandDetails: json['errand_details'] != null
          ? ErrandDetails.fromJson(
              json['errand_details'] as Map<String, dynamic>)
          : null,
      laundryDetails: json['laundry_details'] != null
          ? LaundryDetails.fromJson(
              json['laundry_details'] as Map<String, dynamic>)
          : null,
      deliveryOtp: json['delivery_otp'] as String?,
      otpRequired: json['otp_required'] as bool? ?? false,
      cancelReason: json['cancel_reason'] as String?,
      customerName: json['customer_name'] as String?,
      customerPhone: json['customer_phone'] as String?,
      paymentPending: json['payment_pending'] as bool? ?? false,
    );
  }
}

enum PaymentMethod { cash, momo, card, wallet }

extension PaymentMethodX on PaymentMethod {
  String get label {
    switch (this) {
      case PaymentMethod.cash:
        return 'Cash on Delivery';
      case PaymentMethod.momo:
        return 'Mobile Money';
      case PaymentMethod.card:
        return 'Card';
      case PaymentMethod.wallet:
        return 'Ore Wallet';
    }
  }

  String get shortLabel {
    switch (this) {
      case PaymentMethod.cash:
        return 'Cash';
      case PaymentMethod.momo:
        return 'MoMo';
      case PaymentMethod.card:
        return 'Card';
      case PaymentMethod.wallet:
        return 'Wallet';
    }
  }
}

class ParcelDetails {
  final String category; // Documents / Small / Medium / Large
  final double? weightKg;
  final double? value;
  final String? description;
  final bool isFragile;
  final bool sealed;
  final String? proofMode;
  final String? parcelStatus;
  final String? returnReason;
  final OreAddress? pickupAddress;
  final OreAddress? recipientAddress;
  final String? recipientName;
  final String? recipientPhone;

  const ParcelDetails({
    required this.category,
    this.weightKg,
    this.value,
    this.description,
    this.isFragile = false,
    this.sealed = false,
    this.proofMode,
    this.parcelStatus,
    this.returnReason,
    this.pickupAddress,
    this.recipientAddress,
    this.recipientName,
    this.recipientPhone,
  });

  Map<String, dynamic> toJson() => {
        'category': category,
        'weight_kg': weightKg,
        'value': value,
        'description': description,
        'is_fragile': isFragile,
        'sealed': sealed,
        'proof_mode': proofMode,
        'parcel_status': parcelStatus,
        'return_reason': returnReason,
        'pickup_address': pickupAddress?.toJson(),
        'recipient_address': recipientAddress?.toJson(),
        'recipient_name': recipientName,
        'recipient_phone': recipientPhone,
      };

  factory ParcelDetails.fromJson(Map<String, dynamic> json) => ParcelDetails(
        category: json['category'] as String? ?? 'Small Package',
        weightKg: (json['weight_kg'] as num?)?.toDouble(),
        value: (json['value'] as num?)?.toDouble(),
        description: json['description'] as String?,
        isFragile: json['is_fragile'] as bool? ?? false,
        sealed: json['sealed'] as bool? ?? false,
        proofMode: json['proof_mode'] as String?,
        parcelStatus: json['parcel_status'] as String?,
        returnReason: json['return_reason'] as String?,
        pickupAddress: json['pickup_address'] != null
            ? OreAddress.fromJson(
                json['pickup_address'] as Map<String, dynamic>)
            : null,
        recipientAddress: json['recipient_address'] != null
            ? OreAddress.fromJson(
                json['recipient_address'] as Map<String, dynamic>)
            : null,
        recipientName: json['recipient_name'] as String?,
        recipientPhone: json['recipient_phone'] as String?,
      );
}

class ErrandDetails {
  final String taskTitle;
  final String? description;
  final double? budget;
  final double? spent;
  final int receiptCount;
  final OreAddress? location;
  final String? contactPhone;
  final String? errandStatus;
  final String? substitutionItem;
  final double? substitutionPrice;
  final String? substitutionStatus;
  final double? compensation;
  final bool requiresReceipt;

  const ErrandDetails({
    required this.taskTitle,
    this.description,
    this.budget,
    this.spent,
    this.receiptCount = 0,
    this.location,
    this.contactPhone,
    this.errandStatus,
    this.substitutionItem,
    this.substitutionPrice,
    this.substitutionStatus,
    this.compensation,
    this.requiresReceipt = true,
  });

  Map<String, dynamic> toJson() => {
        'task_title': taskTitle,
        'description': description,
        'budget': budget,
        'spent': spent,
        'receipt_count': receiptCount,
        'location': location?.toJson(),
        'contact_phone': contactPhone,
        'errand_status': errandStatus,
        'substitution_item': substitutionItem,
        'substitution_price': substitutionPrice,
        'substitution_status': substitutionStatus,
        'compensation': compensation,
        'requires_receipt': requiresReceipt,
      };

  factory ErrandDetails.fromJson(Map<String, dynamic> json) => ErrandDetails(
        taskTitle: json['task_title'] as String? ?? 'Errand',
        description: json['description'] as String?,
        budget: (json['budget'] as num?)?.toDouble(),
        spent: (json['spent'] as num?)?.toDouble(),
        receiptCount: (json['receipt_count'] as num?)?.toInt() ?? 0,
        location: json['location'] != null
            ? OreAddress.fromJson(json['location'] as Map<String, dynamic>)
            : null,
        contactPhone: json['contact_phone'] as String?,
        errandStatus: json['errand_status'] as String?,
        substitutionItem: json['substitution_item'] as String?,
        substitutionPrice: (json['substitution_price'] as num?)?.toDouble(),
        substitutionStatus: json['substitution_status'] as String?,
        compensation: (json['compensation'] as num?)?.toDouble(),
        requiresReceipt: json['requires_receipt'] as bool? ?? true,
      );
}

class LaundryDetails {
  final int itemCount;
  final String serviceTier; // Wash & Fold / Dry Clean / Iron Only
  final bool isTwoTrip;
  final String? detergentPreference;

  const LaundryDetails({
    required this.itemCount,
    this.serviceTier = 'Wash & Fold',
    this.isTwoTrip = true,
    this.detergentPreference,
  });

  Map<String, dynamic> toJson() => {
        'item_count': itemCount,
        'service_tier': serviceTier,
        'is_two_trip': isTwoTrip,
        'detergent_preference': detergentPreference,
      };

  factory LaundryDetails.fromJson(Map<String, dynamic> json) => LaundryDetails(
        itemCount: (json['item_count'] as num?)?.toInt() ?? 0,
        serviceTier: json['service_tier'] as String? ?? 'Wash & Fold',
        isTwoTrip: json['is_two_trip'] as bool? ?? true,
        detergentPreference: json['detergent_preference'] as String?,
      );
}

/// Client-side order ID generator — replaced by server-issued IDs on response.
class OrderIdGenerator {
  static int _counter = 0;
  static const _uuid = Uuid();

  static String next(ServiceType t) {
    _counter += 1;
    final ms = DateTime.now().millisecondsSinceEpoch;
    return '${t.orderPrefix}-${ms % 1000000}${_counter.toString().padLeft(2, '0')}';
  }

  static String uuid() => _uuid.v4();
}
