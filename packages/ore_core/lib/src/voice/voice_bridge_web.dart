import 'dart:async';
import 'dart:js_interop';
import 'dart:js_interop_unsafe';

/// Twilio Voice JS (`Twilio.Device`) via js_interop. Official Voice SDK, not SMS.
class OreVoiceBridge {
  JSObject? _device;
  JSObject? _call;
  JSObject? _incoming;

  /// JS warning names that mean "the network is degrading" — same thresholds
  /// the mobile SDKs raise (RTT > 400ms, jitter > 30ms, loss, MOS < 3.5).
  static const Set<String> _networkWarnings = {
    'high-rtt',
    'high-jitter',
    'high-packet-loss',
    'high-packets-lost-fraction',
    'low-mos',
  };

  bool get isSupported => true;

  Future<void> register(String token, {void Function()? onIncoming}) async {
    await _ensureSdk();
    final twilio = globalContext.getProperty('Twilio'.toJS);
    if (twilio == null) return;
    final deviceCtor = (twilio as JSObject).getProperty('Device'.toJS);
    if (deviceCtor is! JSFunction) return;
    final device = _construct(deviceCtor, token.toJS);
    _device = device;
    final on = device.getProperty('on'.toJS);
    if (on is JSFunction && onIncoming != null) {
      on.callAsFunction(
        device,
        'incoming'.toJS,
        ((JSAny? call) {
          _incoming = call is JSObject ? call : null;
          onIncoming();
        }).toJS,
      );
    }
    final registerFn = device.getProperty('register'.toJS);
    if (registerFn is JSFunction) {
      await _awaitJs(registerFn.callAsFunction(device));
    }
  }

  /// Refresh the registration token in place (tokens TTL ~15 min; an order screen
  /// can stay open for an hour). `Device.updateToken` keeps the registration and
  /// any active call alive — no re-register, no dropped incoming wiring.
  Future<void> refreshToken(String token) async {
    final device = _device;
    if (device == null || token.trim().isEmpty) return;
    final update = device.getProperty('updateToken'.toJS);
    if (update is JSFunction) {
      await _awaitJs(update.callAsFunction(device, token.toJS));
    }
  }

  Future<void> acceptIncoming() async {
    final incoming = _incoming;
    if (incoming == null) return;
    final accept = incoming.getProperty('accept'.toJS);
    if (accept is JSFunction) accept.callAsFunction(incoming);
    _call = incoming;
    _incoming = null;
    _wireCallEvents(_call!, _lastStatus, _lastQuality);
  }

  Future<void> rejectIncoming() async {
    final incoming = _incoming;
    if (incoming == null) return;
    final reject = incoming.getProperty('reject'.toJS);
    if (reject is JSFunction) reject.callAsFunction(incoming);
    _incoming = null;
  }

  void Function(String status)? _lastStatus;
  void Function(bool degraded)? _lastQuality;
  bool _qualityDegraded = false;

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
    await _ensureSdk();
    final twilio = globalContext.getProperty('Twilio'.toJS);
    if (twilio == null) {
      throw StateError('Twilio Voice SDK did not load');
    }
    final deviceCtor = (twilio as JSObject).getProperty('Device'.toJS);
    if (deviceCtor == null) {
      throw StateError('Twilio.Device is not available');
    }
    _lastStatus = onStatus;
    _lastQuality = onQuality;
    _qualityDegraded = false;
    onStatus('connecting');
    final device = _construct(deviceCtor as JSFunction, token.toJS);
    _device = device;
    // Params arrive at the TwiML webhook as request params. callId lets the
    // backend attach the Twilio CallSid to the CDR row. `To` selects the flow
    // ('support' rings agents); order callees are re-resolved server-side.
    final params = JSObject()..setProperty('To'.toJS, toIdentity.toJS);
    if (target == 'support') {
      params.setProperty('support'.toJS, 'true'.toJS);
    }
    if (orderId.trim().isNotEmpty) {
      params.setProperty('orderId'.toJS, orderId.trim().toJS);
    }
    params.setProperty('target'.toJS, target.toJS);
    if (callId != null && callId.trim().isNotEmpty) {
      params.setProperty('callId'.toJS, callId.trim().toJS);
    }
    final connectOpts = JSObject()..setProperty('params'.toJS, params);
    final connect = device.getProperty('connect'.toJS);
    if (connect is! JSFunction) {
      throw StateError('Twilio.Device.connect is missing');
    }
    final result = connect.callAsFunction(device, connectOpts);
    final call = await _awaitJs(result);
    if (call is! JSObject) {
      onStatus('failed');
      throw StateError('Twilio did not return a call object');
    }
    _call = call;
    _wireCallEvents(call, onStatus, onQuality);
  }

  /// Maps Voice JS call events onto the shared status/quality vocabulary:
  /// connecting | ringing | in-call | ended | failed.
  void _wireCallEvents(
    JSObject call,
    void Function(String status)? onStatus,
    void Function(bool degraded)? onQuality,
  ) {
    final on = call.getProperty('on'.toJS);
    if (on is! JSFunction) return;
    void listen(String event, JSFunction handler) {
      on.callAsFunction(call, event.toJS, handler);
    }

    listen('ringing', (([JSAny? _]) => onStatus?.call('ringing')).toJS);
    listen('accept', (([JSAny? _]) => onStatus?.call('in-call')).toJS);
    listen('connect', (([JSAny? _]) => onStatus?.call('in-call')).toJS);
    listen('disconnect', (([JSAny? _]) {
      onStatus?.call('ended');
      _setQuality(false, onQuality);
    }).toJS);
    listen('cancel', (([JSAny? _]) => onStatus?.call('ended')).toJS);
    listen('reject', (([JSAny? _]) => onStatus?.call('ended')).toJS);
    listen('error', (([JSAny? _]) {
      onStatus?.call('failed');
      _setQuality(false, onQuality);
    }).toJS);
    listen('reconnecting', (([JSAny? _]) => _setQuality(true, onQuality)).toJS);
    listen('reconnected', (([JSAny? _]) => _setQuality(false, onQuality)).toJS);
    listen('warning', ((JSAny? name, [JSAny? _]) {
      final warning = name?.toString() ?? '';
      if (_networkWarnings.contains(warning)) _setQuality(true, onQuality);
    }).toJS);
    listen('warning-cleared', (([JSAny? _]) => _setQuality(false, onQuality)).toJS);
  }

  void _setQuality(bool degraded, void Function(bool degraded)? onQuality) {
    if (degraded == _qualityDegraded) return;
    _qualityDegraded = degraded;
    onQuality?.call(degraded);
  }

  Future<void> hangUp() async {
    final call = _call;
    if (call != null) {
      final disconnect = call.getProperty('disconnect'.toJS);
      if (disconnect is JSFunction) disconnect.callAsFunction(call);
    }
    _call = null;
  }

  Future<void> setMuted(bool muted) async {
    final call = _call;
    if (call == null) return;
    final fn = call.getProperty((muted ? 'mute' : 'unmute').toJS);
    if (fn is JSFunction) fn.callAsFunction(call);
  }

  /// Browsers pick the output device; no JS SDK speaker toggle exists.
  Future<void> setSpeaker(bool on) async {}

  Future<void> dispose() async {
    await hangUp();
    final device = _device;
    if (device != null) {
      final destroy = device.getProperty('destroy'.toJS);
      if (destroy is JSFunction) destroy.callAsFunction(device);
    }
    _device = null;
    _lastStatus = null;
    _lastQuality = null;
  }

  Future<void> _ensureSdk() async {
    if (globalContext.getProperty('Twilio'.toJS) != null) return;
    final document = globalContext.getProperty('document'.toJS);
    if (document is! JSObject) {
      throw StateError('No document — Voice JS cannot start');
    }
    final script = (document.getProperty('createElement'.toJS) as JSFunction)
        .callAsFunction(document, 'script'.toJS) as JSObject;
    script.setProperty('src'.toJS, 'https://unpkg.com/@twilio/voice-sdk@2.12.4/dist/twilio.min.js'.toJS);
    script.setProperty('async'.toJS, true.toJS);
    final ready = Completer<void>();
    script.setProperty(
      'onload'.toJS,
      (() => ready.complete()).toJS,
    );
    script.setProperty(
      'onerror'.toJS,
      (() {
        if (!ready.isCompleted) {
          ready.completeError(StateError('Twilio Voice SDK script failed to load'));
        }
      }).toJS,
    );
    final head = document.getProperty('head'.toJS) ?? document.getProperty('body'.toJS);
    if (head is! JSObject) throw StateError('Cannot inject the Voice SDK script');
    (head.getProperty('appendChild'.toJS) as JSFunction).callAsFunction(head, script);
    await ready.future.timeout(const Duration(seconds: 15));
  }

  JSObject _construct(JSFunction ctor, JSAny arg) {
    final impl = globalContext.getProperty('Reflect'.toJS);
    if (impl is JSObject) {
      final construct = impl.getProperty('construct'.toJS);
      if (construct is JSFunction) {
        final args = [arg].jsify();
        return construct.callAsFunction(impl, ctor, args) as JSObject;
      }
    }
    throw StateError('Cannot construct Twilio.Device');
  }

  Future<Object?> _awaitJs(JSAny? value) async {
    if (value == null) return null;
    if (value is JSPromise) {
      return await value.toDart;
    }
    return value;
  }
}
