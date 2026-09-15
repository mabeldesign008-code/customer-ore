import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/app_colors.dart';
import '../../data/catalog/vendor_catalog_repository.dart';
import '../../providers/vendor_data_provider.dart';

class VendorLocationsStaffRouteScreen extends ConsumerWidget {
  const VendorLocationsStaffRouteScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snapshot = ref.watch(vendorSnapshotProvider);
    return snapshot.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'))),
      error: (_, __) => const Scaffold(body: Center(child: Text('Vendor profile unavailable'))),
      data: (value) => VendorLocationsStaffScreen(vendorId: value.vendor.id),
    );
  }
}

class VendorLocationsStaffScreen extends ConsumerStatefulWidget {
  const VendorLocationsStaffScreen({super.key, required this.vendorId});
  final String vendorId;

  @override
  ConsumerState<VendorLocationsStaffScreen> createState() => _VendorLocationsStaffScreenState();
}

class _VendorLocationsStaffScreenState extends ConsumerState<VendorLocationsStaffScreen> {
  late Future<List<VendorLocationRecord>> _locations;
  late Future<List<VendorStaffRecord>> _staff;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    final repo = ref.read(vendorCatalogRepositoryProvider);
    _locations = repo.getLocations(widget.vendorId);
    _staff = repo.getStaff(widget.vendorId);
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(title: const Text('Locations & staff'), bottom: const TabBar(tabs: [Tab(text: 'Locations'), Tab(text: 'Staff')])),
        body: TabBarView(children: [_locationsView(), _staffView()]),
      ),
    );
  }

  Widget _locationsView() => FutureBuilder<List<VendorLocationRecord>>(
        future: _locations,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'));
          if (snapshot.hasError) return const Center(child: Text('Unable to load locations'));
          final rows = snapshot.data ?? const <VendorLocationRecord>[];
          return ListView(padding: const EdgeInsets.all(16), children: [
            ...rows.map((location) => ListTile(leading: const Icon(LucideIcons.mapPin, color: AppColors.primary), title: Text(location.name), subtitle: Text('${location.address} · ${location.deliveryRadiusKm.toStringAsFixed(1)} km'), trailing: Switch(value: location.accepting, onChanged: (_) async { await ref.read(vendorCatalogRepositoryProvider).deactivateLocation(widget.vendorId, location.id); if (mounted) setState(_reload); }))),
            const SizedBox(height: 12),
            ElevatedButton.icon(onPressed: _addLocation, icon: const Icon(LucideIcons.plus), label: const Text('Add location')),
          ]);
        },
      );

  Widget _staffView() => FutureBuilder<List<VendorStaffRecord>>(
        future: _staff,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'));
          if (snapshot.hasError) return const Center(child: Text('Unable to load staff'));
          final rows = snapshot.data ?? const <VendorStaffRecord>[];
          return ListView(padding: const EdgeInsets.all(16), children: [
            ...rows.map((member) => SwitchListTile(value: member.active, onChanged: (active) async { await ref.read(vendorCatalogRepositoryProvider).setStaffActive(widget.vendorId, member.id, active); if (mounted) setState(_reload); }, title: Text(member.displayName), subtitle: Text('${member.staffRole} · ${member.userId}'))),
            const SizedBox(height: 12),
            ElevatedButton.icon(onPressed: _addStaff, icon: const Icon(LucideIcons.userPlus), label: const Text('Add staff member')),
          ]);
        },
      );

  Future<void> _addLocation() async {
    final name = TextEditingController();
    final address = TextEditingController();
    final result = await showDialog<List<String>>(context: context, builder: (dialogContext) => AlertDialog(title: const Text('Add location'), content: Column(mainAxisSize: MainAxisSize.min, children: [TextField(controller: name, decoration: const InputDecoration(labelText: 'Location name')), TextField(controller: address, decoration: const InputDecoration(labelText: 'Address')), const Text('GPS coordinates must be captured from the verified workplace location in the next native location flow.')]), actions: [TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')), ElevatedButton(onPressed: () => Navigator.pop(dialogContext, [name.text.trim(), address.text.trim()]), child: const Text('Continue'))]));
    name.dispose();
    address.dispose();
    if (result == null || result.length < 2 || result[0].isEmpty || result[1].isEmpty) return;
    try {
      if (!await Geolocator.isLocationServiceEnabled()) throw StateError('Location services are disabled');
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) throw StateError('Location permission is required');
      final position = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      await ref.read(vendorCatalogRepositoryProvider).createLocation(vendorId: widget.vendorId, name: result[0], address: result[1], lat: position.latitude, lng: position.longitude);
      if (mounted) setState(_reload);
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to create location. Verified GPS is required.')));
    }
  }

  Future<void> _addStaff() async {
    final userId = TextEditingController();
    final name = TextEditingController();
    var role = 'ORDER_OPERATOR';
    final result = await showDialog<List<String>>(context: context, builder: (dialogContext) => StatefulBuilder(builder: (dialogContext, setDialogState) => AlertDialog(title: const Text('Add staff member'), content: Column(mainAxisSize: MainAxisSize.min, children: [TextField(controller: userId, decoration: const InputDecoration(labelText: 'Authenticated user ID')), TextField(controller: name, decoration: const InputDecoration(labelText: 'Display name')), DropdownButtonFormField<String>(value: role, items: const [DropdownMenuItem(value: 'MANAGER', child: Text('Manager')), DropdownMenuItem(value: 'ORDER_OPERATOR', child: Text('Order operator')), DropdownMenuItem(value: 'CATALOG_EDITOR', child: Text('Catalogue editor')), DropdownMenuItem(value: 'FINANCE_VIEWER', child: Text('Finance viewer'))], onChanged: (value) => setDialogState(() => role = value ?? role))]), actions: [TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')), ElevatedButton(onPressed: () => Navigator.pop(dialogContext, [userId.text.trim(), name.text.trim(), role]), child: const Text('Add'))])));
    userId.dispose();
    name.dispose();
    if (result == null || result.length < 3 || result[0].isEmpty || result[1].isEmpty) return;
    try {
      await ref.read(vendorCatalogRepositoryProvider).addStaff(vendorId: widget.vendorId, userId: result[0], displayName: result[1], staffRole: result[2]);
      if (mounted) setState(_reload);
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to add staff member')));
    }
  }
}
