import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ore_core/ore_core.dart';

import '../models/vendor_story.dart';
import 'customer_catalog_provider.dart';

/// Customer story feed backed by the public Catalog stories endpoint.
/// Stories are grouped with their live Vendor projection so tapping a story
/// always navigates using a real Vendor ID.
class VendorStoriesNotifier extends Notifier<List<VendorStory>> {
  bool _hydrating = false;

  @override
  List<VendorStory> build() {
    Future.microtask(() => hydrate().catchError((_) {}));
    return const <VendorStory>[];
  }

  Future<void> hydrate() async {
    if (_hydrating) return;
    _hydrating = true;
    try {
      final rows = await ref.read(customerCatalogRepositoryProvider).stories();
      final grouped = <String, List<Map<String, dynamic>>>{};
      for (final row in rows) {
        final vendorId = row['vendorId']?.toString();
        if (vendorId == null || vendorId.isEmpty) continue;
        grouped.putIfAbsent(vendorId, () => <Map<String, dynamic>>[]).add(row);
      }

      final stories = <VendorStory>[];
      for (final entry in grouped.entries) {
        try {
          final detail = await ref.read(customerCatalogRepositoryProvider).getVendor(entry.key);
          final posts = entry.value.map((row) {
            final kind = row['kind']?.toString().toUpperCase();
            return VendorStoryPost(
              id: row['id']?.toString() ?? '',
              mediaUrl: row['mediaUrl']?.toString() ?? '',
              mediaType: kind == 'VIDEO' ? MediaType.video : MediaType.image,
              caption: row['caption'] as String?,
              vendorId: entry.key,
              createdAt: DateTime.tryParse(row['createdAt']?.toString() ?? '') ?? DateTime.now(),
            );
          }).where((post) => post.mediaUrl.isNotEmpty).toList(growable: false);
          if (posts.isEmpty) continue;
          stories.add(
            VendorStory(
              vendorId: entry.key,
              vendorName: detail.vendor.name,
              vendorImage: detail.vendor.logoUrl ?? detail.vendor.coverUrl ?? '',
              serviceType: detail.vendor.serviceType,
              posts: posts,
            ),
          );
        } catch (_) {
          // A deleted or inaccessible Vendor should not break the rest of the
          // public story feed.
        }
      }
      state = stories;
    } finally {
      _hydrating = false;
    }
  }

  List<VendorStory> getStoriesForService(ServiceType serviceType) =>
      state.where((story) => story.serviceType == serviceType).toList(growable: false);

  void markStoryAsViewed(String vendorId) {
    state = [
      for (final story in state)
        story.vendorId == vendorId ? story.copyWith(isViewed: true) : story,
    ];
  }
}

final vendorStoriesProvider =
    NotifierProvider<VendorStoriesNotifier, List<VendorStory>>(VendorStoriesNotifier.new);
