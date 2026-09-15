import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/app_colors.dart';
import '../../data/onboarding/vendor_onboarding_repository.dart';
import '../../providers/vendor_data_provider.dart';

class DocumentsManagementScreen extends ConsumerWidget {
  const DocumentsManagementScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Compliance documents')),
      body: FutureBuilder<List<VendorDocumentRecord>>(
        future: ref.read(vendorOnboardingRepositoryProvider).getDocuments(),
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'));
          if (snapshot.hasError) return const Center(child: Text('Unable to load compliance documents'));
          final documents = snapshot.data ?? const <VendorDocumentRecord>[];
          if (documents.isEmpty) return const Center(child: Text('No uploaded documents yet.'));
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: documents.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (_, index) {
              final document = documents[index];
              return ListTile(
                tileColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: const BorderSide(color: AppColors.border)),
                leading: const Icon(LucideIcons.fileCheck, color: AppColors.primary),
                title: Text(document.kind),
                subtitle: Text(document.fileName),
                trailing: IconButton(tooltip: 'Action', onPressed: () => _open(context, ref, document), icon: const Icon(LucideIcons.eye, color: AppColors.primary)),
              );
            },
          );
        },
      ),
    );
  }

  Future<void> _open(BuildContext context, WidgetRef ref, VendorDocumentRecord document) async {
    try {
      final content = await ref.read(vendorOnboardingRepositoryProvider).getDocument(document.id);
      if (!context.mounted) return;
      await showDialog<void>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: Text(document.kind),
          content: content.contentType.startsWith('image/') ? Image.memory(content.bytes, fit: BoxFit.contain) : const Text('This private document is ready to share. Inline PDF preview is not enabled.'),
          actions: [
            TextButton(onPressed: () => SharePlus.instance.share(ShareParams(files: [XFile.fromData(content.bytes, name: document.fileName, mimeType: content.contentType)])), child: const Text('Share file')),
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Close')),
          ],
        ),
      );
    } catch (_) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to open document')));
    }
  }
}
