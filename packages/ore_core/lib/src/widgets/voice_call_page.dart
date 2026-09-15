import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../network/api_client.dart';
import '../network/comms_client.dart';
import '../network/comms_models.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../voice/voice_bridge.dart';

/// In-app (Twilio VoIP) call page for order parties and Ore Support.
///
/// VoIP-first with an honest regular-network fallback (owner decision: no
/// masking — the stored number is used for the handoff):
/// * pre-call connectivity gate — no internet means we never ring Twilio;
/// * connect failure — offer the stored number immediately;
/// * mid-call degradation (SDK quality warnings / ICE reconnecting) — banner
///   with one-tap "switch to a regular call" (`tel:` — the OS forbids silent
///   dialing, so the user always confirms in the dialer).
/// Every handoff is reported to `POST /comms/calls/:callId/events` because
/// Twilio never sees the PSTN leg.
class OreVoiceCallPage extends StatefulWidget {
  const OreVoiceCallPage({
    super.key,
    required this.client,
    required this.orderId,
    required this.target,
    required this.peerLabel,
    this.fallbackTel,
    this.topic,
  });

  final OreApiClient client;

  /// Empty for support calls.
  final String orderId;
  final OreVoiceTarget target;
  final String peerLabel;

  /// Screen-supplied number; the backend `fallbackPhone` on the session wins.
  final String? fallbackTel;

  /// Support-call topic recorded on the CDR row.
  final String? topic;

  static Future<void> open(
    BuildContext context, {
    required OreApiClient client,
    required String orderId,
    required OreVoiceTarget target,
    required String peerLabel,
    String? fallbackTel,
  }) {
    return Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => OreVoiceCallPage(
          client: client,
          orderId: orderId,
          target: target,
          peerLabel: peerLabel,
          fallbackTel: fallbackTel,
        ),
      ),
    );
  }

  /// Support call — rings online agents, forwards to the agent mobile, then
  /// recorded voicemail.
  static Future<void> openSupport(
    BuildContext context, {
    required OreApiClient client,
    String peerLabel = 'Ore Support',
    String? topic,
  }) {
    return Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => OreVoiceCallPage(
          client: client,
          orderId: '',
          target: OreVoiceTarget.support,
          peerLabel: peerLabel,
          topic: topic,
        ),
      ),
    );
  }

  @override
  State<OreVoiceCallPage> createState() => _OreVoiceCallPageState();
}

class _OreVoiceCallPageState extends State<OreVoiceCallPage> {
  final _bridge = OreVoiceBridge();
  final _reported = <OreCallEventKind>{};

  OreVoiceSession? _session;
  String _status = 'Starting call…';
  bool _inCall = false;
  bool _busy = true;
  bool _degraded = false;
  bool _muted = false;
  bool _speaker = false;
  bool _failed = false;
  bool _noInternet = false;

  bool get _isSupport => widget.target == OreVoiceTarget.support;

  /// Backend number wins; screens may pass one they already display.
  String? get _fallbackNumber {
    final fromSession = _session?.normalizedFallbackPhone;
    if (fromSession != null) return fromSession;
    final fromWidget = widget.fallbackTel?.trim() ?? '';
    return fromWidget.isEmpty ? null : fromWidget;
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => unawaited(_start()));
  }

  @override
  void dispose() {
    unawaited(_bridge.dispose());
    super.dispose();
  }

  Future<void> _start() async {
    final comms = OreCommsClient(widget.client);

    // Pre-call gate: without internet, ringing Twilio just burns a CDR row
    // and 30 seconds of the user's patience.
    if (!await _hasInternet()) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _noInternet = true;
        _status = 'No internet connection — use a regular call instead.';
      });
      return;
    }

    try {
      final session = _isSupport
          ? await comms.startSupportCall(topic: widget.topic)
          : await comms.startCall(orderId: widget.orderId, target: widget.target);
      if (!mounted) return;
      _session = session;

      if (session.provider == OreVoiceProvider.log) {
        // Voice provider not configured: the regular line IS the product path.
        _report(OreCallEventKind.fallbackOffered, 'provider=log');
        await _fallbackDial(report: true);
        if (mounted) Navigator.of(context).maybePop();
        return;
      }
      if (!session.isTwilio || session.toIdentity == null || session.token == null) {
        setState(() {
          _busy = false;
          _status = 'In-app calling is not configured.';
        });
        return;
      }
      if (!_bridge.isSupported) {
        setState(() {
          _busy = false;
          _status = 'In-app calling is not available on this device. Use a regular call below.';
        });
        return;
      }
      await _bridge.connect(
        token: session.token!,
        fromIdentity: session.identity ?? '',
        toIdentity: session.toIdentity!,
        orderId: widget.orderId,
        target: widget.target.name,
        callId: session.callId,
        peerLabel: widget.peerLabel,
        onStatus: _onStatus,
        onQuality: _onQuality,
      );
    } catch (error) {
      if (!mounted) return;
      _report(OreCallEventKind.voipFailed, error.toString());
      setState(() {
        _busy = false;
        _failed = true;
        _status = OreCommsClient.describeError(error);
      });
    }
  }

  Future<bool> _hasInternet() async {
    try {
      final results = await Connectivity().checkConnectivity();
      return results.any(
        (r) => r == ConnectivityResult.wifi || r == ConnectivityResult.mobile || r == ConnectivityResult.ethernet,
      );
    } catch (_) {
      // The plugin can fail on exotic platforms; let the call attempt decide.
      return true;
    }
  }

  void _onStatus(String status) {
    if (!mounted) return;
    switch (status) {
      case 'connecting':
        setState(() {
          _busy = true;
          _status = 'Connecting…';
        });
      case 'ringing':
        setState(() {
          _busy = true;
          _status = _isSupport ? 'Ringing Ore Support…' : 'Ringing…';
        });
      case 'in-call':
        setState(() {
          _busy = false;
          _inCall = true;
          _failed = false;
          _status = 'Connected';
        });
      case 'ended':
        Navigator.of(context).maybePop();
      case 'failed':
        _report(OreCallEventKind.voipFailed, 'sdk-status-failed');
        setState(() {
          _busy = false;
          _failed = true;
          _status = 'The call did not connect.';
        });
      default:
        setState(() {
          _busy = false;
          _status = 'In-app calling is not available on this device.';
        });
    }
  }

  void _onQuality(bool degraded) {
    if (!mounted) return;
    setState(() => _degraded = degraded);
    if (degraded) {
      _report(OreCallEventKind.qualityPoor);
      if (_fallbackNumber != null) _report(OreCallEventKind.fallbackOffered, 'quality');
    } else {
      _report(OreCallEventKind.qualityRecovered);
    }
  }

  void _report(OreCallEventKind kind, [String? detail]) {
    final callId = _session?.callId;
    if (callId == null) return;
    if (!_reported.add(kind)) return;
    unawaited(OreCommsClient(widget.client).reportCallEvent(callId, kind, detail: detail));
  }

  /// One-tap handoff to the native dialer. Hangs the VoIP leg up first so the
  /// user is not paying for two calls.
  Future<void> _switchToRegularCall() async {
    _report(OreCallEventKind.fallbackStarted);
    await _bridge.hangUp();
    await _fallbackDial(report: false);
    if (mounted) Navigator.of(context).maybePop();
  }

  Future<void> _fallbackDial({required bool report}) async {
    final phone = _fallbackNumber;
    if (phone == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              _isSupport
                  ? 'No support line is provisioned yet — message Ore Support instead.'
                  : 'In-app calling is unavailable and no phone number is on this order.',
            ),
          ),
        );
      }
      return;
    }
    if (report) _report(OreCallEventKind.fallbackStarted);
    final uri = Uri(scheme: 'tel', path: phone);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open the phone dialer.')),
      );
    }
  }

  Future<void> _hangUp() async {
    await _bridge.hangUp();
    if (mounted) Navigator.of(context).maybePop();
  }

  Future<void> _toggleMute() async {
    final next = !_muted;
    await _bridge.setMuted(next);
    if (mounted) setState(() => _muted = next);
  }

  Future<void> _toggleSpeaker() async {
    final next = !_speaker;
    await _bridge.setSpeaker(next);
    if (mounted) setState(() => _speaker = next);
  }

  @override
  Widget build(BuildContext context) {
    final fallback = _fallbackNumber;
    final showFallbackButton = fallback != null && !_inCall && (!_busy || _failed || _noInternet);
    return Scaffold(
      backgroundColor: AppColors.primaryDark,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.white,
        title: Text(_isSupport ? 'Ore Support call' : 'Ore call', style: AppTypography.h3(Colors.white)),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            children: [
              const Spacer(),
              CircleAvatar(
                radius: 42,
                backgroundColor: Colors.white24,
                child: Icon(
                  _isSupport ? Icons.support_agent : Icons.phone_in_talk,
                  color: Colors.white,
                  size: 36,
                ),
              ),
              const SizedBox(height: 20),
              Text(widget.peerLabel, style: AppTypography.h2(Colors.white), textAlign: TextAlign.center),
              const SizedBox(height: 8),
              Text(_status, style: AppTypography.body(Colors.white70), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              if (_degraded && _inCall)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.amber.withOpacity(0.16), borderRadius: BorderRadius.circular(12)),
                  child: Column(children: [
                    Text('Connection is weak', style: AppTypography.body(Colors.amber.shade100)),
                    if (fallback != null) ...[
                      const SizedBox(height: 8),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          style: FilledButton.styleFrom(backgroundColor: Colors.amber.shade700, foregroundColor: Colors.white),
                          onPressed: () => unawaited(_switchToRegularCall()),
                          icon: const Icon(Icons.phone_forwarded),
                          label: const Text('Switch to regular call'),
                        ),
                      ),
                    ],
                  ]),
                ),
              const Spacer(),
              if (_busy) const CircularProgressIndicator(color: Colors.white),
              if (_inCall)
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  _circleAction(
                    icon: _muted ? Icons.mic_off : Icons.mic,
                    label: _muted ? 'Unmute' : 'Mute',
                    active: _muted,
                    onTap: () => unawaited(_toggleMute()),
                  ),
                  const SizedBox(width: 28),
                  _circleAction(
                    icon: _speaker ? Icons.volume_up : Icons.volume_down,
                    label: 'Speaker',
                    active: _speaker,
                    onTap: () => unawaited(_toggleSpeaker()),
                  ),
                ]),
              const SizedBox(height: 24),
              if (showFallbackButton)
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: AppColors.primaryDark,
                      minimumSize: const Size.fromHeight(54),
                    ),
                    onPressed: () => unawaited(_switchToRegularCall()),
                    icon: const Icon(Icons.phone),
                    label: Text(_noInternet || _failed ? 'Call $fallback instead' : 'Use regular call'),
                  ),
                ),
              if (showFallbackButton) const SizedBox(height: 12),
              if (_inCall || !_busy)
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    style: FilledButton.styleFrom(backgroundColor: AppColors.danger, foregroundColor: Colors.white, minimumSize: const Size.fromHeight(54)),
                    onPressed: () => unawaited(_hangUp()),
                    icon: const Icon(Icons.call_end),
                    label: Text(_inCall ? 'End call' : 'Close'),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _circleAction({required IconData icon, required String label, required bool active, required VoidCallback onTap}) {
    return Column(children: [
      IconButton.filled(
        style: IconButton.styleFrom(
          backgroundColor: active ? Colors.white : Colors.white24,
          foregroundColor: active ? AppColors.primaryDark : Colors.white,
          minimumSize: const Size(64, 64),
        ),
        onPressed: onTap,
        icon: Icon(icon, size: 28),
      ),
      const SizedBox(height: 6),
      Text(label, style: AppTypography.caption(Colors.white70)),
    ]);
  }
}
