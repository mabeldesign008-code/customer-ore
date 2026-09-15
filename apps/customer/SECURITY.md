# Security & Compliance Guide — Ore Customer App

This document catalogues every security and compliance control baked into the
customer app, what is still operational before go-live, and how to satisfy
Play Store / App Store review on the first submission.

The security bar is industry-standard for on-demand / fintech-class apps
(Uber, Bolt, Glovo, Opay).

## Defence-in-Depth Summary

| Layer | Control | Where |
|---|---|---|
| Code | Release build obfuscated & shrunk (R8/ProGuard) | `android/app/proguard-rules.pro` |
| Code | No secrets in Dart; all via `--dart-define` / `.env` | README, `OreApiClient.resolveBaseUrl()` |
| Code | `debugPrint` silenced in release | `lib/core/security/ore_security.dart` |
| Code | PII redactor for crash reporters | `redactSensitive()` |
| Code | Tokens in `flutter_secure_storage` (KeyStore / Keychain), never SharedPreferences | `data/auth/customer_token_storage.dart` |
| Code | Token auto-refresh with dedup + queue | `OreApiClient._BearerTokenInterceptor` |
| Code | TLS 1.2+ enforced; no `badCertificateCallback` overrides | `api_client.dart` |
| Code | Socket.IO always uses `wss://` in production (http→ws only on dev) | `packages/ore_core/.../tracking_socket.dart` |
| Network | Pin SHA-256 SPKI pins for api.ore.delivery & api-staging | `android/app/src/main/res/xml/network_security_config.xml` |
| Network | User-installed CAs NOT trusted in release (blocks Charles/mitmproxy) | same file |
| Network | Android cleartext traffic disabled globally | `AndroidManifest.xml` `usesCleartextTraffic=false` |
| Network | Debug variant has its own permissive network_security_config | `android/app/src/debug/res/xml/...` |
| Network | iOS ATS enforced (NSAllowsArbitraryLoads = false) | `ios/Runner/Info.plist` |
| Platform | `android:allowBackup="false"` + explicit data-extraction opt-out | `AndroidManifest.xml` + `xml/data_extraction_rules.xml` |
| Platform | Tapjacking: `android:filterTouchesWhenObscured="true"` | `AndroidManifest.xml` |
| Platform | All iOS `NS*UsageDescription` strings present | `Info.plist` |
| Platform | Customer app does NOT request background-location (would trigger Play rejection; riders need it, customers don't) | `AndroidManifest.xml` |

## Go-Live Checklist

### 1. Certificate pinning (MANDATORY)

The pins in `network_security_config.xml` are placeholders. Replace them before
submitting to Play/App Store, otherwise TLS will fail:

```bash
# Generate SPKI pin for your leaf cert (recommended):
openssl s_client -connect api.ore.delivery:443 -servername api.ore.delivery \
  | openssl x509 -pubkey -noout \
  | openssl pkey -pubin -outform der \
  | openssl dgst -sha256 -binary \
  | openssl enc -base64

# Also generate a BACKUP pin for your intermediate or a spare cert so you
# can rotate without an app update outage.
```

- Put BOTH pins in `<pin-set>`.
- Pin the intermediate or root CA public key, **not** the leaf, to avoid
  forced updates every 90 days when Let's Encrypt rotates.
- Set `<pin-set expiration="…">` to a date **before** your next cert rotation.
- For iOS, add [TrustKit](https://github.com/datatheorem/TrustKit) or
  [http_certificate_pinning](https://pub.dev/packages/http_certificate_pinning)
  in a follow-up (Info.plist ATS is currently enabled but pinning is
  platform-enforced on Android only for v1).

### 2. iOS Privacy Manifest (PrivacyInfo.xcprivacy) — MANDATORY from Spring 2024

Create `ios/Runner/PrivacyInfo.xcprivacy` declaring reasons for every required
reason API your dependencies use. Without this, Apple will reject the binary
during ITMS-91053 audit. The minimum file covers:
- `NSPrivacyAccessedAPICategoryUserDefaults` (flutter_secure_storage reads once)
- `NSPrivacyAccessedAPICategoryFileTimestamp` (Dart SDK)
- `NSPrivacyAccessedAPICategorySystemBootTime` (Dart SDK timers)

### 3. Play Data Safety form answers (recommended truthful answers)

| Category | Collected? | Purpose |
|---|---|---|
| Precise location | Yes, foreground only | Delivery drop-off, nearby vendors |
| Personal info (name / email / phone / address) | Yes | Account, delivery fulfilment |
| Payment info (Paystack ref, wallet balance) | Yes (processed server-side, not raw card numbers) | Order fulfilment |
| Photos/videos | Optional (dispute evidence) | Customer support |
| Device or other IDs (FCM token) | Yes | Push notifications |
| Crash logs | Optional (opt-in) | Stability |
| App interactions | Yes | Service improvement |

All data is encrypted in transit (TLS) and encrypted at rest in the backend.

### 4. Permissions justification

The customer app currently requests:
- **INTERNET, ACCESS_NETWORK_STATE** – required.
- **ACCESS_FINE_LOCATION / ACCESS_COARSE_LOCATION** – foreground only, used for
  drop-off pin and vendor discovery.
- **CAMERA** – dispute/issue photo upload.
- **POST_NOTIFICATIONS** – order updates.
- **RECORD_AUDIO / MODIFY_AUDIO_SETTINGS** – in-app VoIP calls (Twilio).
- **CALL_PHONE / READ_PHONE_STATE / READ_PHONE_NUMBERS / MANAGE_OWN_CALLS** – Twilio
  ConnectionService integration (native-calling UI).
- **BLUETOOTH_CONNECT** – VoIP audio routing to headsets.
- **WAKE_LOCK / VIBRATE** – keep alive during call, haptics.

DO NOT add `ACCESS_BACKGROUND_LOCATION` to the customer app. Only the rider
app needs it; the customer app never tracks the customer's location when
backgrounded. Adding it triggers an in-app disclosure requirement and extra
Play review that will reject if the justification is weak.

### 5. Logout must clear everything

Logout already calls `CustomerTokenStorage.clear()` which deletes both access
and refresh tokens from KeyStore/Keychain. Add FCM token deletion (call
`DELETE /api/notifications/device-token`) in a follow-up so notifications
don't keep going to logged-out users.

### 6. Enabling RASP (anti-tamper) — OPTIONAL but recommended for payment flows

For fintech-grade runtime protection (root / jailbreak / Frida / debugger /
repackaging detection):

1. Add `freerasp: ^6.4.0` to `pubspec.yaml`.
2. Create `lib/core/security/rasp.dart` that calls `Talsec.start(...)` with:
   - `androidConfig` (package name + signing cert hashes)
   - `iosConfig` (bundle ID + team ID)
3. In the `onThreatDetected` callback, for high-severity threats (root, hook,
   tamper) wipe tokens via `ref.read(customerAuthProvider.notifier).logout()`
   and show a non-dismissible security-warning screen. For medium threats
   (debugger, simulator), warn and disable wallet/payment flows only.
4. Wire it from `main.dart` inside `runZonedGuarded` only on release builds.

### 7. Sentry crash reporting (optional)

The `main.dart` `PlatformDispatcher.onError` has a comment block showing the
exact Sentry wiring. To enable:

1. Add `sentry_flutter: ^8.10.0` to pubspec.yaml.
2. Pass `SENTRY_DSN` via `--dart-define=SENTRY_DSN=...`.
3. Wrap `runApp` in `SentryFlutter.init(...)` and replace the TODO with
   `Sentry.captureException(error, stackTrace: stack)`.
4. Pass `beforeSend: (event, hint) => event..throwable = redactSensitive(...)`
   to guarantee tokens/PII never leave the device.

### 8. Build commands for release

```bash
# Android (Play App Bundle)
flutter build appbundle --release \
  --obfuscate --split-debug-info=build/debug-info \
  --dart-define=API_BASE_URL=https://api.ore.delivery \
  --dart-define=FLAVOR=production

# iOS
flutter build ipa --release \
  --obfuscate --split-debug-info=build/debug-info \
  --dart-define=API_BASE_URL=https://api.ore.delivery \
  --dart-define=FLAVOR=production
```

The `--obfuscate --split-debug-info=...` flags are critical — without them
your Dart logic is fully reversible from the compiled APK/IPA. Always commit
the `build/debug-info/` folder to your private crash-symbol storage (not to
Git) so Sentry/Crashlytics can deobfuscate stack traces.

### 9. Dependency hygiene

Run this before each release:

```bash
flutter pub outdated                 # Check for stale deps
dart pub audit                      # Known-CVE scan (Dart 3.5+)
# Or for older SDKs use: https://pub.dev/packages/pana
```

Audit every new transitive dependency for maintenance status and permission
requests. Treat pub.dev packages as part of your supply chain.

## Threat Model Covered

| Threat | Mitigation |
|---|---|
| MITM on public Wi-Fi | TLS 1.2+ + cert pinning |
| Packet interception via user-installed CA (Charles/mitmproxy) | Android trust-anchors excludes user CAs in release; iOS ATS |
| Credential theft from backup | allowBackup=false + data-extraction opt-out |
| Token extraction on rooted device | RASP (optional) locks payments; tokens in KeyStore (hardware-backed) |
| Tapjacking overlay malware | filterTouchesWhenObscured=true |
| Reverse engineering | Obfuscation + R8 shrinking; secrets never in binary |
| Debug-log leakage in production | debugPrint silenced in release |
| Accidental ws:// / http:// calls | base-config cleartext=false; socket normalized to wss:// |
| Stolen refresh token | Short-lived (15-min) access token; server-side rotate-on-use |
| Crash report PII leak | redactSensitive() on all error paths |
| Sensitive screen recording / screenshots | FLAG_SECURE via MainActivity (add per-window flutter_windowmanager when enabling FreeRASP) |

## Threat Model NOT Covered (by design)

- Client-side "trust" for payment limits, promo eligibility, or wallet
  balance — the backend must always re-validate. The client is an untrusted
  surface; any "authoritative" client-side state is a bug.
- Server/account takeover via SIM-swap — mitigated server-side by Hubtel
  OTP rate limits and future optional biometric/PIN re-auth before checkout.
