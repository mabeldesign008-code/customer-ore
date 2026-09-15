import 'dart:convert';
import 'dart:ui' as ui;

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart';

import '../../core/router/app_router.dart';
import '../../data/auth/rider_api_client_provider.dart';
import '../../providers/rider_provider.dart';

class RiderDeliveryProofScreen extends ConsumerStatefulWidget {
  final String orderId;
  const RiderDeliveryProofScreen({super.key, required this.orderId});

  @override
  ConsumerState<RiderDeliveryProofScreen> createState() => _RiderDeliveryProofScreenState();
}

class _RiderDeliveryProofScreenState extends ConsumerState<RiderDeliveryProofScreen> {
  final _otp = TextEditingController();
  final _padKey = GlobalKey<_SignaturePadState>();
  bool _submitted = false;
  bool _submitting = false;
  XFile? _proofPhoto;
  double? _confirmedPayout;

  Future<void> _takeProofPhoto() async {
    try {
      final photo = await ImagePicker().pickImage(
        source: ImageSource.camera,
        imageQuality: 82,
        maxWidth: 1600,
      );
      if (!mounted || photo == null) return;
      setState(() => _proofPhoto = photo);
      OreToast.show(
        context,
        message: 'Delivery proof photo captured',
        type: ToastType.success,
      );
    } catch (_) {
      if (!mounted) return;
      OreToast.show(
        context,
        message: 'Unable to capture delivery proof photo.',
        type: ToastType.error,
      );
    }
  }

  Future<void> _submit() async {
    final otp = _otp.text.trim();
    if (!RegExp(r'^\d{4}$').hasMatch(otp)) {
      OreToast.show(
        context,
        message: 'Enter the customer 4-digit OTP',
        type: ToastType.error,
      );
      return;
    }
    final trip = ref.read(tripsProvider).currentTrip;
    final leaveAtDoor = trip?.id == widget.orderId && trip!.leaveAtDoor;
    final signatureRequired = trip?.id == widget.orderId && (trip!.signatureRequired || trip.leaveAtDoor);
    if (leaveAtDoor && _proofPhoto == null) {
      OreToast.show(context, message: 'Take a doorstep photo for leave-at-door.', type: ToastType.error);
      return;
    }
    if (signatureRequired && !(_padKey.currentState?.hasInk ?? false)) {
      OreToast.show(context, message: 'Capture the customer signature first.', type: ToastType.error);
      return;
    }

    setState(() => _submitting = true);
    try {
      final position = await _determinePosition();
      final orderRepository = ref.read(riderOrderRepositoryProvider);
      final signature = await _padKey.currentState?.toPngBase64();
      if (signatureRequired && (signature == null || signature.isEmpty)) {
        throw StateError('Signature could not be encoded');
      }
      if (signature != null && signature.isNotEmpty) {
        await orderRepository.uploadDeliverySignature(
          orderId: widget.orderId,
          signatureBase64: signature,
        );
      }
      if (_proofPhoto != null) {
        await orderRepository.uploadDeliveryProof(
          orderId: widget.orderId,
          photo: _proofPhoto!,
        );
      }
      await orderRepository.confirmDeliveryOtp(
            orderId: widget.orderId,
            otp: otp,
            riderLat: position.latitude,
            riderLng: position.longitude,
          );
      if (!mounted) return;
      final trips = ref.read(tripsProvider);
      final active = trips.currentTrip;
      final payout = active != null && active.id == widget.orderId ? active.payout : null;
      trips.completeCurrent(widget.orderId);
      await trips.restoreActiveTask();
      if (ref.read(onlineProvider).isOnline) {
        try {
          await ref.read(riderLocationProvider).startIdleTracking();
        } catch (_) {
          // The order is already completed; the next home refresh can retry idle GPS.
        }
      }
      setState(() {
        _submitting = false;
        _submitted = true;
        _confirmedPayout = payout;
      });
      Haptics.success();
    } on DioException catch (error) {
      if (!mounted) return;
      final body = error.response?.data;
      final message = body is Map && body['error'] is Map
          ? (body['error'] as Map)['message']?.toString()
          : null;
      setState(() => _submitting = false);
      OreToast.show(
        context,
        message: message ?? 'Unable to confirm delivery. Please try again.',
        type: ToastType.error,
      );
    } catch (error) {
      if (!mounted) return;
      setState(() => _submitting = false);
      OreToast.show(
        context,
        message: error.toString(),
        type: ToastType.error,
      );
    }
  }

  Future<Position> _determinePosition() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw StateError('Location services are disabled');
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw StateError('Location permission is required for delivery confirmation');
    }
    return Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );
  }

  @override
  void dispose() {
    _otp.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_submitted) {
      return _SuccessView(
        payout: _confirmedPayout,
        onDone: () {
          Haptics.success();
          context.go(RiderRoutes.home);
        },
      );
    }

    final trip = ref.watch(tripsProvider).currentTrip;
    final leaveAtDoor = trip?.id == widget.orderId && trip!.leaveAtDoor;
    final signatureRequired = trip?.id == widget.orderId && (trip!.signatureRequired || trip.leaveAtDoor);

    return Scaffold(
      appBar: AppBar(title: Text('Proof of delivery', style: AppTypography.h3())),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [AppColors.success, Color(0xFF22C55E)]),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Icon(LucideIcons.packageCheck, color: Colors.white, size: 40),
              const SizedBox(height: 12),
              Text('Order ${widget.orderId}', style: AppTypography.bodySm(Colors.white70)),
              Text('Delivery complete!', style: AppTypography.h2(Colors.white)),
              const SizedBox(height: 4),
              Text(
                leaveAtDoor
                    ? 'Leave-at-door: OTP, photo and signature are required'
                    : signatureRequired
                        ? 'Confirm with customer OTP and a signature'
                        : 'Confirm with customer OTP; photo is optional',
                style: AppTypography.body(Colors.white70),
              ),
            ]),
          ).animate().fadeIn().scale(),
          if (leaveAtDoor || (trip?.dropNote?.isNotEmpty ?? false)) ...[
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.info.withOpacity(0.1), borderRadius: BorderRadius.circular(14)),
              child: Text(
                [
                  if (leaveAtDoor) 'Leave at door',
                  if (trip?.dropNote?.isNotEmpty == true) trip!.dropNote!,
                ].join(' · '),
                style: AppTypography.body().copyWith(fontWeight: FontWeight.w700),
              ),
            ),
          ],
          const SizedBox(height: 24),
          Text('Customer OTP', style: AppTypography.h3()),
          const SizedBox(height: 6),
          Text('Ask the customer for the 4-digit code shown in their app.', style: AppTypography.body()),
          const SizedBox(height: 12),
          TextField(
            controller: _otp,
            keyboardType: TextInputType.number,
            maxLength: 4,
            textAlign: TextAlign.center,
            style: AppTypography.h1().copyWith(fontSize: 28, letterSpacing: 8, fontWeight: FontWeight.w800),
            decoration: InputDecoration(
              counterText: '',
              filled: true,
              fillColor: AppColors.surface,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
          const SizedBox(height: 20),
          GestureDetector(
            onTap: _takeProofPhoto,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.primary.withOpacity(0.2)),
              ),
              child: Row(children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                child: const Icon(LucideIcons.camera, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(
                  _proofPhoto == null
                      ? (leaveAtDoor ? 'Take required proof photo' : 'Take proof photo')
                      : 'Proof photo ready',
                  style: AppTypography.body().copyWith(fontWeight: FontWeight.w700),
                ),
                Text('Capture parcel at doorstep', style: AppTypography.caption()),
              ])),
                const Icon(
                  LucideIcons.chevronRight,
                  color: AppColors.textMuted,
                ),
              ]),
            ),
          ),
          const SizedBox(height: 20),
          Text(signatureRequired ? 'Customer signature' : 'Customer signature (optional)', style: AppTypography.h3()),
          const SizedBox(height: 8),
          _SignaturePad(key: _padKey),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: () => _padKey.currentState?.clear(),
              child: const Text('Clear signature'),
            ),
          ),
          const SizedBox(height: 16),
          OreButton(
            label: 'Submit & collect',
            icon: LucideIcons.check,
            isLoading: _submitting,
            onPressed: _submitting ? null : () { _submit(); },
          ),
        ]),
      ),
    );
  }
}

class _SignaturePad extends StatefulWidget {
  const _SignaturePad({super.key});

  @override
  State<_SignaturePad> createState() => _SignaturePadState();
}

class _SignaturePadState extends State<_SignaturePad> {
  final List<Offset?> _points = <Offset?>[];
  Size _size = const Size(400, 180);

  bool get hasInk => _points.any((point) => point != null);

  void clear() => setState(_points.clear);

  Future<String?> toPngBase64() async {
    if (!hasInk) return null;
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    final size = _size.width == 0 ? const Size(400, 180) : _size;
    canvas.drawRect(Offset.zero & size, Paint()..color = Colors.white);
    final paint = Paint()
      ..color = Colors.black
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;
    Path? path;
    for (final point in _points) {
      if (point == null) {
        if (path != null) canvas.drawPath(path, paint);
        path = null;
      } else if (path == null) {
        path = Path()..moveTo(point.dx, point.dy);
      } else {
        path.lineTo(point.dx, point.dy);
      }
    }
    if (path != null) canvas.drawPath(path, paint);
    final image = await recorder.endRecording().toImage(size.width.round().clamp(1, 2000), size.height.round().clamp(1, 2000));
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    if (bytes == null) return null;
    return base64Encode(bytes.buffer.asUint8List());
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        _size = Size(constraints.maxWidth, 180);
        return GestureDetector(
          onPanStart: (details) => setState(() => _points.add(details.localPosition)),
          onPanUpdate: (details) => setState(() => _points.add(details.localPosition)),
          onPanEnd: (_) => setState(() => _points.add(null)),
          child: CustomPaint(
            painter: _SignaturePainter(_points),
            child: Container(
              height: 180,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _SignaturePainter extends CustomPainter {
  _SignaturePainter(this.points);

  final List<Offset?> points;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;
    Path? path;
    for (final point in points) {
      if (point == null) {
        if (path != null) canvas.drawPath(path, paint);
        path = null;
      } else if (path == null) {
        path = Path()..moveTo(point.dx, point.dy);
      } else {
        path.lineTo(point.dx, point.dy);
      }
    }
    if (path != null) canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _SignaturePainter oldDelegate) => true;
}

class _SuccessView extends StatelessWidget {
  final VoidCallback onDone;
  final double? payout;
  const _SuccessView({required this.onDone, this.payout});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            const Spacer(),
            Stack(alignment: Alignment.center, children: [
              Container(width: 160, height: 160, decoration: BoxDecoration(color: AppColors.success.withOpacity(0.1), shape: BoxShape.circle)),
              Container(width: 110, height: 110, decoration: const BoxDecoration(color: AppColors.success, shape: BoxShape.circle), child: const Icon(LucideIcons.check, color: Colors.white, size: 58)),
            ]).animate().scale(duration: Motion.medium, curve: Motion.spring),
            const SizedBox(height: 30),
            Text('Delivery confirmed!', style: AppTypography.h1()).animate().fadeIn(duration: Motion.medium).slideY(begin: 0.3),
            const SizedBox(height: 8),
            Text('Great job. Earnings added to your wallet.', style: AppTypography.body(), textAlign: TextAlign.center).animate().fadeIn(delay: 200.ms),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 12)]),
              child: Row(children: [
                const Icon(LucideIcons.banknote, color: AppColors.success, size: 30),
                const SizedBox(width: 14),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Trip payout', style: AppTypography.caption()),
                  Text(
                    payout == null ? 'Added to wallet' : Formatters.money(payout!),
                    style: AppTypography.h1(AppColors.success),
                  ),
                ])),
                const Icon(LucideIcons.plus, color: AppColors.success),
              ]),
            ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.2),
            const Spacer(),
            OreButton(label: 'Back to home', icon: LucideIcons.home, onPressed: onDone),
          ]),
        ),
      ),
    );
  }
}
