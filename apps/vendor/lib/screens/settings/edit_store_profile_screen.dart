import 'package:cached_network_image/cached_network_image.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../providers/vendor_data_provider.dart';
import '../../widgets/common/primary_button.dart';

class EditStoreProfileScreen extends ConsumerStatefulWidget {
  const EditStoreProfileScreen({super.key});

  @override
  ConsumerState<EditStoreProfileScreen> createState() => _EditStoreProfileScreenState();
}

class _EditStoreProfileScreenState extends ConsumerState<EditStoreProfileScreen> {
  final _name = TextEditingController();
  bool _saving = false;
  bool _initialized = false;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _uploadMedia(String vendorId, String kind) async {
    final result = await FilePicker.platform.pickFiles(withData: true, type: FileType.image);
    final file = result?.files.single;
    if (file?.bytes == null) return;
    final lower = file!.name.toLowerCase();
    final contentType = lower.endsWith('.png') ? 'image/png' : lower.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
    try {
      await ref.read(vendorCatalogRepositoryProvider).uploadVendorMedia(vendorId: vendorId, kind: kind, bytes: file.bytes!, contentType: contentType);
      ref.invalidate(vendorSnapshotProvider);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${kind == 'logo' ? 'Logo' : 'Banner'} updated')));
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to upload store media')));
    }
  }

  Future<void> _save(String vendorId) async {
    if (_name.text.trim().length < 2) return;
    setState(() => _saving = true);
    try {
      await ref.read(vendorCatalogRepositoryProvider).updateVendor(vendorId, <String, dynamic>{'name': _name.text.trim()});
      ref.invalidate(vendorSnapshotProvider);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Store profile updated')));
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to update store profile')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final snapshot = ref.watch(vendorSnapshotProvider);
    return snapshot.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'))),
      error: (_, __) => Scaffold(appBar: AppBar(title: const Text('Store profile')), body: Center(child: PrimaryButton(label: 'Retry', onPressed: () => ref.invalidate(vendorSnapshotProvider)))),
      data: (value) {
        if (!_initialized) {
          _initialized = true;
          _name.text = value.vendor.name;
        }
        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(title: Text('Store profile', style: AppTextStyles.heading3)),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text('Store name', style: AppTextStyles.label),
              const SizedBox(height: 6),
              TextField(controller: _name, decoration: const InputDecoration(filled: true, fillColor: Colors.white, border: OutlineInputBorder())),
              const SizedBox(height: 18),
              Text('Store media', style: AppTextStyles.heading3),
              const SizedBox(height: 8),
              Row(children: [
                Expanded(child: _mediaCard(value.vendor.logoUrl, 'Logo', () => _uploadMedia(value.vendor.id, 'logo'))),
                const SizedBox(width: 10),
                Expanded(child: _mediaCard(value.vendor.bannerUrl, 'Banner', () => _uploadMedia(value.vendor.id, 'banner'))),
              ]),
              const SizedBox(height: 18),
              _readOnly('Business type', value.vendor.vendorType),
              _readOnly('Public ID', value.vendor.publicId ?? 'Pending approval'),
              _readOnly('Delivery radius', '${value.vendor.deliveryRadiusKm.toStringAsFixed(1)} km'),
              _readOnly('Plan', value.vendor.plan),
              const SizedBox(height: 24),
              PrimaryButton(label: 'Save profile', loading: _saving, onPressed: _saving ? null : () => _save(value.vendor.id), icon: const Icon(LucideIcons.check, color: Colors.white)),
            ],
          ),
        );
      },
    );
  }

  Widget _mediaCard(String? url, String label, VoidCallback onUpload) => InkWell(
        onTap: onUpload,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          height: 100,
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
          child: url == null || url.isEmpty
              ? Column(mainAxisAlignment: MainAxisAlignment.center, children: [const Icon(LucideIcons.image, color: AppColors.primary), const SizedBox(height: 4), Text('Add $label', style: AppTextStyles.caption)])
              : ClipRRect(borderRadius: BorderRadius.circular(14), child: CachedNetworkImage(imageUrl: url, fit: BoxFit.cover, width: double.infinity)),
        ),
      );

  Widget _readOnly(String label, String value) => Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
        child: Row(children: [Expanded(child: Text(label, style: AppTextStyles.bodyMedium)), Text(value, style: AppTextStyles.subtitleMedium)]),
      );
}
