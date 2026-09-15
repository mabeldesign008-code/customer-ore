# Build Flavors

The Ore customer app supports three runtime configurations. Choose one per build.

## Using `--dart-define` (preferred — no extra tooling)

| Flavor | Command | Base URL |
|---|---|---|
| Development | `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000 --dart-define=FLAVOR=development` | Local backend (emulator) |
| Staging | `flutter run --dart-define=API_BASE_URL=https://api-staging.ore.delivery --dart-define=FLAVOR=staging` | Staging gateway |
| Production | `flutter run --release --dart-define=API_BASE_URL=https://api.ore.delivery --dart-define=FLAVOR=production` | Production gateway |

`OreApiClient.resolveBaseUrl` reads `API_BASE_URL` from `--dart-define` first, then falls back to `dotenv.env['API_BASE_URL']` from the bundled `.env` asset.

## Using `flutter_flavorizr` (optional, for per-platform app IDs)

If you need separate bundle IDs / app names installed side-by-side (e.g. `com.ore.app.dev` vs `com.ore.app`), add to `pubspec.yaml`:

```yaml
dev_dependencies:
  flutter_flavorizr: ^2.2.3

flavorizr:
  app:
    android:
      flavorDimensions: "environment"
    ios: {}
  flavors:
    dev:
      app:
        name: "Ore Dev"
      android:
        applicationId: "com.ore.app.dev"
      ios:
        bundleId: "com.ore.app.dev"
    staging:
      app:
        name: "Ore Staging"
      android:
        applicationId: "com.ore.app.staging"
      ios:
        bundleId: "com.ore.app.staging"
    prod:
      app:
        name: "Ore"
      android:
        applicationId: "com.ore.app"
      ios:
        bundleId: "com.ore.app"
```

Then run `dart run flutter_flavorizr` and launch with `flutter run --flavor dev`.

## Environment variables recognized at build time

| Key | Meaning |
|---|---|
| `API_BASE_URL` | Full URL of the Ore API gateway (no trailing slash) |
| `FLAVOR` | `development` / `staging` / `production` — selects log level and crash-reporting opt-in |
| `SENTRY_DSN` | *(Optional)* Sentry DSN for crash reporting (after wiring sentry_flutter as noted in `main.dart`) |
| `GOOGLE_MAPS_API_KEY` | *(Optional)* Android/iOS-restricted Places key for lower-latency autocomplete |

## Platform-specific configuration

### Android

Signing keystore lives outside the repo. Point `android/key.properties` at it:

```properties
storePassword=...
keyPassword=...
keyAlias=ore
storeFile=/path/to/ore-keystore.jks
```

### iOS

- Open `ios/Runner.xcworkspace` and configure code signing per scheme in Xcode.
- For VoIP push, enable Push Notifications + Voice over IP in the target capabilities.
- Add NSLocationWhenInUseUsageDescription and NSLocationAlwaysAndWhenInUseUsageDescription strings in `Info.plist` (already present).

## Release builds

```bash
# Android (AAB for Play Store)
flutter build appbundle --release \
  --dart-define=API_BASE_URL=https://api.ore.delivery \
  --dart-define=FLAVOR=production

# iOS (IPA for TestFlight / App Store — requires macOS + Xcode)
flutter build ipa --release \
  --dart-define=API_BASE_URL=https://api.ore.delivery \
  --dart-define=FLAVOR=production

# Web (for PWA / embedded web flow)
flutter build web --release \
  --dart-define=API_BASE_URL=https://api.ore.delivery \
  --dart-define=FLAVOR=production
```
