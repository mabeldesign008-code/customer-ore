import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../data/catalog/vendor_catalog_repository.dart';
import '../../providers/vendor_data_provider.dart';

/// Categories remain a projection of MenuItem.category, but vendors can now
/// rename a populated category through an ownership-checked Catalog contract.
class CategoryManagementScreen extends ConsumerWidget {
  const CategoryManagementScreen({super.key, this.vendorType = 'food'});

  final String vendorType;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snapshot = ref.watch(vendorSnapshotProvider);
    return snapshot.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'))),
      error: (_, __) => Scaffold(appBar: AppBar(title: const Text('Categories')), body: Center(child: ElevatedButton(onPressed: () => ref.invalidate(vendorSnapshotProvider), child: const Text('Retry')))),
      data: (value) => _CategoryList(vendorId: value.vendor.id, categoriesFuture: ref.read(vendorCatalogRepositoryProvider).getCategories(value.vendor.id)),
    );
  }
}

class _CategoryList extends StatefulWidget {
  const _CategoryList({required this.vendorId, required this.categoriesFuture});

  final String vendorId;
  final Future<List<VendorCategorySummary>> categoriesFuture;

  @override
  State<_CategoryList> createState() => _CategoryListState();
}

class _CategoryListState extends State<_CategoryList> {
  late Future<List<VendorCategorySummary>> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.categoriesFuture;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Categories', style: AppTextStyles.heading3), actions: [IconButton(tooltip: 'Action', onPressed: _reload, icon: const Icon(LucideIcons.refreshCw))]),
      body: FutureBuilder<List<VendorCategorySummary>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'));
          if (snapshot.hasError) return Center(child: Text('Unable to load categories', style: AppTextStyles.bodyMedium));
          final categories = snapshot.data ?? const <VendorCategorySummary>[];
          if (categories.isEmpty) return const Center(child: Text('Add a product category from the Menu screen first.'));
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: categories.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (_, index) {
              final category = categories[index];
              return ListTile(
                tileColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: const BorderSide(color: AppColors.border)),
                leading: const Icon(LucideIcons.folder, color: AppColors.primary),
                title: Text(category.name, style: AppTextStyles.subtitleMedium),
                subtitle: Text('${category.itemCount} item${category.itemCount == 1 ? '' : 's'}', style: AppTextStyles.caption),
                trailing: IconButton(tooltip: 'Action', onPressed: () => _rename(category), icon: const Icon(LucideIcons.pencil, color: AppColors.primary)),
              );
            },
          );
        },
      ),
    );
  }

  void _reload() {
    setState(() => _future = ProviderScope.containerOf(context).read(vendorCatalogRepositoryProvider).getCategories(widget.vendorId));
  }

  Future<void> _rename(VendorCategorySummary category) async {
    final controller = TextEditingController(text: category.name);
    final newName = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Rename category'),
        content: TextField(controller: controller, autofocus: true, decoration: const InputDecoration(labelText: 'Category name')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(dialogContext, controller.text.trim()), child: const Text('Save')),
        ],
      ),
    );
    controller.dispose();
    if (newName == null || newName.isEmpty || newName == category.name) return;
    try {
      final container = ProviderScope.containerOf(context);
      final result = await container.read(vendorCatalogRepositoryProvider).renameCategory(widget.vendorId, category.name, newName);
      if (mounted) setState(() => _future = Future.value(result));
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to rename category')));
    }
  }
}
