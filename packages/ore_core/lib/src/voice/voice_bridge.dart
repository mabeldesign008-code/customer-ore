// Web keeps the hand-rolled Twilio.Device bridge; Android/iOS/macOS use the
// twilio_voice plugin; everything else degrades to the tel: fallback.
export 'voice_bridge_stub.dart'
    if (dart.library.js_interop) 'voice_bridge_web.dart'
    if (dart.library.io) 'voice_bridge_mobile.dart';
