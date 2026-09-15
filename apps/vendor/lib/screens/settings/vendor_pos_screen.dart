import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../data/catalog/vendor_catalog_repository.dart';
import '../../providers/vendor_data_provider.dart';

class VendorPosRouteScreen extends ConsumerWidget {
  const VendorPosRouteScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snapshot = ref.watch(vendorSnapshotProvider);
    return snapshot.when(loading: () => const Scaffold(body: Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'))), error: (_, __) => const Scaffold(body: Center(child: Text('Vendor profile unavailable'))), data: (value) => VendorPosScreen(vendorId: value.vendor.id));
  }
}

class VendorPosScreen extends ConsumerStatefulWidget {
  const VendorPosScreen({super.key, required this.vendorId});
  final String vendorId;

  @override
  ConsumerState<VendorPosScreen> createState() => _VendorPosScreenState();
}

class _VendorPosScreenState extends ConsumerState<VendorPosScreen> {
  late Future<VendorPosConnectionRecord?> _future;

  @override
  void initState() {
    super.initState();
    _future = ref.read(vendorCatalogRepositoryProvider).getPosConnection(widget.vendorId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('POS integration')),
      body: FutureBuilder<VendorPosConnectionRecord?>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'));
          if (snapshot.hasError) return const Center(child: Text('Unable to load POS connection'));
          final connection = snapshot.data;
          return ListView(padding: const EdgeInsets.all(16), children: [
            Text('Connect a POS or inventory system through the Ore webhook bridge.', style: AppTextStyles.bodyMedium),
            const SizedBox(height: 8),
            Text('The webhook accepts inventory.updated events for this Vendor. Store the token securely; it is shown only when a connection is created.', style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
            const SizedBox(height: 20),
            if (connection == null) ElevatedButton.icon(onPressed: _connect, icon: const Icon(LucideIcons.link), label: const Text('Create POS connection')),
            if (connection != null) ...[
              ListTile(leading: const Icon(LucideIcons.plug, color: AppColors.success), title: Text(connection.provider), subtitle: Text(connection.active ? 'Connected · ${connection.webhookPath}' : 'Disconnected')), 
              const SizedBox(height: 12),
              OutlinedButton.icon(onPressed: _disconnect, icon: const Icon(LucideIcons.unlink), label: const Text('Disconnect')),
            ],
          ]);
        },
      ),
    );
  }

  Future<void> _connect() async {
    final provider = TextEditingController(text: 'GENERIC_POS');
    final storeId = TextEditingController();
    final result = await showDialog<List<String>>(context: context, builder: (dialogContext) => AlertDialog(title: const Text('Connect POS'), content: Column(mainAxisSize: MainAxisSize.min, children: [TextField(controller: provider, decoration: const InputDecoration(labelText: 'Provider name')), TextField(controller: storeId, decoration: const InputDecoration(labelText: 'External store ID (optional)'))]), actions: [TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')), ElevatedButton(onPressed: () => Navigator.pop(dialogContext, [provider.text.trim(), storeId.text.trim()]), child: const Text('Connect'))]));
    provider.dispose();
    storeId.dispose();
    if (result == null || result[0].isEmpty) return;
    try {
      final connected = await ref.read(vendorCatalogRepositoryProvider).connectPos(widget.vendorId, result[0], externalStoreId: result[1].isEmpty ? null : result[1]);
      if (!mounted) return;
      await SharePlus.instance.share(ShareParams(title: 'Ore POS webhook token', text: 'Webhook path: ${connected.$1.webhookPath}\nPOS token: ${connected.$2}\nConfigure your POS to send x-ore-pos-token with inventory.updated events.'));
      setState(() => _future = Future.value(connected.$1));
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to create POS connection')));
    }
  }

  Future<void> _disconnect() async {
    await ref.read(vendorCatalogRepositoryProvider).disconnectPos(widget.vendorId);
    if (mounted) setState(() => _future = Future.value(null));
  }
}
