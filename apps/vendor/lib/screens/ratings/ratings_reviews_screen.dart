import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../data/catalog/vendor_catalog_repository.dart';
import '../../providers/vendor_data_provider.dart';

class RatingsReviewsScreen extends ConsumerWidget {
  const RatingsReviewsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snapshot = ref.watch(vendorSnapshotProvider);
    return snapshot.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'))),
      error: (_, __) => const Scaffold(body: Center(child: Text('Vendor profile unavailable'))),
      data: (value) => _ReviewsList(vendorId: value.vendor.id),
    );
  }
}

class _ReviewsList extends StatefulWidget {
  const _ReviewsList({required this.vendorId});
  final String vendorId;

  @override
  State<_ReviewsList> createState() => _ReviewsListState();
}

class _ReviewsListState extends State<_ReviewsList> {
  late Future<List<VendorReviewRecord>> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = ProviderScope.containerOf(context).read(vendorCatalogRepositoryProvider).getReviews(widget.vendorId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Ratings & reviews', style: AppTextStyles.heading3), actions: [IconButton(tooltip: 'Action', onPressed: () => setState(_load), icon: const Icon(LucideIcons.refreshCw))]),
      body: FutureBuilder<List<VendorReviewRecord>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'));
          if (snapshot.hasError) return const Center(child: Text('Unable to load reviews'));
          final reviews = snapshot.data ?? const <VendorReviewRecord>[];
          if (reviews.isEmpty) return const Center(child: Text('No customer reviews yet.'));
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: reviews.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (_, index) => _ReviewCard(review: reviews[index], onResponded: () => setState(_load)),
          );
        },
      ),
    );
  }
}

class _ReviewCard extends ConsumerWidget {
  const _ReviewCard({required this.review, required this.onResponded});
  final VendorReviewRecord review;
  final VoidCallback onResponded;

  Future<void> _respond(BuildContext context, WidgetRef ref) async {
    final controller = TextEditingController(text: review.vendorResponse ?? '');
    final response = await showDialog<String>(context: context, builder: (dialogContext) => AlertDialog(title: const Text('Respond to review'), content: TextField(controller: controller, maxLength: 1000, maxLines: 4, decoration: const InputDecoration(labelText: 'Response')), actions: [TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')), ElevatedButton(onPressed: () => Navigator.pop(dialogContext, controller.text.trim()), child: const Text('Save'))]));
    controller.dispose();
    if (response == null || response.isEmpty) return;
    try {
      await ref.read(vendorCatalogRepositoryProvider).respondToReview(review.id, response);
      onResponded();
    } catch (_) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to save review response')));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.border)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(List.filled(review.rating, '★').join() + List.filled(5 - review.rating, '☆').join(), style: const TextStyle(color: AppColors.warning, fontSize: 18))),
          Text(review.createdAt.toLocal().toIso8601String().split('T').first, style: AppTextStyles.caption),
        ]),
        if (review.comment?.isNotEmpty == true) Padding(padding: const EdgeInsets.only(top: 8), child: Text(review.comment!, style: AppTextStyles.bodyMedium)),
        if (review.vendorResponse?.isNotEmpty == true) Padding(padding: const EdgeInsets.only(top: 10), child: Text('Your response: ${review.vendorResponse}', style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary))),
        Align(alignment: Alignment.centerRight, child: TextButton.icon(onPressed: () => _respond(context, ref), icon: const Icon(LucideIcons.messageSquare, size: 16), label: Text(review.vendorResponse == null ? 'Respond' : 'Edit response'))),
      ]),
    );
  }
}
