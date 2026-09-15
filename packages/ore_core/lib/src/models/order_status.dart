/// Canonical, cross-app order status machine.
///
/// The same enum is consumed by customer, vendor and rider apps — each role
/// simply sees a different projection/message for a given status. Backend
/// owns the authoritative transitions; frontend renders them.
enum OrderStatus {
  /// Order placed, awaiting vendor acceptance.
  pending,

  /// Vendor accepted — starting prep/shopping.
  accepted,

  /// Vendor is actively preparing/packing.
  preparing,

  /// Vendor has marked ready-for-pickup; dispatch is finding a rider.
  readyForPickup,

  /// A rider has been assigned and is heading to the pickup point.
  riderAssigned,

  /// Rider has arrived at the pickup location (vendor/customer for request-based services).
  arrivedAtPickup,

  /// Rider has picked up the parcel/order and is heading to drop-off.
  pickedUp,

  /// Rider has arrived at the drop-off location.
  arrivedAtDropoff,

  /// Delivered / completed successfully.
  delivered,

  /// Cancelled (by customer, vendor, rider, or system).
  cancelled,

  /// Scheduled order, waiting for its time window to open.
  scheduled;

  // ── Display helpers ──────────────────────────────────────────────────
  String customerLabel({String? vendorName}) {
    switch (this) {
      case OrderStatus.pending:
        return 'Order placed';
      case OrderStatus.accepted:
        return '${vendorName ?? 'Vendor'} accepted your order';
      case OrderStatus.preparing:
        return '${vendorName ?? 'Vendor'} is preparing your order';
      case OrderStatus.readyForPickup:
        return 'Waiting for a rider to pick up';
      case OrderStatus.riderAssigned:
        return 'Rider is on the way to pick up';
      case OrderStatus.arrivedAtPickup:
        return 'Rider is at the pickup location';
      case OrderStatus.pickedUp:
        return 'Rider is heading to you';
      case OrderStatus.arrivedAtDropoff:
        return 'Rider has arrived';
      case OrderStatus.delivered:
        return 'Delivered';
      case OrderStatus.cancelled:
        return 'Cancelled';
      case OrderStatus.scheduled:
        return 'Scheduled';
    }
  }

  String vendorLabel() {
    switch (this) {
      case OrderStatus.pending:
        return 'New order';
      case OrderStatus.accepted:
        return 'Accepted';
      case OrderStatus.preparing:
        return 'Preparing';
      case OrderStatus.readyForPickup:
        return 'Ready for pickup';
      case OrderStatus.riderAssigned:
        return 'Rider assigned';
      case OrderStatus.arrivedAtPickup:
        return 'Rider at pickup';
      case OrderStatus.pickedUp:
        return 'Picked up';
      case OrderStatus.arrivedAtDropoff:
        return 'Out for delivery';
      case OrderStatus.delivered:
        return 'Completed';
      case OrderStatus.cancelled:
        return 'Cancelled';
      case OrderStatus.scheduled:
        return 'Scheduled';
    }
  }

  String riderLabel() {
    switch (this) {
      case OrderStatus.riderAssigned:
        return 'Heading to pickup';
      case OrderStatus.arrivedAtPickup:
        return 'Arrived at pickup';
      case OrderStatus.pickedUp:
        return 'Heading to drop-off';
      case OrderStatus.arrivedAtDropoff:
        return 'Arrived at drop-off';
      case OrderStatus.delivered:
        return 'Delivered';
      case OrderStatus.cancelled:
        return 'Cancelled';
      default:
        return label;
    }
  }

  /// Short human-readable label (used in lists, chips).
  String get label {
    switch (this) {
      case OrderStatus.pending:
        return 'Pending';
      case OrderStatus.accepted:
        return 'Accepted';
      case OrderStatus.preparing:
        return 'Preparing';
      case OrderStatus.readyForPickup:
        return 'Ready';
      case OrderStatus.riderAssigned:
        return 'Rider assigned';
      case OrderStatus.arrivedAtPickup:
        return 'At pickup';
      case OrderStatus.pickedUp:
        return 'On the way';
      case OrderStatus.arrivedAtDropoff:
        return 'At drop-off';
      case OrderStatus.delivered:
        return 'Delivered';
      case OrderStatus.cancelled:
        return 'Cancelled';
      case OrderStatus.scheduled:
        return 'Scheduled';
    }
  }

  bool get isTerminal =>
      this == OrderStatus.delivered || this == OrderStatus.cancelled;

  bool get isActive => !isTerminal && this != OrderStatus.scheduled;

  /// Matches the order service: `CANCELLED` is legal until before pickup.
  ///
  /// Frontend statuses that map from `PICKED_UP`, `OUT_FOR_DELIVERY`,
  /// `OTP_VERIFIED`, `DELIVERED`, or `CANCELLED` cannot be cancelled here.
  /// The server still rejects illegal transitions; this only hides the control.
  bool get canCustomerCancel {
    switch (this) {
      case OrderStatus.pending:
      case OrderStatus.accepted:
      case OrderStatus.preparing:
      case OrderStatus.readyForPickup:
      case OrderStatus.riderAssigned:
      case OrderStatus.arrivedAtPickup:
      case OrderStatus.scheduled:
        return true;
      case OrderStatus.pickedUp:
      case OrderStatus.arrivedAtDropoff:
      case OrderStatus.delivered:
      case OrderStatus.cancelled:
        return false;
    }
  }

  /// Matches dispatch `releaseByRider`: assigned rider, before pickup.
  bool get canRiderRelease {
    switch (this) {
      case OrderStatus.riderAssigned:
      case OrderStatus.arrivedAtPickup:
        return true;
      default:
        return false;
    }
  }

  /// 1-based step index used by the customer tracking timeline (1..9).
  int get timelineStep {
    switch (this) {
      case OrderStatus.pending:
        return 1;
      case OrderStatus.accepted:
        return 2;
      case OrderStatus.preparing:
        return 3;
      case OrderStatus.readyForPickup:
        return 4;
      case OrderStatus.riderAssigned:
        return 5;
      case OrderStatus.arrivedAtPickup:
        return 6;
      case OrderStatus.pickedUp:
        return 7;
      case OrderStatus.arrivedAtDropoff:
        return 8;
      case OrderStatus.delivered:
        return 9;
      case OrderStatus.cancelled:
        return 0;
      case OrderStatus.scheduled:
        return 0;
    }
  }

  String get apiValue {
    switch (this) {
      case OrderStatus.pending:
        return 'pending';
      case OrderStatus.accepted:
        return 'accepted';
      case OrderStatus.preparing:
        return 'preparing';
      case OrderStatus.readyForPickup:
        return 'ready_for_pickup';
      case OrderStatus.riderAssigned:
        return 'rider_assigned';
      case OrderStatus.arrivedAtPickup:
        return 'arrived_at_pickup';
      case OrderStatus.pickedUp:
        return 'picked_up';
      case OrderStatus.arrivedAtDropoff:
        return 'arrived_at_dropoff';
      case OrderStatus.delivered:
        return 'delivered';
      case OrderStatus.cancelled:
        return 'cancelled';
      case OrderStatus.scheduled:
        return 'scheduled';
    }
  }

  static OrderStatus fromApi(String? value) {
    // The order service returns its canonical enum values in uppercase
    // (for example PENDING_PAYMENT and RIDER_AT_VENDOR). The customer UI also
    // receives lowercase values from older gateway deployments, so normalize
    // once here instead of making every repository guess at the spelling.
    switch (value?.toLowerCase().trim()) {
      case 'awaiting_recipient':
      case 'pending_payment':
      case 'pending':
      case 'placed':
      case 'new':
        return OrderStatus.pending;
      case 'accepted':
      case 'confirmed':
        return OrderStatus.accepted;
      case 'preparing':
      case 'processing':
        return OrderStatus.preparing;
      case 'ready_for_pickup':
      case 'waiting_for_rider':
      case 'ready':
        return OrderStatus.readyForPickup;
      case 'rider_assigned':
      case 'rider_en_route_to_vendor':
      case 'in_transit':
      case 'in transit':
      case 'on_the_way':
        return OrderStatus.riderAssigned;
      case 'rider_at_vendor':
      case 'arrived_at_pickup':
        return OrderStatus.arrivedAtPickup;
      case 'picked_up':
      case 'picked up':
      case 'out_for_delivery':
        return OrderStatus.pickedUp;
      case 'otp_verified':
      case 'arrived_at_dropoff':
      case 'arrived':
        return OrderStatus.arrivedAtDropoff;
      case 'delivered':
      case 'completed':
        return OrderStatus.delivered;
      case 'cancelled':
      case 'rejected':
      case 'failed_delivery':
        return OrderStatus.cancelled;
      case 'scheduled':
        return OrderStatus.scheduled;
      default:
        return OrderStatus.pending;
    }
  }
}
