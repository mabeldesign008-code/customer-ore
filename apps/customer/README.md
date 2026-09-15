# Ore Customer App

The customer-facing Flutter app for **Ore Delivery** — on-demand delivery for Cape Coast, Ghana. Supports food, groceries, market, pharmacy, shop, laundry, parcel, and errand delivery.

## Stack

| Concern | Choice |
|---|---|
| UI toolkit | Flutter 3.x (Material 3) |
| State management | Riverpod (`flutter_riverpod`) |
| Navigation | go_router (declarative, auth-guarded redirects) |
| Networking | Dio + shared `OreApiClient` from `ore_core` (auto token refresh, bearer injection, in-memory cache) |
| Real-time | Socket.IO (tracking rider position, order chat, VoIP signalling) |
| Maps | `flutter_map` (OpenStreetMap tiles) with Google Places / what3words / Ghana GPS autocomplete proxied through the Ore gateway |
| Payments | Paystack (MoMo + Card), Cash on Delivery, Ore Wallet |
| Voice | Twilio Programmable Voice (in-app VoIP calls to riders/support) |
| Push | Firebase Cloud Messaging (optional — see setup) |
| Logging | Logger + flutter_animate haptics/micro-interactions |

## Project Layout

```
lib/
├── main.dart                    # App entry, error boundaries, theme, connectivity
├── core/
│   ├── router/app_router.dart   # All routes + auth redirect guards
│   └── ui/                      # Shared UI primitives (bouncy scroll, image loader, toast extension)
├── data/
│   ├── address/                 # Backed-backed saved addresses
│   ├── auth/                    # OTP + token storage (flutter_secure_storage)
│   ├── cart/                    # Cart CRUD, checkout, fee estimates
│   ├── catalog/                 # Vendors, items, search, favourites, vouchers, reviews
│   ├── ledger/                  # Wallet, loyalty points, disputes
│   ├── location/                # Device location + Places autocomplete (Google/GhanaGPS/w3w)
│   ├── notifications/           # FCM registration + REST inbox
│   ├── order/                   # Order history, cancellation, OTP, delivery proof
│   ├── payment/                 # Paystack URL launcher
│   ├── referral/
│   └── tracking/                # Rider position over HTTP (Socket.IO lives in ore_core)
├── providers/                   # Riverpod providers (state + wiring)
├── screens/                     # One file per screen; parcel/errand subfolders
├── widgets/                     # Shared UI widgets (AddToCartSheet, address picker)
└── models/                      # Customer-only models (vendor_story)
```

Shared models, theme, widgets, and networking live in the **`packages/ore_core`** package so rider/vendor apps stay consistent.

## Getting Started

### 1. Install Flutter

Install Flutter 3.22+ from https://docs.flutter.dev/get-started/install.

```bash
flutter --version    # Should show Flutter 3.22+ / Dart 3.4+
```

### 2. Install dependencies

From the repository root:

```bash
pnpm install                       # Nx monorepo tooling (optional; needed only for pnpm flutter:* scripts)
cd apps/customer
flutter pub get
```

### 3. Configure environment

Copy the example env and edit values:

```bash
cp .env.example .env           # if needed; .env is already in assets/
```

The file at `apps/customer/.env` (bundled as an asset) supports:

```
API_BASE_URL=https://api-staging.ore.delivery
GOOGLE_MAPS_API_KEY=your_key_here
FLAVOR=development
```

For production, prefer `--dart-define` over `.env`:

```bash
flutter run \
  --dart-define=API_BASE_URL=https://api.ore.delivery \
  --dart-define=FLAVOR=production
```

### 4. (Optional) Enable push notifications

The app boots without Firebase. To enable FCM push:

```bash
# One-time setup
dart pub global activate flutterfire_cli
flutterfire configure --project=your-firebase-project   # generates firebase_options.dart
```

Then in `lib/main.dart`:

1. Add `import 'package:firebase_core/firebase_core.dart';` and `import 'firebase_options.dart';`
2. Uncomment `await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);` inside `_tryInitFirebase()`.
3. Drop your `google-services.json` into `android/app/` and `GoogleService-Info.plist` into `ios/Runner/`.

Without this, the app runs fully — you just won't get background push notifications; the in-app notifications inbox still refreshes on open.

### 5. Run

```bash
# Run on connected device / emulator
flutter run

# Web
flutter run -d chrome --web-port=4200

# Release APK
flutter build apk --release

# iOS (requires macOS + Xcode)
flutter build ios --release
```

### 6. Pointing at a local backend

```bash
# 1. Start backend services (see repo root README):
#    docker compose up -d postgres redis nats
#    pnpm dev
# 2. Run the app against local gateway:
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000   # Android emulator (10.0.2.2 = host)
flutter run --dart-define=API_BASE_URL=http://localhost:4000  # iOS simulator / desktop
```

## Backend Integration Coverage

All endpoints go through the **API gateway** (port 4000), never directly to internal services. `OreEndpoints` in `packages/ore_core` is the single source of truth for paths.

| Surface | Customer endpoints | Wired? |
|---|---|---|
| Auth | `/api/auth/request-otp`, `/verify-otp`, `/refresh`, `/me`, `/profile` | ✅ |
| Saved addresses | `/api/auth/customers/me/addresses` (CRUD) | ✅ |
| Catalog | `/api/catalog/vendors`, `/vendors/:id/items`, `/search/items`, `/stories`, `/reviews` | ✅ |
| Cart | `/api/cart`, `/cart/items`, `/cart/checkout`, `/cart/estimate`, `/cart/reorder` | ✅ |
| Orders | `/api/order/customers/me/orders`, `/orders/:id`, `/orders/:id/cancel`, `/orders/:id/otp` | ✅ |
| Tracking | `/api/tracking/orders/:id/rider` (HTTP) + `/api/tracking` Socket.IO | ✅ |
| Dispatch | (Customer only needs rider info; exposed via order aggregation) | ✅ |
| Payment | Paystack hosted page via `/api/payment/payments/wallet/top-up`, webhook confirmation polled | ✅ |
| Ledger | `/api/ledger/customers/me/credit`, `/loyalty`, `/disputes/me` | ✅ |
| Comms | `/api/comms/threads`, `/comms/socket.io`, voice token + calls (`/voice/token`, `/voice/support`) | ✅ |
| Notifications | `/api/notifications/me`, `/device-token` | ✅ |
| Referrals | `/api/referral/me`, `/mine`, `/claim` | ✅ |
| Places | `/api/tracking/places/autocomplete`, `/places/details`, `/geocode` (Google/GhanaGPS/w3w) | ✅ |

## Feature Checklist

- [x] OTP authentication (Hubtel SMS)
- [x] Multi-vendor food / grocery / market / shop / pharmacy / laundry browsing
- [x] Instagram-style vendor stories
- [x] Product detail + add-to-cart with modifiers
- [x] Multi-vendor cart with remote sync + guest → signed-in cart merge
- [x] Checkout with: saved addresses, delivery note, leave-at-door, wallet credit, voucher, rider tip, MoMo/Card/COD per vendor, fee estimate
- [x] Paystack payment flow (with polling for webhook confirmation)
- [x] Parcel delivery (3-step flow)
- [x] Errand running (3-step flow)
- [x] Laundry vendors list
- [x] Order list, order detail, cancellation
- [x] Live rider tracking (Socket.IO + HTTP fallback) + OTP reveal at drop-off
- [x] In-app voice calls to rider / support (Twilio VoIP)
- [x] Order chat (Socket.IO)
- [x] Wallet (top-up, loyalty points, credit application at checkout)
- [x] Disputes / refund requests
- [x] Referrals
- [x] Vouchers & offers
- [x] Saved addresses (backend-synced)
- [x] Favourites
- [x] Search (with mic/voice entry — OS keyboard voice dictation is enabled; typing search fully functional)
- [x] Profile + profile editing
- [x] Settings (dark mode, notification preferences, sign out)
- [x] Help & support (chat, call, mailto)
- [x] Push notifications (FCM; native config required)
- [x] Offline banner via connectivity_plus
- [x] Light/dark mode with persisted preference
- [x] Hero animations, haptics, micro-interactions, bouncy scrolling
- [x] Accessibility: text scaling bounded to 0.85–1.3x, semantics labels on interactive images

## Performance

- Images are cached and decoded at 2.5x logical resolution (not native pixel resolution) to cap memory on vendor lists.
- Riverpod `NotifierProvider` / `FutureProvider` with `keepAlive()` on long-lived state (auth, cart, wallet).
- Auto-cancelled in-flight requests via Dio on provider dispose (token refresh deduplication).
- List views use `ListView.separated` with `BouncingScrollPhysics`; heavy widget trees (bottom sheets, stories, modals) use `Animate()` delay-staggered entry to avoid frame drops.

## Security

- Access tokens stored in `flutter_secure_storage` (Keychain / Keystore), never in plain SharedPreferences.
- Token auto-refresh with queue-draining interceptor: only one refresh in flight, others retry with new token.
- All `/api/*` requests go through the HTTPS gateway; internal service URLs never appear on device.
- No hardcoded production secrets in Dart. Payment URLs come from the backend; Paystack secret stays server-side.
- Certificate verification left to Flutter's default `SecurityContext`; consider adding SSL pinning via `HttpClient.badCertificateCallback` in a future release for high-risk markets.
- OTP brute-force throttling enforced server-side (see audit S-1 comments in gateway).

## Building for Release

```bash
# Android
flutter build appbundle --release \
  --dart-define=API_BASE_URL=https://api.ore.delivery \
  --dart-define=FLAVOR=production

# iOS (macOS only)
flutter build ipa --release \
  --dart-define=API_BASE_URL=https://api.ore.delivery \
  --dart-define=FLAVOR=production

# Web
flutter build web --release \
  --dart-define=API_BASE_URL=https://api.ore.delivery \
  --dart-define=FLAVOR=production
```

Android signing config and iOS code-signing need to be set up per the standard Flutter docs.

## Further reading

- **[SECURITY.md](./SECURITY.md)** — defence-in-depth controls, cert pinning, RASP, threat model, go-live checklist.
- **[PERFORMANCE.md](./PERFORMANCE.md)** — performance targets, patterns we follow, profiling runbook.
- **[STORE_COMPLIANCE.md](./STORE_COMPLIANCE.md)** — Play Store & App Store submission checklist, common rejection reasons.
- **[FLAVORS.md](./FLAVORS.md)** — build flavors, signing configs, release commands.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `SocketException` on launch | Check `API_BASE_URL` in `.env` or `--dart-define`. Android emulator needs `http://10.0.2.2:4000` to reach host. |
| Login works but images don't load | Confirm the gateway is running and vendor media has been seeded (`pnpm seed`). |
| Voice calls fail to connect | Ensure Twilio credentials and a Push Credential are configured for the platform; VoIP calls need a real device (PushKit on iOS, FCM on Android). |
| Tracking map shows Cape Coast only | The rider position has not yet been received. The map falls back to pickup/drop defaults until a Socket location event arrives. |
| `google-services.json` missing warning | Push is optional — the app works without it. Run `flutterfire configure` to enable FCM. |
