/// Platforms without a Voice runtime (Windows/Linux): every call reports
/// `unsupported` so screens can offer the regular-phone fallback instead.
class OreVoiceBridge {
  bool get isSupported => false;

  Future<void> register(String token, {void Function()? onIncoming}) async {}

  Future<void> refreshToken(String token) async {}

  Future<void> acceptIncoming() async {}

  Future<void> rejectIncoming() async {}

  /// Status values shared by all bridges: connecting | ringing | in-call |
  /// ended | failed | unsupported. `onQuality(true)` means the SDK sees the
  /// network degrading — screens offer the `tel:` handoff.
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
    onStatus('unsupported');
    throw UnsupportedError('In-app calling is not available on this platform.');
  }

  Future<void> hangUp() async {}

  Future<void> setMuted(bool muted) async {}

  Future<void> setSpeaker(bool on) async {}

  Future<void> dispose() async {}
}
