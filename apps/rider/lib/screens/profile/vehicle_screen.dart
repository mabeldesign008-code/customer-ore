import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart';

import '../../data/auth/rider_api_client_provider.dart';
import '../../providers/rider_provider.dart';

class RiderVehicleScreen extends ConsumerStatefulWidget {
  const RiderVehicleScreen({super.key});

  @override
  ConsumerState<RiderVehicleScreen> createState() => _RiderVehicleScreenState();
}

class _RiderVehicleScreenState extends ConsumerState<RiderVehicleScreen> {
  String _vehicle = 'MOTORBIKE';
  final _plate = TextEditingController();
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _hydrate());
  }

  @override
  void dispose() {
    _plate.dispose();
    super.dispose();
  }

  Future<void> _hydrate() async {
    final existing = ref.read(riderAuthProvider).state.rider;
    if (existing != null && existing.vehicle != 'Not set') {
      _vehicle = existing.vehicle;
      _plate.text = existing.plate == 'Not set' ? '' : existing.plate;
    }
    try {
      final profile = await ref.read(riderDispatchRepositoryProvider).getProfile();
      if (!mounted) return;
      setState(() {
        _vehicle = profile.vehicle;
        _plate.text = profile.licensePlate ?? '';
        _loading = false;
      });
      ref.read(riderAuthProvider).setDispatchProfile(profile);
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    if ((_vehicle == 'MOTORBIKE' || _vehicle == 'CAR') && _plate.text.trim().isEmpty) {
      OreToast.show(context, message: 'A license plate is required for motorbike and car.', type: ToastType.error);
      return;
    }
    setState(() => _saving = true);
    try {
      final profile = await ref.read(riderDispatchRepositoryProvider).updateProfile(
            vehicle: _vehicle,
            licensePlate: _plate.text.trim().isEmpty ? null : _plate.text.trim(),
          );
      ref.read(riderAuthProvider).setDispatchProfile(profile);
      if (!mounted) return;
      OreToast.show(context, message: 'Vehicle updated.', type: ToastType.success);
      Navigator.pop(context);
    } on DioException catch (error) {
      if (!mounted) return;
      final body = error.response?.data;
      final message = body is Map && body['error'] is Map ? (body['error'] as Map)['message']?.toString() : null;
      OreToast.show(context, message: message ?? 'Unable to update vehicle.', type: ToastType.error);
    } catch (error) {
      if (!mounted) return;
      OreToast.show(context, message: error.toString(), type: ToastType.error);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Vehicle', style: AppTypography.h2())),
      body: _loading
          ? const Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'))
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text('You can switch vehicle after onboarding. Motorbike and car need a plate. You cannot change this while a task is assigned.', style: AppTypography.bodySm()),
                const SizedBox(height: 16),
                for (final option in const [
                  ('BICYCLE', 'Bicycle', LucideIcons.bike),
                  ('MOTORBIKE', 'Motorbike', LucideIcons.bike),
                  ('CAR', 'Car', LucideIcons.car),
                ])
                  RadioListTile<String>(
                    value: option.$1,
                    groupValue: _vehicle,
                    onChanged: (value) => setState(() => _vehicle = value ?? _vehicle),
                    title: Text(option.$2),
                    secondary: Icon(option.$3, color: AppColors.primary),
                  ),
                const SizedBox(height: 8),
                TextField(
                  controller: _plate,
                  textCapitalization: TextCapitalization.characters,
                  decoration: InputDecoration(
                    labelText: _vehicle == 'BICYCLE' ? 'Plate (optional)' : 'License plate',
                    hintText: 'GR-1234-26',
                  ),
                ),
                const SizedBox(height: 24),
                OreButton(
                  label: 'Save vehicle',
                  isLoading: _saving,
                  onPressed: _saving ? null : _save,
                ),
              ],
            ),
    );
  }
}
