import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:twilio_voice/twilio_voice.dart';

/// Android / iOS / macOS via the `twilio_voice` plugin (native Twilio Voice
/// SDKs; Android ConnectionService + iOS CallKit render the incoming-call UI,
/// so the in-app accept/reject dialog is a web-only concern).
///
/// Incoming push (FCM/APNs) needs a provisioned push credential + Firebase
/// config; without them the SDK still registers and handles calls while the
/// app is running, which is the documented v1 scope.
class OreVoiceBridge {
  StreamSubscription<CallEvent>? _events;
  StreamSubscription<CallQualityEvent>? _quality;
  bool _qualityDegraded = false;
  void Function(String status)? _status;
  void Function(bool degraded)? _qualitySink;

  static const Set<CallQualityWarning> _networkWarnings = {
    CallQualityWarning.highRtt,
    CallQualityWarning.highJitter,
    CallQualityWarning.highPacketLoss,
    CallQualityWarning.lowMos,
  };

  bool get isSupported {
    if (kIsWeb) return false;
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
      case TargetPlatform.iOS:
      case TargetPlatform.macOS:
        return true;
      default:
        return false;
    }
  }

  TwilioVoicePlatform get _tv => TwilioVoicePlatform.instance;

  /// Registers the device with an access token from `/comms/voice/token`.
  /// [onIncoming] is intentionally unused on mobile: the native call UI
  /// (ConnectionService / CallKit) answers and declines for us.
  Future<void> register(String token, {void Function()? onIncoming}) async {
    if (token.trim().isEmpty) return;
    await _preparePlatform();
    await _tv.setTokens(accessToken: token);
    await _tv.setDefaultCallerName('Ore call');
  }

  /// Refresh the access token in place (tokens TTL ~15 min; a rider can sit on an
  /// active-order screen for an hour — without this the native registration lapses
  /// and incoming calls silently stop ringing). twilio_voice re-applies the token
  /// to the registered client; a failure just waits for the next presence tick.
  Future<void> refreshToken(String token) async {
    if (token.trim().isEmpty) return;
    try {
      await _tv.setTokens(accessToken: token);
    } catch (_) {
      // Not registered (yet) or SDK rejected the update — retried on the next tick.
    }
  }

  /// Best-effort Android plumbing for the native ConnectionService UI:
  /// permissions + phone-account registration. iOS/macOS ignore these.
  Future<void> _preparePlatform() async {
    if (defaultTargetPlatform != TargetPlatform.android) return;
    Future<void> guard(Future<void> Function() run) async {
      try {
        await run();
      } catch (_) {
        // Missing a permission degrades the native UI, not the VoIP audio.
      }
    }

    await guard(() async {
      if (!await _tv.hasMicAccess()) await _tv.requestMicAccess();
    });
    await guard(() async {
      await _tv.requestCallPhonePermission();
    });
    await guard(() async {
      await _tv.requestReadPhoneStatePermission();
    });
    await guard(() async {
      await _tv.requestReadPhoneNumbersPermission();
    });
    await guard(() async {
      await _tv.requestManageOwnCallsPermission();
    });
    await guard(() async {
      if (!await _tv.hasRegisteredPhoneAccount()) await _tv.registerPhoneAccount();
    });
  }

  Future<void> acceptIncoming() async {
    try {
      await _tv.call.answer();
    } catch (_) {}
  }

  /// The native UI owns decline on mobile; hang up any leg we do hold.
  Future<void> rejectIncoming() async {
    try {
      if (await _tv.call.isOnCall()) await _tv.call.hangUp();
    } catch (_) {}
  }

  Future<void> connect({
    required String token,
    required String fromIdentity,
    required String toIdentity,
    required String orderId,
    required String target,
    String? callId,
    String? peerLabel,
    required void Function(String status) onStatus,
    void Function(bool degraded)? onQuality,
  }) async {
    _status = onStatus;
    _qualitySink = onQuality;
    _qualityDegraded = false;
    await _preparePlatform();
    await _tv.setTokens(accessToken: token);
    final label = peerLabel?.trim() ?? '';
    if (label.isNotEmpty) {
      try {
        await _tv.registerClient(toIdentity, label);
      } catch (_) {}
    }
    _subscribe();
    onStatus('connecting');

    // extraOptions ride along to the TwiML webhook as request params; callId
    // lets the backend attach the Twilio CallSid to the CDR row. `To` decides
    // the flow: 'support' rings agents, otherwise the webhook re-resolves the
    // real callee from the order — never from client-supplied params.
    final extraOptions = <String, dynamic>{
      'target': target,
      if (orderId.trim().isNotEmpty) 'orderId': orderId.trim(),
      if (callId != null && callId.trim().isNotEmpty) 'callId': callId.trim(),
      if (label.isNotEmpty) '__TWI_RECIPIENT_NAME': label,
    };
    final ok = await _tv.call.place(
      from: fromIdentity,
      to: toIdentity,
      extraOptions: extraOptions,
    );
    if (ok != true) {
      onStatus('failed');
      throw StateError('Twilio could not place the call');
    }
  }

  void _subscribe() {
    _events?.cancel();
    _quality?.cancel();
    _events = _tv.callEventsListener.listen(_onCallEvent, onError: (_) {});
    _quality = _tv.call.qualityWarnings.listen(_onQualityEvent, onError: (_) {});
  }

  void _onCallEvent(CallEvent event) {
    switch (event) {
      case CallEvent.ringing:
        _status?.call('ringing');
      case CallEvent.connected:
      case CallEvent.answer:
        _status?.call('in-call');
      case CallEvent.reconnecting:
        _setQuality(true);
      case CallEvent.reconnected:
        _setQuality(false);
      case CallEvent.callEnded:
      case CallEvent.missedCall:
        _status?.call('ended');
        _setQuality(false);
      case CallEvent.declined:
        _status?.call('failed');
        _setQuality(false);
      default:
        break;
    }
  }

  void _onQualityEvent(CallQualityEvent event) {
    final degraded = event.current.intersection(_networkWarnings).isNotEmpty;
    _setQuality(degraded);
  }

  void _setQuality(bool degraded) {
    if (degraded == _qualityDegraded) return;
    _qualityDegraded = degraded;
    _qualitySink?.call(degraded);
  }

  Future<void> hangUp() async {
    try {
      await _tv.call.hangUp();
    } catch (_) {}
  }

  Future<void> setMuted(bool muted) async {
    try {
      await _tv.call.toggleMute(muted);
    } catch (_) {}
  }

  Future<void> setSpeaker(bool on) async {
    try {
      await _tv.call.toggleSpeaker(on);
    } catch (_) {}
  }

  Future<void> dispose() async {
    await _events?.cancel();
    await _quality?.cancel();
    _events = null;
    _quality = null;
    _status = null;
    _qualitySink = null;
    // Registration survives dispose: incoming calls must still ring natively
    // after the caller closes the in-call page.
  }
}
