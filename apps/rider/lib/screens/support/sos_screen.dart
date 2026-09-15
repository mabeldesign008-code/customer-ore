import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:share_plus/share_plus.dart';
import 'package:ore_core/ore_core.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../data/auth/rider_api_client_provider.dart';

class RiderSosScreen extends ConsumerStatefulWidget {
  const RiderSosScreen({super.key});

  @override
  ConsumerState<RiderSosScreen> createState() => _RiderSosScreenState();
}

class _RiderSosScreenState extends ConsumerState<RiderSosScreen> {
  bool _locationShared = false;
  bool _sharingLocation = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Emergency', style: AppTypography.h2())),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(color: AppColors.danger.withOpacity(0.08), borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.danger.withOpacity(0.2))),
          child: Row(children: [
            const Icon(LucideIcons.triangleAlert, color: AppColors.danger, size: 28),
            const SizedBox(width: 12),
            Expanded(child: Text('Only use this during real emergencies. Our safety team will respond immediately.', style: AppTypography.body().copyWith(fontWeight: FontWeight.w600, color: AppColors.danger))),
          ]),
        ),
        const SizedBox(height: 20),
        Center(
          child: GestureDetector(
            onTap: () => _recordAndConfirm(context, '112', 'emergency services'),
            child: Container(
              width: 200, height: 200,
              decoration: const BoxDecoration(color: AppColors.danger, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Color(0x66EF4444), blurRadius: 40)]),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                const Icon(LucideIcons.phone, color: Colors.white, size: 50),
                const SizedBox(height: 8),
                Text('SOS', style: AppTypography.h1(Colors.white).copyWith(fontSize: 36, letterSpacing: 2)),
                Text('Tap to call 112', style: AppTypography.caption(Colors.white70)),
              ]),
            ),
          ).animate(onPlay: (c) => c.repeat()).shimmer(duration: 1800.ms, color: Colors.white.withOpacity(0.3)),
        ),
        const SizedBox(height: 24),
        Text('Other emergency contacts', style: AppTypography.h3()),
        const SizedBox(height: 10),
        _contact('Ore Safety Team', '+233 302 911 911', LucideIcons.shieldCheck, AppColors.primary, context),
        _contact('Police', '191', LucideIcons.badgeAlert, AppColors.info, context),
        _contact('Ambulance', '193', LucideIcons.plus, AppColors.success, context),
        _contact('Fire service', '192', LucideIcons.flame, AppColors.warning, context),
        const SizedBox(height: 24),
        Text('Share my location', style: AppTypography.h3()),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
          child: Row(children: [
            const Icon(LucideIcons.mapPin, color: AppColors.primary),
            const SizedBox(width: 12),
            Expanded(child: Text(_locationShared ? 'Location share sheet opened' : 'Send my current location to a trusted contact', style: AppTypography.body().copyWith(fontWeight: FontWeight.w600))),
            _sharingLocation
                ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))
                : Switch(value: _locationShared, onChanged: (_) => _shareLocation()),
          ]),
        ),
      ]),
    );
  }

  Widget _contact(String name, String num, IconData i, Color c, BuildContext context) => AnimatedPress(
    onTap: () => _confirm(context, num, name),
    child: Container(margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)), child: Row(children: [
      Container(width: 42, height: 42, decoration: BoxDecoration(color: c.withOpacity(0.12), borderRadius: BorderRadius.circular(12)), child: Icon(i, color: c)),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(name, style: AppTypography.body().copyWith(fontWeight: FontWeight.w700)),
        Text(num, style: AppTypography.caption()),
      ])),
      const Icon(LucideIcons.phone, color: AppColors.textMuted),
    ])),
  );

  Future<void> _shareLocation() async {
    setState(() => _sharingLocation = true);
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        throw StateError('Location services are disabled');
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        throw StateError('Location permission is required to share your location');
      }
      final position = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      final mapsUrl = 'https://www.google.com/maps/search/?api=1&query=${position.latitude},${position.longitude}';
      await SharePlus.instance.share(
        ShareParams(
          title: 'Ore Rider emergency location',
          text: 'My current location: $mapsUrl',
        ),
      );
      if (mounted) setState(() => _locationShared = true);
    } catch (error) {
      if (!mounted) return;
      OreToast.show(context, message: error.toString(), type: ToastType.error);
    } finally {
      if (mounted) setState(() => _sharingLocation = false);
    }
  }

  void _recordAndConfirm(BuildContext context, String num, String label) {
    // Never block an emergency call on GPS permission or network latency.
    _confirm(context, num, label);
    unawaited(_recordIncident());
  }

  Future<void> _recordIncident() async {
    double? lat;
    double? lng;
    try {
      final position = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      lat = position.latitude;
      lng = position.longitude;
    } catch (_) {
      // The incident is still useful without a fresh GPS sample.
    }
    try {
      await ref.read(riderIncidentRepositoryProvider).create(type: 'EMERGENCY_SOS', lat: lat, lng: lng);
    } catch (_) {
      if (mounted) OreToast.show(context, message: 'The call is still available, but the safety record could not be saved.', type: ToastType.warning);
    }
  }

  void _confirm(BuildContext context, String num, String label) {
    showDialog(
      context: context,
      builder: (c) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Call $label?'),
        content: Text('This will dial $num.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () async {
              Navigator.pop(c);
              final uri = Uri.parse('tel:$num');
              if (await canLaunchUrl(uri)) launchUrl(uri);
            },
            child: const Text('Call now'),
          ),
        ],
      ),
    );
  }
}
