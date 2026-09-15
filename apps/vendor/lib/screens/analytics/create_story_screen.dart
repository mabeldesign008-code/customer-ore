import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/app_colors.dart';
import '../../providers/vendor_data_provider.dart';

class CreateStoryScreen extends ConsumerStatefulWidget {
  const CreateStoryScreen({super.key});

  @override
  ConsumerState<CreateStoryScreen> createState() => _CreateStoryScreenState();
}

class _CreateStoryScreenState extends ConsumerState<CreateStoryScreen> {
  final _caption = TextEditingController();
  PlatformFile? _image;
  bool _saving = false;

  @override
  void dispose() {
    _caption.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final result = await FilePicker.platform.pickFiles(withData: true, type: FileType.custom, allowedExtensions: const <String>['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov', 'webm']);
    final image = result?.files.single;
    if (image?.bytes != null) setState(() => _image = image);
  }

  Future<void> _publish() async {
    final snapshot = ref.read(vendorSnapshotProvider).value;
    if (snapshot == null || _image?.bytes == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Choose an image first')));
      return;
    }
    setState(() => _saving = true);
    try {
      final lower = _image!.name.toLowerCase();
      final contentType = lower.endsWith('.png') ? 'image/png' : lower.endsWith('.webp') ? 'image/webp' : lower.endsWith('.mp4') ? 'video/mp4' : lower.endsWith('.mov') ? 'video/quicktime' : lower.endsWith('.webm') ? 'video/webm' : 'image/jpeg';
      final kind = contentType.startsWith('video/') ? 'VIDEO' : 'IMAGE';
      final repo = ref.read(vendorCatalogRepositoryProvider);
      final key = await repo.uploadStoryMedia(vendorId: snapshot.vendor.id, bytes: _image!.bytes!, contentType: contentType);
      await repo.createStory(vendorId: snapshot.vendor.id, kind: kind, mediaKey: key, caption: _caption.text);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Story published for 24 hours')));
      Navigator.of(context).pop();
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to publish story. Premium plan and image upload are required.')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create story')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Share an image with customers. Image stories expire automatically after the configured TTL.', style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 16),
          InkWell(
            onTap: _saving ? null : _pickImage,
            borderRadius: BorderRadius.circular(18),
            child: Container(
              height: 260,
              decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.06), borderRadius: BorderRadius.circular(18), border: Border.all(color: AppColors.border)),
              child: _image?.bytes == null
                  ? const Column(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(LucideIcons.image, size: 40, color: AppColors.primary), SizedBox(height: 8), Text('Choose story image')])
                  : ClipRRect(borderRadius: BorderRadius.circular(18), child: _image!.name.toLowerCase().endsWith('.mp4') || _image!.name.toLowerCase().endsWith('.mov') || _image!.name.toLowerCase().endsWith('.webm') ? const Column(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(LucideIcons.video, size: 40, color: AppColors.primary), SizedBox(height: 8), Text('Video selected')]) : Image.memory(_image!.bytes!, fit: BoxFit.cover)),
            ),
          ),
          const SizedBox(height: 16),
          TextField(controller: _caption, maxLength: 200, maxLines: 3, decoration: const InputDecoration(labelText: 'Caption (optional)', border: OutlineInputBorder())),
          const SizedBox(height: 18),
          SizedBox(height: 50, child: ElevatedButton.icon(onPressed: _saving ? null : _publish, icon: const Icon(LucideIcons.send), label: Text(_saving ? 'Publishing…' : 'Publish story'))),
        ],
      ),
    );
  }
}
