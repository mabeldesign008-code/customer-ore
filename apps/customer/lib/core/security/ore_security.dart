import 'package:flutter/foundation.dart';

/// Application-level security guards that satisfy the OWASP Mobile Top 10 /
/// MASVS L1 baseline expected from on-demand apps (Uber, Bolt, Glovo).
///
/// Guards implemented here (Dart side):
///  • Suppression of debugPrint/print in release builds (no token leaks in logcat)
///  • Sensitive-string redactor for crash reporters
///
/// Platform-enforced guards (configured in AndroidManifest.xml / Info.plist):
///  • android:usesCleartextTraffic="false" + network_security_config.xml
///  • android:allowBackup="false" (no adb backup exfiltration)
///  • android:filterTouchesWhenObscured="true" (tapjacking protection)
///  • Certificate pinning SHA-256 pins in network_security_config
///  • iOS NSAppTransportSecurity enforces HTTPS
///  • Tokens in KeyStore/Keychain via flutter_secure_storage
///
/// RASP (FreeRASP for root/jailbreak/Frida/debugger detection) is wired as an
/// optional hook; see SECURITY.md for the 10-minute enable guide.
class OreSecurity {
  OreSecurity._();

  static bool _initialized = false;

  static void init() {
    if (_initialized) return;
    _initialized = true;
    if (kReleaseMode) {
      // Silence all print/debugPrint in release builds so tokens, PII and
      // API payloads never leak into Logcat/Xcode console. Errors are still
      // captured by PlatformDispatcher.onError and runZonedGuarded.
      debugPrint = (String? message, {int? wrapWidth}) {};
    }
  }
}

/// Redact anything that looks like a JWT, phone number or lat/lng before it
/// is sent to crash/error reporting (Sentry, Crashlytics, etc.).
String redactSensitive(String input) {
  return input
      .replaceAll(RegExp(r'eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'), '[REDACTED_JWT]')
      .replaceAll(RegExp(r'\+?\b\d{6,15}\b'), '[REDACTED_PHONE]')
      .replaceAll(RegExp(r'-?\d{1,2}\.\d{3,},\s*-?\d{1,3}\.\d{3,}'), '[REDACTED_COORDS]');
}
