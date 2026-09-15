import 'package:cross_file/cross_file.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:share_plus/share_plus.dart';
import 'package:ore_core/ore_core.dart';

import '../../data/auth/rider_api_client_provider.dart';
import '../../data/onboarding/rider_documents_repository.dart';

class RiderDocumentsScreen extends ConsumerWidget {
  const RiderDocumentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final documents = ref.watch(riderDocumentsProvider);
    return Scaffold(
      appBar: AppBar(title: Text('Documents', style: AppTypography.h2())),
      body: documents.when(
        loading: () => const Center(child: CircularProgressIndicator(semanticsLabel: 'Loading')),
        error: (_, __) => Center(
          child: OreButton(
            label: 'Retry',
            onPressed: () => ref.invalidate(riderDocumentsProvider),
          ),
        ),
        data: (rows) => _buildContent(context, ref, rows),
      ),
    );
  }

  Widget _buildContent(
    BuildContext context,
    WidgetRef ref,
    List<RiderDocumentRecord> documents,
  ) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.primary.withOpacity(0.08),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              const Icon(LucideIcons.fileCheck, color: AppColors.primary),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  documents.isEmpty
                      ? 'No onboarding documents have been submitted yet.'
                      : 'These are the documents submitted with your rider application.',
                  style: AppTypography.body().copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        if (documents.isEmpty)
          OreEmptyState(
            icon: LucideIcons.fileQuestion,
            title: 'No documents yet',
            subtitle: 'Complete rider onboarding to submit your documents.',
          )
        else
          ...documents.map(
            (document) => _documentCard(context, ref, document),
          ),
        const SizedBox(height: 16),
        OreButton(
          label: 'Request document update',
          icon: LucideIcons.upload,
          onPressed: () => OreSupportModal.show(
            context,
            title: 'Rider document update',
          ),
        ),
      ],
    );
  }

  Widget _documentCard(
    BuildContext context,
    WidgetRef ref,
    RiderDocumentRecord document,
  ) {
    final isImage = document.contentType.startsWith('image/');
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              isImage ? LucideIcons.image : LucideIcons.fileText,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _documentLabel(document.kind),
                  style: AppTypography.body().copyWith(fontWeight: FontWeight.w700),
                ),
                Text(
                  '${document.fileName} · Submitted ${Formatters.formatDate(document.createdAt)}',
                  style: AppTypography.caption(AppColors.textSecondary),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: () => _viewDocument(context, ref, document),
            child: const Text('View'),
          ),
        ],
      ),
    );
  }

  Future<void> _viewDocument(
    BuildContext context,
    WidgetRef ref,
    RiderDocumentRecord document,
  ) async {
    try {
      final content = await ref
          .read(riderDocumentsRepositoryProvider)
          .read(document.id);
      if (!context.mounted) return;
      await showDialog<void>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: Text(_documentLabel(document.kind)),
          content: content.contentType.startsWith('image/')
              ? Image.memory(content.bytes, fit: BoxFit.contain)
              : Text(
                  'This private ${content.contentType} document was retrieved securely. '
                  'A platform document viewer is required to preview this file.',
                ),
          actions: [
            if (!content.contentType.startsWith('image/'))
              TextButton(
                onPressed: () async {
                  await SharePlus.instance.share(
                    ShareParams(
                      files: [
                        XFile.fromData(
                          content.bytes,
                          name: document.fileName,
                          mimeType: content.contentType,
                        ),
                      ],
                    ),
                  );
                },
                child: const Text('Share file'),
              ),
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Close'),
            ),
          ],
        ),
      );
    } on DioException catch (error) {
      if (!context.mounted) return;
      final body = error.response?.data;
      final message = body is Map && body['error'] is Map
          ? (body['error'] as Map)['message']?.toString()
          : 'Unable to load this private document.';
      OreToast.show(context, message: message ?? 'Unable to load this private document.', type: ToastType.error);
    } catch (_) {
      if (!context.mounted) return;
      OreToast.show(
        context,
        message: 'Unable to load this private document.',
        type: ToastType.error,
      );
    }
  }

  String _documentLabel(String kind) {
    switch (kind) {
      case 'document_front':
        return 'Ghana Card (Front)';
      case 'document_back':
        return 'Ghana Card (Back)';
      case 'drivers_license':
        return "Driver's License";
      default:
        return kind.replaceAll('_', ' ');
    }
  }
}
