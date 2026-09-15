import 'package:flutter/material.dart';

/// The eight Ore services.
///
/// Catalogue services (customer → vendor → rider):
///   food, groceries, market, shop, pharmacy, laundry.
/// Request services (customer → rider only, no vendor):
///   parcel, errand.
enum ServiceType {
  food,
  groceries,
  market,
  shop,
  pharmacy,
  laundry,
  parcel,
  errand;

  // ── Labels / metadata ────────────────────────────────────────────────
  String get label {
    switch (this) {
      case ServiceType.food:
        return 'Food';
      case ServiceType.groceries:
        return 'Groceries';
      case ServiceType.market:
        return 'Market';
      case ServiceType.shop:
        return 'Shop';
      case ServiceType.pharmacy:
        return 'Pharmacy';
      case ServiceType.laundry:
        return 'Laundry';
      case ServiceType.parcel:
        return 'Parcel';
      case ServiceType.errand:
        return 'Errand';
    }
  }

  /// 3-letter prefix used in order IDs (e.g. FOD-48291).
  String get orderPrefix {
    switch (this) {
      case ServiceType.food:
        return 'FOD';
      case ServiceType.groceries:
        return 'GRC';
      case ServiceType.market:
        return 'MKT';
      case ServiceType.shop:
        return 'SHP';
      case ServiceType.pharmacy:
        return 'PHR';
      case ServiceType.laundry:
        return 'LND';
      case ServiceType.parcel:
        return 'PCL';
      case ServiceType.errand:
        return 'ERR';
    }
  }

  IconData get icon {
    switch (this) {
      case ServiceType.food:
        return Icons.restaurant_rounded;
      case ServiceType.groceries:
        return Icons.local_grocery_store_rounded;
      case ServiceType.market:
        return Icons.storefront_rounded;
      case ServiceType.shop:
        return Icons.shopping_bag_rounded;
      case ServiceType.pharmacy:
        return Icons.local_pharmacy_rounded;
      case ServiceType.laundry:
        return Icons.local_laundry_service_rounded;
      case ServiceType.parcel:
        return Icons.inventory_2_rounded;
      case ServiceType.errand:
        return Icons.directions_run_rounded;
    }
  }

  Color get color {
    switch (this) {
      case ServiceType.food:
        return const Color(0xFFF97316); // warm orange (food energy)
      case ServiceType.groceries:
        return const Color(0xFF16A34A); // green (fresh)
      case ServiceType.market:
        return const Color(0xFFD97706); // amber (market stalls)
      case ServiceType.shop:
        return const Color(0xFF8B5CF6); // violet (retail variety)
      case ServiceType.pharmacy:
        return const Color(0xFF06B6D4); // cyan (medical/clean)
      case ServiceType.laundry:
        return const Color(0xFF0EA5E9); // sky blue (water/clean)
      case ServiceType.parcel:
        return const Color(0xFF10B981); // emerald (on-the-way)
      case ServiceType.errand:
        return const Color(0xFFEF4444); // red (urgent)
    }
  }

  /// True for the six three-sided catalogue services (customer + vendor + rider).
  bool get hasVendor =>
      this == ServiceType.food ||
      this == ServiceType.groceries ||
      this == ServiceType.market ||
      this == ServiceType.shop ||
      this == ServiceType.pharmacy ||
      this == ServiceType.laundry;

  /// True for the two request-style services (no vendor, customer + rider only).
  bool get isRequestOnly => this == ServiceType.parcel || this == ServiceType.errand;

  /// Laundry has two rides (pick up + drop off).
  bool get isTwoTrip => this == ServiceType.laundry;

  /// Services where the rider must collect a receipt before confirming.
  bool get requiresReceipt =>
      this == ServiceType.errand || this == ServiceType.market;

  /// All eight Ore services involve a rider journey.
  bool get isDelivery => true;

  /// Default post-checkout status message (shown before any real update).
  String get defaultStatusMessage {
    switch (this) {
      case ServiceType.food:
        return 'Looking for a restaurant to accept your order';
      case ServiceType.groceries:
        return 'Finding a shopper for your groceries';
      case ServiceType.market:
        return 'Finding a shopper for your market list';
      case ServiceType.shop:
        return 'Waiting for the store to confirm';
      case ServiceType.pharmacy:
        return 'Pharmacist is reviewing your order';
      case ServiceType.laundry:
        return 'Finding a rider to pick up your laundry';
      case ServiceType.parcel:
        return 'Finding a rider for your parcel';
      case ServiceType.errand:
        return 'Finding an agent for your errand';
    }
  }

  String get defaultEta {
    switch (this) {
      case ServiceType.food:
        return '20–30 min';
      case ServiceType.groceries:
        return '30–45 min';
      case ServiceType.market:
        return '45–60 min';
      case ServiceType.shop:
        return '30–45 min';
      case ServiceType.pharmacy:
        return '20–30 min';
      case ServiceType.laundry:
        return 'Ready in 24–48 hrs';
      case ServiceType.parcel:
        return 'Same-day delivery';
      case ServiceType.errand:
        return '30–60 min';
    }
  }

  String get heroHeadline {
    switch (this) {
      case ServiceType.food:
        return 'Hungry?';
      case ServiceType.groceries:
        return 'Out of something?';
      case ServiceType.market:
        return 'Need to shop?';
      case ServiceType.shop:
        return 'Need to dress up?';
      case ServiceType.pharmacy:
        return 'Not feeling well?';
      case ServiceType.laundry:
        return 'Laundry piling up?';
      case ServiceType.parcel:
        return 'Send a parcel';
      case ServiceType.errand:
        return 'Too busy to run it?';
    }
  }

  String get heroSubheadline {
    switch (this) {
      case ServiceType.food:
        return "Let's find you something";
      case ServiceType.groceries:
        return "Let's restock your kitchen";
      case ServiceType.market:
        return "Let's find your market";
      case ServiceType.shop:
        return "Let's find an outfit";
      case ServiceType.pharmacy:
        return "Let's get your meds";
      case ServiceType.laundry:
        return "Let's pick up & clean";
      case ServiceType.parcel:
        return 'Fast pickup & delivery';
      case ServiceType.errand:
        return 'An agent will run it for you';
    }
  }

  String get searchPlaceholder {
    switch (this) {
      case ServiceType.food:
        return 'Search for food, restaurants…';
      case ServiceType.groceries:
        return 'Search for groceries…';
      case ServiceType.market:
        return 'Search the market…';
      case ServiceType.shop:
        return 'Search for clothes, shoes…';
      case ServiceType.pharmacy:
        return 'Search for medication…';
      case ServiceType.laundry:
        return 'Search laundry services…';
      case ServiceType.parcel:
        return 'Where to?';
      case ServiceType.errand:
        return 'What do you need done?';
    }
  }

  String toJson() => name;
  static ServiceType fromJson(String? value) =>
      ServiceType.values.firstWhere((e) => e.name == value,
          orElse: () => ServiceType.food);
}
