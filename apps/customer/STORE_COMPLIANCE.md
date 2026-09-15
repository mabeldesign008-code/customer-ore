# Store Compliance — Play Store & App Store Submission

Quick reference so you pass review on first submission.

## Google Play Console

### Required before uploading the AAB

1. **Privacy policy URL** — hosted (HTTPS, not PDF). Declare what you
   collect: name, phone, email, delivery address, precise location
   (foreground-only), FCM token, order history, payment transaction
   references, optional dispute photos.
2. **Data Safety form** (App content → Data safety):
   - Collects: location (precise), personal info (name, email, phone,
     address), financial info (payment transactions), photos & videos
     (user-provided), device IDs (FCM token), app activity & diagnostics
     (crash logs).
   - Data encrypted in transit ✅
   - Users can request deletion ✅ (via profile → delete account; backend
     endpoint must exist).
3. **Content rating questionnaire** — food delivery is E for Everyone
   (no UGC, no gambling, no alcohol promotion by default).
4. **Target SDK 35** (already set).
5. **Screenshots**: phone (16:9) 1080×1920; 7-inch tablet 1200×1920.
6. **Feature graphic**: 1024×500 PNG.
7. **App icon (adaptive)**: 512×512 with safe zone (already in
   `mipmap-xxxhdpi`).
8. **12 closed-tester opt-ins** are required for production rollout (14-day
   testing period for new personal accounts).

### Common rejection reasons we've pre-empted

| Rejection cause | Our mitigation |
|---|---|
| Background location permission without foreground-service disclosure | Customer app requests `ACCESS_FINE_LOCATION` only; no `ACCESS_BACKGROUND_LOCATION` in manifest. |
| Cleartext traffic allowed | `android:usesCleartextTraffic="false"`; debug variant only permits for 10.0.2.2. |
| Sensitive data in adb backup | `android:allowBackup="false"` + data-extraction-rules exclude everything. |
| SMS/Call Log permission | We do not request READ_SMS, READ_CALL_LOG, READ_CONTACTS. Twilio's connection service uses `MANAGE_OWN_CALLS` which is permitted for calling-app replacement. |
| All-files access (MANAGE_EXTERNAL_STORAGE) | Not requested. |
| Request Install Packages | Not requested. |

## Apple App Store

### Required before uploading the IPA

1. **Privacy labels** (App Store Connect):
   - Identifiers (User ID): used for app functionality
   - Location (precise): used for delivery
   - Contact Info (name, email, phone): used for account & delivery
   - Purchases: linked to account
   - Photos: optional user content
   - Diagnostics: crash/performance
   - All data linked to the user; no tracking for third-party advertising.
2. **App Privacy Details file** (`PrivacyInfo.xcprivacy`) — create in
   `ios/Runner/` with reason codes for every "required reason API"
   (UserDefaults, system boot time, file timestamps). Without this, Apple
   sends ITMS-91053 rejection starting May 2024.
3. **Purpose strings** — every `NS…UsageDescription` key in Info.plist has
   a user-facing explanation (already present).
4. **Account deletion** — App Store Guideline 5.1.1 requires the app to
   offer in-app account deletion (not just support email). Wire the
   "Delete account" button in settings to call
   `DELETE /api/auth/customers/me` and logout.
5. **Sign in with Apple** — if we offer Google/FB login we must also offer
   SiWA. Currently only phone-OTP login exists, so SiWA is **not required**.
6. **IPv6 compatibility** — all network calls use hostnames, not raw IPs.
7. **No UDID / advertising identifier** usage. If a future crash reporter
   includes the IDFA, you must honour ATT. Current build has no IDFA access.
8. **Background modes**: we declare `audio`, `voip`, `remote-notification`.
   App review inspects that VoIP pushes really go to a call screen (they
   do — Twilio Voice rings via `OreVoiceCallPage`). Do NOT add `location`
   to UIBackgroundModes for the customer app.

## Both stores — pre-submission QA

- [ ] All navigation paths work on the smallest supported phone (iPhone SE
      / 4.7" Android) and largest tablet you have.
- [ ] Payments succeed in sandbox mode.
- [ ] OTP resend works; rate limit error shows friendly message.
- [ ] Offline mode shows the banner; app does not crash.
- [ ] Permission denial flows are graceful (location, camera,
      notifications — app still works).
- [ ] RTL layouts render correctly (English-only for v1 but Directionality
      widgets are in place for future LTR/RTL).
- [ ] Privacy policy link opens from Settings → Support.
- [ ] Logout clears all local data (tokens, cached cart, address book
      local cache).
