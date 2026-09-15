import 'dart:convert';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart' hide AppColors;

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../data/catalog/vendor_catalog_repository.dart';
import '../../models/vendor_config.dart';
import '../../providers/vendor_data_provider.dart';

class VendorMenuTab extends ConsumerWidget {
  const VendorMenuTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snapshot = ref.watch(vendorSnapshotProvider);
    return snapshot.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'))),
      error: (_, __) => Scaffold(
        appBar: AppBar(title: Text('Menu', style: AppTypography.h2())),
        body: Center(child: OreButton(label: 'Retry', onPressed: () => ref.invalidate(vendorSnapshotProvider))),
      ),
      data: (value) => Scaffold(
        appBar: AppBar(
          title: Text('Menu', style: AppTypography.h2()),
          actions: [
            IconButton(tooltip: 'Add', 
              onPressed: () => _showItemDialog(context, ref, value.vendor.id, value.vendor.vendorType, defaultPrepTimeMin: value.vendor.defaultPrepTimeMin),
              icon: const Icon(LucideIcons.plus),
            ),
          ],
        ),
        body: value.menu.isEmpty
            ? Center(
                child: OreEmptyState(
                  icon: LucideIcons.utensils,
                  title: 'No products yet',
                  subtitle: 'Add products to start selling.',
                  ctaLabel: 'Add product',
                  onCta: () => _showItemDialog(context, ref, value.vendor.id, value.vendor.vendorType, defaultPrepTimeMin: value.vendor.defaultPrepTimeMin),
                ),
              )
            : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: value.menu.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (_, index) => _itemCard(context, ref, value.menu[index], value.vendor.vendorType, value.vendor.defaultPrepTimeMin),
              ),
      ),
    );
  }

  Widget _itemCard(BuildContext context, WidgetRef ref, VendorMenuItem item, String vendorType, int defaultPrepTimeMin) {
    return InkWell(
      onTap: () => _showItemDialog(context, ref, item.vendorId, vendorType, defaultPrepTimeMin: defaultPrepTimeMin, item: item),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.08), borderRadius: BorderRadius.circular(12)),
              child: item.imageUrl == null
                ? const Icon(LucideIcons.package, color: AppColors.primary)
                : ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: CachedNetworkImage(imageUrl: item.imageUrl!, fit: BoxFit.cover),
                  ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(item.name, style: AppTextStyles.subtitleMedium),
                Text('${item.category} · ${Formatters.money(item.pricePesewas / 100)}', style: AppTextStyles.caption),
                if (item.sku != null || item.stock != null || item.turnaround != null || item.expiryDate != null || item.dailyMarketPrice || item.prescriptionOnly)
                  Text(
                    [
                      if (item.sku != null) 'SKU ${item.sku}',
                      if (item.stock != null) 'Stock ${item.stock}',
                      if (item.turnaround != null) item.turnaround!,
                      if (item.expiryDate != null) 'Exp ${item.expiryDate!.toIso8601String().split('T').first}',
                      if (item.dailyMarketPrice) 'Daily price',
                      if (item.prescriptionOnly) 'Rx',
                    ].join(' · '),
                    style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
                  ),
              ]),
            ),
            Switch(
              value: item.available,
              onChanged: (value) async {
                try {
                  await ref.read(vendorCatalogRepositoryProvider).updateItem(item.id, <String, dynamic>{'available': value});
                  ref.invalidate(vendorSnapshotProvider);
                } catch (_) {
                  if (!context.mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to update product availability')));
                }
              },
              activeColor: AppColors.primary,
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showItemDialog(
    BuildContext context,
    WidgetRef ref,
    String vendorId,
    String vendorType, {
    int defaultPrepTimeMin = 10,
    VendorMenuItem? item,
  }) async {
    final config = getVendorConfig(_configId(vendorType));
    final name = TextEditingController(text: item?.name ?? '');
    final category = TextEditingController(text: item?.category ?? '');
    final price = TextEditingController(text: item == null ? '' : (item.pricePesewas / 100).toStringAsFixed(2));
    final prep = TextEditingController(text: item?.prepTimeMin.toString() ?? defaultPrepTimeMin.toString());
    final unit = TextEditingController(text: item?.unit ?? 'each');
    final stock = TextEditingController(text: item?.stock?.toString() ?? '');
    final sku = TextEditingController(text: item?.sku ?? '');
    final expiry = TextEditingController(text: item?.expiryDate?.toIso8601String().split('T').first ?? '');
    final dosage = TextEditingController(text: item?.dosage ?? '');
    final turnaround = TextEditingController(text: item?.turnaround ?? '');
    final garmentType = TextEditingController(text: item?.garmentType ?? '');
    final dietary = TextEditingController(text: item?.dietaryTags.join(', ') ?? '');
    final condition = TextEditingController(text: item?.conditionJson == null ? '' : jsonEncode(item!.conditionJson));
    var variants = _editorAddonGroups(item?.addonGroups ?? const <Map<String, dynamic>>[]);
    bool prescriptionOnly = item?.prescriptionOnly ?? false;
    bool dailyMarketPrice = item?.dailyMarketPrice ?? false;
    PlatformFile? selectedImage;

    final draft = await showDialog<_VendorItemDraft>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setDialogState) => AlertDialog(
          title: Text(item == null ? 'Add product' : 'Edit product'),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              _field(name, 'Name'),
              _field(category, 'Category'),
              _field(price, 'Price (GHS)', numeric: true),
              if (config.fields['prepTime'] == true || config.fields['turnaround'] != true) _field(prep, config.prepTimeLabel, numeric: true),
              if (config.fields['weightUnit'] == true) _field(unit, 'Unit (kg, pack, piece)'),
              if (config.fields['stockQty'] == true) _field(stock, 'Stock quantity', numeric: true),
              if (config.fields['sku'] == true) _field(sku, 'SKU / barcode'),
              if (config.fields['expiryDate'] == true) _field(expiry, 'Expiry date (YYYY-MM-DD)'),
              if (config.fields['rxRequired'] == true) ...[
                _field(dosage, 'Dosage / strength'),
                CheckboxListTile(value: prescriptionOnly, onChanged: (value) => setDialogState(() => prescriptionOnly = value ?? false), title: const Text('Prescription required'), contentPadding: EdgeInsets.zero),
              ],
              if (config.fields['turnaround'] == true) _field(turnaround, config.prepTimeLabel),
              if (config.fields['garmentType'] == true) _field(garmentType, 'Garment/service type'),
              if (config.fields['dietary'] == true) _field(dietary, 'Dietary tags (comma separated)'),
              if (config.hasConditionLog) _field(condition, 'Condition/intake metadata JSON'),
              if (config.fields['dailyPrice'] == true) CheckboxListTile(value: dailyMarketPrice, onChanged: (value) => setDialogState(() => dailyMarketPrice = value ?? false), title: const Text('Refresh price daily'), contentPadding: EdgeInsets.zero),
              OutlinedButton.icon(
                onPressed: () async {
                  final result = await FilePicker.platform.pickFiles(withData: true, type: FileType.image);
                  final file = result?.files.single;
                  if (file?.bytes != null) setDialogState(() => selectedImage = file);
                },
                icon: const Icon(LucideIcons.image, size: 16),
                label: Text(
                  selectedImage != null
                      ? 'Photo: ${selectedImage!.name}'
                      : item?.imageUrl != null
                          ? 'Replace photo'
                          : 'Add product photo (required)',
                ),
              ),
              if (config.fields['variants'] == true) ...[
                const SizedBox(height: 8),
                _VariantGroupsEditor(
                  groups: variants,
                  onChanged: (value) => setDialogState(() => variants = value),
                ),
              ],
            ]),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            ElevatedButton(onPressed: () {
              final amount = double.tryParse(price.text.trim());
              Map<String, dynamic>? conditionJson;
              if (condition.text.trim().isNotEmpty) {
                try {
                  final decodedCondition = jsonDecode(condition.text);
                  if (decodedCondition is! Map) throw const FormatException();
                  conditionJson = Map<String, dynamic>.from(decodedCondition);
                } catch (_) {
                  ScaffoldMessenger.of(dialogContext).showSnackBar(const SnackBar(content: Text('Condition metadata JSON is invalid')));
                  return;
                }
              }
              if (name.text.trim().isEmpty || category.text.trim().isEmpty || amount == null || amount < 0) {
                ScaffoldMessenger.of(dialogContext).showSnackBar(const SnackBar(content: Text('Name, category, and price are required')));
                return;
              }
              if (selectedImage?.bytes == null && (item?.imageUrl == null || item!.imageUrl!.isEmpty)) {
                ScaffoldMessenger.of(dialogContext).showSnackBar(const SnackBar(content: Text('Every product needs a photo')));
                return;
              }
              final stockValue = int.tryParse(stock.text.trim());
              String? validationError;
              if (config.fields['prepTime'] == true && (int.tryParse(prep.text.trim()) == null || int.parse(prep.text.trim()) < 0)) {
                validationError = 'Enter a valid non-negative preparation time';
              } else if (config.fields['stockQty'] == true && (stockValue == null || stockValue < 0)) {
                validationError = 'Enter a non-negative stock quantity';
              } else if (config.fields['sku'] == true && sku.text.trim().isEmpty) {
                validationError = 'SKU / barcode is required for this vertical';
              } else if (config.fields['weightUnit'] == true && unit.text.trim().isEmpty) {
                validationError = 'A weight or selling unit is required';
              } else if (config.fields['expiryDate'] == true && (expiry.text.trim().isEmpty || DateTime.tryParse(expiry.text.trim()) == null)) {
                validationError = 'Enter a valid expiry date';
              } else if (config.fields['rxRequired'] == true && prescriptionOnly && dosage.text.trim().isEmpty) {
                validationError = 'Dosage / strength is required for prescription items';
              } else if (config.fields['turnaround'] == true && turnaround.text.trim().isEmpty) {
                validationError = 'Service turnaround is required';
              } else if (config.fields['garmentType'] == true && garmentType.text.trim().isEmpty) {
                validationError = 'Garment or service type is required';
              } else if (variants.any((group) => group['id'] is! String || (group['id'] as String).trim().isEmpty || group['name'] is! String || (group['name'] as String).trim().isEmpty || group['options'] is! List || (group['options'] as List).isEmpty)) {
                validationError = 'Every variant group needs a name and at least one option';
              }
              if (validationError != null) {
                ScaffoldMessenger.of(dialogContext).showSnackBar(SnackBar(content: Text(validationError)));
                return;
              }
              Navigator.pop(dialogContext, _VendorItemDraft(
                name: name.text.trim(),
                category: category.text.trim(),
                pricePesewas: (amount * 100).round(),
                prepTimeMin: int.tryParse(prep.text.trim()) ?? 10,
                unit: unit.text.trim().isEmpty ? 'each' : unit.text.trim(),
                stock: int.tryParse(stock.text.trim()),
                sku: sku.text.trim().isEmpty ? null : sku.text.trim(),
                expiryDate: expiry.text.trim().isEmpty ? null : expiry.text.trim(),
                dosage: dosage.text.trim().isEmpty ? null : dosage.text.trim(),
                turnaround: turnaround.text.trim().isEmpty ? null : turnaround.text.trim(),
                garmentType: garmentType.text.trim().isEmpty ? null : garmentType.text.trim(),
                dietaryTags: dietary.text.split(',').map((tag) => tag.trim()).where((tag) => tag.isNotEmpty).toList(),
                addonGroups: variants,
                prescriptionOnly: prescriptionOnly,
                dailyMarketPrice: dailyMarketPrice,
                conditionJson: conditionJson,
                imageBytes: selectedImage?.bytes,
                imageContentType: selectedImage == null ? null : _imageContentType(selectedImage!.name),
              ));
            }, child: Text(item == null ? 'Add' : 'Save')),
          ],
        ),
      ),
    );

    name.dispose();
    category.dispose();
    price.dispose();
    prep.dispose();
    unit.dispose();
    stock.dispose();
    sku.dispose();
    expiry.dispose();
    dosage.dispose();
    turnaround.dispose();
    garmentType.dispose();
    dietary.dispose();
    condition.dispose();
    if (draft == null) return;

    try {
      final repo = ref.read(vendorCatalogRepositoryProvider);
      late VendorMenuItem saved;
      if (item == null) {
        saved = await repo.addItem(
          vendorId: vendorId,
          name: draft.name,
          category: draft.category,
          pricePesewas: draft.pricePesewas,
          prepTimeMin: draft.prepTimeMin,
          unit: draft.unit,
          stock: draft.stock,
          prescriptionOnly: draft.prescriptionOnly,
          modifiers: const <String>[],
          addonGroups: draft.addonGroups,
          sku: draft.sku,
          expiryDate: draft.expiryDate == null ? null : DateTime.tryParse(draft.expiryDate!),
          dosage: draft.dosage,
          turnaround: draft.turnaround,
          dailyMarketPrice: draft.dailyMarketPrice,
          garmentType: draft.garmentType,
          conditionJson: draft.conditionJson,
          dietaryTags: draft.dietaryTags,
        );
      } else {
        saved = await repo.updateItem(item.id, <String, dynamic>{
          'name': draft.name,
          'category': draft.category,
          'pricePesewas': draft.pricePesewas,
          'prepTimeMin': draft.prepTimeMin,
          'unit': draft.unit,
          'stock': draft.stock,
          'prescriptionOnly': draft.prescriptionOnly,
          'addonGroups': draft.addonGroups,
          'sku': draft.sku,
          'expiryDate': draft.expiryDate,
          'dosage': draft.dosage,
          'turnaround': draft.turnaround,
          'dailyMarketPrice': draft.dailyMarketPrice,
          'garmentType': draft.garmentType,
          'conditionJson': draft.conditionJson,
          'dietaryTags': draft.dietaryTags,
        });
      }
      if (draft.imageBytes != null && draft.imageContentType != null) {
        saved = await repo.uploadItemImage(itemId: saved.id, bytes: draft.imageBytes!, contentType: draft.imageContentType!);
      }
      ref.invalidate(vendorSnapshotProvider);
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(item == null ? 'Product added' : 'Product updated')));
    } catch (error) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(_saveError(error))));
    }
  }

  String _saveError(Object error) {
    if (error is DioException) {
      final body = error.response?.data;
      if (body is Map) {
        final nested = body['error'];
        if (nested is Map && nested['message'] is String) return nested['message'] as String;
        if (body['message'] is String) return body['message'] as String;
      }
      if (error.type == DioExceptionType.connectionError) return 'No internet connection. Product was not saved.';
    }
    return 'Unable to save product. Check the fields and try again.';
  }

  Widget _field(TextEditingController controller, String label, {bool numeric = false}) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: TextField(controller: controller, keyboardType: numeric ? TextInputType.number : TextInputType.text, decoration: InputDecoration(labelText: label)),
      );

  String _imageContentType(String fileName) {
    final lower = fileName.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }

  String _configId(String vendorType) {
    switch (vendorType.toUpperCase()) {
      case 'GROCERY':
        return 'groceries';
      default:
        return vendorType.toLowerCase();
    }
  }
}

List<Map<String, dynamic>> _editorAddonGroups(List<Map<String, dynamic>> input) {
  return input.asMap().entries.map((entry) {
    final group = Map<String, dynamic>.from(entry.value);
    final groupId = (group['id'] as String?)?.trim().isNotEmpty == true
        ? (group['id'] as String).trim()
        : 'group-${entry.key + 1}';
    final rawOptions = group['options'] is List ? group['options'] as List : const <dynamic>[];
    final options = rawOptions.asMap().entries.map((optionEntry) {
      final raw = optionEntry.value is Map ? Map<String, dynamic>.from(optionEntry.value as Map) : <String, dynamic>{};
      final optionId = (raw['id'] as String?)?.trim().isNotEmpty == true
          ? (raw['id'] as String).trim()
          : '$groupId-option-${optionEntry.key + 1}';
      return <String, dynamic>{
        'id': optionId,
        'name': raw['name']?.toString() ?? 'Option ${optionEntry.key + 1}',
        'priceAdjustmentPesewas': raw['priceAdjustmentPesewas'] is num ? (raw['priceAdjustmentPesewas'] as num).toInt() : 0,
      };
    }).toList();
    if (options.isEmpty) {
      options.add(<String, dynamic>{'id': '$groupId-option-1', 'name': 'Option 1', 'priceAdjustmentPesewas': 0});
    }
    final required = group['required'] == true || group['is_required'] == true;
    final min = group['minSelections'] is num ? (group['minSelections'] as num).toInt() : (required ? 1 : 0);
    final max = group['maxSelections'] is num ? (group['maxSelections'] as num).toInt() : 1;
    return <String, dynamic>{
      'id': groupId,
      'name': group['name']?.toString() ?? 'Option group ${entry.key + 1}',
      'required': required,
      'minSelections': min,
      'maxSelections': max,
      'options': options,
    };
  }).toList();
}

String _newVariantId(String prefix) => '$prefix-${DateTime.now().microsecondsSinceEpoch}';

class _VariantGroupsEditor extends StatelessWidget {
  const _VariantGroupsEditor({required this.groups, required this.onChanged});

  final List<Map<String, dynamic>> groups;
  final ValueChanged<List<Map<String, dynamic>>> onChanged;

  void _replaceGroup(int index, Map<String, dynamic> group) {
    final next = groups.map((item) => Map<String, dynamic>.from(item)).toList();
    next[index] = group;
    onChanged(next);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Expanded(child: Text('Variants and add-ons', style: TextStyle(fontWeight: FontWeight.w700))),
          IconButton(
            tooltip: 'Add option group',
            onPressed: () {
              final id = _newVariantId('group');
              onChanged([
                ...groups,
                <String, dynamic>{
                  'id': id,
                  'name': 'New group',
                  'required': false,
                  'minSelections': 0,
                  'maxSelections': 1,
                  'options': <Map<String, dynamic>>[
                    <String, dynamic>{'id': _newVariantId('option'), 'name': 'Option 1', 'priceAdjustmentPesewas': 0},
                  ],
                },
              ]);
            },
            icon: const Icon(LucideIcons.plusCircle, size: 19),
          ),
        ]),
        if (groups.isEmpty)
          const Padding(
            padding: EdgeInsets.only(bottom: 4),
            child: Text('No selectable options. Add a group when customers can choose size, colour, weight, or extras.'),
          )
        else
          ...groups.asMap().entries.map((entry) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _VariantGroupEditorCard(
                  key: ValueKey(entry.value['id']),
                  group: entry.value,
                  onChanged: (group) => _replaceGroup(entry.key, group),
                  onRemove: () => onChanged(groups.asMap().entries.where((item) => item.key != entry.key).map((item) => Map<String, dynamic>.from(item.value)).toList()),
                ),
              )),
        Text('Extra prices are entered in GHS and sent to the backend as integer pesewas.', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
      ]),
    );
  }
}

class _VariantGroupEditorCard extends StatefulWidget {
  const _VariantGroupEditorCard({super.key, required this.group, required this.onChanged, required this.onRemove});

  final Map<String, dynamic> group;
  final ValueChanged<Map<String, dynamic>> onChanged;
  final VoidCallback onRemove;

  @override
  State<_VariantGroupEditorCard> createState() => _VariantGroupEditorCardState();
}

class _VariantGroupEditorCardState extends State<_VariantGroupEditorCard> {
  late final TextEditingController _name;
  late final TextEditingController _min;
  late final TextEditingController _max;
  late bool _required;
  late List<Map<String, dynamic>> _options;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.group['name']?.toString() ?? '');
    _min = TextEditingController(text: (widget.group['minSelections'] ?? 0).toString());
    _max = TextEditingController(text: (widget.group['maxSelections'] ?? 1).toString());
    _required = widget.group['required'] == true;
    _options = (widget.group['options'] is List ? widget.group['options'] as List : const <dynamic>[])
        .whereType<Map>()
        .map((option) => Map<String, dynamic>.from(option))
        .toList();
  }

  @override
  void dispose() {
    _name.dispose();
    _min.dispose();
    _max.dispose();
    super.dispose();
  }

  void _emit() {
    final optionCount = _options.length;
    var min = int.tryParse(_min.text) ?? 0;
    var max = int.tryParse(_max.text) ?? 1;
    if (_required && min < 1) min = 1;
    if (optionCount > 0) {
      min = min.clamp(0, optionCount).toInt();
      max = max.clamp(1, optionCount).toInt();
      if (min > max) min = max;
    }
    widget.onChanged(<String, dynamic>{
      'id': widget.group['id'],
      'name': _name.text.trim(),
      'required': _required,
      'minSelections': min,
      'maxSelections': max,
      'options': _options,
    });
  }

  void _replaceOption(int index, Map<String, dynamic> option) {
    setState(() => _options[index] = option);
    _emit();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.border)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: TextField(controller: _name, onChanged: (_) => _emit(), decoration: const InputDecoration(labelText: 'Group name', isDense: true))),
          IconButton(tooltip: 'Remove group', onPressed: widget.onRemove, icon: const Icon(LucideIcons.trash2, size: 18, color: AppColors.error)),
        ]),
        Row(children: [
          Expanded(child: TextField(controller: _min, onChanged: (_) => _emit(), keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Minimum', isDense: true))),
          const SizedBox(width: 8),
          Expanded(child: TextField(controller: _max, onChanged: (_) => _emit(), keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Maximum', isDense: true))),
          const SizedBox(width: 4),
          Tooltip(message: 'Required groups need at least one selection', child: Checkbox(value: _required, onChanged: (value) { setState(() => _required = value ?? false); _emit(); })),
        ]),
        ..._options.asMap().entries.map((entry) => _VariantOptionEditor(
              key: ValueKey(entry.value['id']),
              option: entry.value,
              canRemove: _options.length > 1,
              onChanged: (option) => _replaceOption(entry.key, option),
              onRemove: () { setState(() => _options.removeAt(entry.key)); _emit(); },
            )),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: () {
              setState(() => _options.add(<String, dynamic>{'id': _newVariantId('option'), 'name': 'New option', 'priceAdjustmentPesewas': 0}));
              _emit();
            },
            icon: const Icon(LucideIcons.plus, size: 16),
            label: const Text('Add option'),
          ),
        ),
      ]),
    );
  }
}

class _VariantOptionEditor extends StatefulWidget {
  const _VariantOptionEditor({super.key, required this.option, required this.canRemove, required this.onChanged, required this.onRemove});

  final Map<String, dynamic> option;
  final bool canRemove;
  final ValueChanged<Map<String, dynamic>> onChanged;
  final VoidCallback onRemove;

  @override
  State<_VariantOptionEditor> createState() => _VariantOptionEditorState();
}

class _VariantOptionEditorState extends State<_VariantOptionEditor> {
  late final TextEditingController _name;
  late final TextEditingController _price;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.option['name']?.toString() ?? '');
    final price = widget.option['priceAdjustmentPesewas'];
    _price = TextEditingController(text: price is num ? (price.toDouble() / 100).toStringAsFixed(2) : '0.00');
  }

  @override
  void dispose() {
    _name.dispose();
    _price.dispose();
    super.dispose();
  }

  void _emit() {
    final amount = double.tryParse(_price.text.trim()) ?? 0;
    widget.onChanged(<String, dynamic>{
      'id': widget.option['id'],
      'name': _name.text.trim(),
      'priceAdjustmentPesewas': (amount * 100).round(),
    });
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(children: [
        Expanded(child: TextField(controller: _name, onChanged: (_) => _emit(), decoration: const InputDecoration(labelText: 'Option', isDense: true))),
        const SizedBox(width: 8),
        SizedBox(width: 105, child: TextField(controller: _price, onChanged: (_) => _emit(), keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Extra GHS', isDense: true))),
        IconButton(tooltip: widget.canRemove ? 'Remove option' : 'At least one option is required', onPressed: widget.canRemove ? widget.onRemove : null, icon: const Icon(LucideIcons.x, size: 17)),
      ]),
    );
  }
}

class _VendorItemDraft {
  const _VendorItemDraft({
    required this.name,
    required this.category,
    required this.pricePesewas,
    required this.prepTimeMin,
    required this.unit,
    required this.stock,
    required this.sku,
    required this.expiryDate,
    required this.dosage,
    required this.turnaround,
    required this.garmentType,
    required this.conditionJson,
    required this.dietaryTags,
    required this.addonGroups,
    required this.prescriptionOnly,
    required this.dailyMarketPrice,
    this.imageBytes,
    this.imageContentType,
  });

  final String name;
  final String category;
  final int pricePesewas;
  final int prepTimeMin;
  final String unit;
  final int? stock;
  final String? sku;
  final String? expiryDate;
  final String? dosage;
  final String? turnaround;
  final String? garmentType;
  final Map<String, dynamic>? conditionJson;
  final List<String> dietaryTags;
  final List<Map<String, dynamic>> addonGroups;
  final bool prescriptionOnly;
  final bool dailyMarketPrice;
  final List<int>? imageBytes;
  final String? imageContentType;
}
