import 'dart:async';

import 'package:flutter/material.dart';

import '../network/api_client.dart';
import '../network/comms_client.dart';
import '../theme/app_colors.dart';
import '../voice/voice_bridge.dart';

/// Registers this device for incoming order calls while [orderId] is on screen.
class OreVoicePresence extends StatefulWidget {
  const OreVoicePresence({
    super.key,
    required this.client,
    required this.orderId,
    required this.child,
  });

  final OreApiClient client;
  final String orderId;
  final Widget child;

  @override
  State<OreVoicePresence> createState() => _OreVoicePresenceState();
}

class _OreVoicePresenceState extends State<OreVoicePresence> {
  final _bridge = OreVoiceBridge();
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => unawaited(_register()));
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _refreshTimer = null;
    unawaited(_bridge.dispose());
    super.dispose();
  }

  Future<void> _register() async {
    if (!_bridge.isSupported) return;
    try {
      final session = await OreCommsClient(widget.client).issueVoiceToken(widget.orderId);
      if (!session.isTwilio || session.token == null) return;
      await _bridge.register(session.token!, onIncoming: _promptIncoming);
      _scheduleTokenRefresh(session.ttlSec);
    } catch (_) {
      // Stay silent; the next open retries. Do not invent a ringing UI.
    }
  }

  /// Access tokens live ~15 minutes; an order screen (rider mid-delivery, customer
  /// tracking) can stay open for an hour. Refresh at ~3/4 of the TTL so the native
  /// registration never lapses — a lapsed registration means incoming calls silently
  /// stop ringing while both parties still see "call" buttons.
  void _scheduleTokenRefresh(int? ttlSec) {
    _refreshTimer?.cancel();
    final ttl = (ttlSec == null || ttlSec < 120) ? 900 : ttlSec;
    _refreshTimer = Timer.periodic(
      Duration(seconds: ttl * 3 ~/ 4),
      (_) => unawaited(_refreshToken()),
    );
  }

  Future<void> _refreshToken() async {
    if (!mounted) return;
    try {
      final session = await OreCommsClient(widget.client).issueVoiceToken(widget.orderId);
      if (session.isTwilio && session.token != null) {
        await _bridge.refreshToken(session.token!);
      }
    } catch (_) {
      // Silent: the SDK keeps the previous token until expiry and the next tick retries.
    }
  }

  void _promptIncoming() {
    final ctx = context;
    if (!ctx.mounted) return;
    showDialog<void>(
      context: ctx,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Incoming Ore call'),
        content: const Text('A party on this order is calling.'),
        actions: [
          TextButton(
            onPressed: () {
              unawaited(_bridge.rejectIncoming());
              Navigator.pop(dialogContext);
            },
            child: const Text('Decline'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () {
              unawaited(_bridge.acceptIncoming());
              Navigator.pop(dialogContext);
            },
            child: const Text('Accept'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
