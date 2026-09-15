import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ore_core/ore_core.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../core/ui/customer_image.dart';

import '../providers/cart_provider.dart';

/// Bottom sheet for product customization (addons/variants, quantity, note)
/// before adding the item to cart.
class AddToCartSheet extends ConsumerStatefulWidget {
  const AddToCartSheet({
    super.key,
    required this.product,
    required this.vendorId,
    required this.vendorName,
    required this.onAdded,
  });

  final OreProduct product;
  final String vendorId;
  final String vendorName;
  final VoidCallback onAdded;

  @override
  ConsumerState<AddToCartSheet> createState() => _AddToCartSheetState();
}

class _AddToCartSheetState extends ConsumerState<AddToCartSheet> {
  int _qty = 1;
  final Map<String, Set<String>> _selected = {}; // groupId → optionIds
  final TextEditingController _note = TextEditingController();

  @override
  void initState() {
    super.initState();
    for (final g in widget.product.addonGroups) {
      _selected[g.id] = {};
      if (g.isRequired && g.minSelections == 1) {
        _selected[g.id]!.add(g.options.first.id);
      }
    }
  }

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Set<String> _opts(String gid) => _selected[gid] ?? {};

  bool _canAdd() {
    for (final g in widget.product.addonGroups) {
      final sel = _opts(g.id);
      if (g.isRequired && sel.length < g.minSelections) return false;
      if (sel.length > g.maxSelections) return false;
    }
    return true;
  }

  double get _finalPrice {
    double p = widget.product.price;
    for (final g in widget.product.addonGroups) {
      for (final optId in _opts(g.id)) {
        final o = g.options.firstWhere((o) => o.id == optId);
        p += o.priceAdjustment;
      }
    }
    return p * _qty;
  }

  void _toggle(AddonGroup g, AddonOption o) {
    Haptics.light();
    setState(() {
      final s = _selected[g.id]!;
      if (g.isSingleSelect) {
        s.clear();
        s.add(o.id);
      } else {
        if (s.contains(o.id)) {
          s.remove(o.id);
        } else {
          if (s.length < g.maxSelections) s.add(o.id);
        }
      }
    });
  }

  void _submit() {
    final addons = <SelectedAddon>[];
    for (final g in widget.product.addonGroups) {
      for (final optId in _opts(g.id)) {
        final o = g.options.firstWhere((o) => o.id == optId);
        addons.add(SelectedAddon(
          groupId: g.id,
          groupName: g.name,
          optionId: o.id,
          optionName: o.name,
          priceAdjustment: o.priceAdjustment,
        ));
      }
    }

    final item = CartItem(
      productId: widget.product.id,
      title: widget.product.name,
      description: widget.product.description,
      unitPrice: widget.product.price,
      quantity: _qty,
      imageUrl: widget.product.imageUrl,
      vendorId: widget.vendorId,
      vendorName: widget.vendorName,
      specialInstructions: _note.text.trim().isEmpty ? null : _note.text.trim(),
      selectedAddons: addons,
    );

    final cart = ref.read(cartProvider.notifier);
    if (cart.hasVendorConflict(widget.vendorId)) {
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('Start new cart?'),
          content: Text('Your cart has items from a different vendor. Starting a new cart will clear them.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () {
                cart.clear();
                cart.addItem(item);
                Navigator.pop(context);
                Navigator.pop(context);
                widget.onAdded();
              },
              child: const Text('Yes, clear'),
            ),
          ],
        ),
      );
      return;
    }

    cart.addItem(item);
    Navigator.pop(context);
    widget.onAdded();
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.product;
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    final canAdd = _canAdd();

    return Padding(
      padding: EdgeInsets.only(bottom: bottom),
      child: DraggableScrollableSheet(
        initialChildSize: 0.75,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scroll) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(children: [
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 10, bottom: 8),
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
            Expanded(
              child: ListView(
                controller: scroll,
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                children: [
                  // Product
                  Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Hero(
                      tag: 'prod-${p.id}',
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: CustomerImage(
                          p.imageUrl ?? 'assets/images/vendors/restaurant_nana.jpg',
                          width: 100,
                          height: 100,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(width: 100, height: 100, color: AppColors.divider),
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(p.name, style: AppTypography.h2().copyWith(fontSize: 18)),
                      if (p.description != null) ...[
                        const SizedBox(height: 4),
                        Text(p.description!, style: AppTypography.bodySm()),
                      ],
                      if (p.requiresPrescription) ...[
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.danger.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text('Prescription Required (Rx)', style: AppTypography.caption(AppColors.danger).copyWith(fontWeight: FontWeight.bold)),
                        ),
                      ],
                      if (p.turnaround != null) ...[
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.info.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(p.turnaround!, style: AppTypography.caption(AppColors.info).copyWith(fontWeight: FontWeight.bold)),
                        ),
                      ],
                      const SizedBox(height: 8),
                      Text(
                        '${Formatters.money(p.price)}${p.unit != null ? " / ${p.unit}" : ""}',
                        style: AppTypography.h2(AppColors.primary),
                      ),
                    ])),
                  ]).animate().fadeIn(duration: Motion.normal).slideY(begin: 0.1),
                  const SizedBox(height: 20),

                  // Addon groups
                  for (final g in p.addonGroups) ...[
                    _AddonGroup(
                      group: g,
                      selected: _opts(g.id),
                      onToggle: (o) => _toggle(g, o),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Note
                  Text('Special instructions', style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _note,
                    maxLines: 2,
                    decoration: InputDecoration(
                      hintText: 'E.g. no onions, extra spicy',
                      filled: true,
                      fillColor: AppColors.background,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),

            // Bottom bar
            Container(
              padding: EdgeInsets.fromLTRB(20, 12, 20, MediaQuery.of(context).padding.bottom + 14),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 14, offset: const Offset(0, -4))],
              ),
              child: Row(children: [
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(30),
                  ),
                  child: Row(children: [
                    _QtyBtn(icon: Icons.remove_rounded, onTap: () { if (_qty > 1) setState(() => _qty--); Haptics.light(); }),
                    SizedBox(width: 28, child: Text('$_qty', textAlign: TextAlign.center, style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w800))),
                    _QtyBtn(icon: Icons.add_rounded, filled: true, onTap: () { setState(() => _qty++); Haptics.light(); }),
                  ]),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OreButton(
                    label: 'Add to cart · ${Formatters.money(_finalPrice)}',
                    icon: Icons.shopping_cart_outlined,
                    onPressed: canAdd ? _submit : null,
                  ),
                ),
              ]),
            ),
          ]),
        ),
      ),
    );
  }
}

class _AddonGroup extends StatelessWidget {
  const _AddonGroup({required this.group, required this.selected, required this.onToggle});
  final AddonGroup group;
  final Set<String> selected;
  final ValueChanged<AddonOption> onToggle;

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Text(group.name, style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(width: 8),
        Text(
          group.isRequired ? 'Required' : 'Optional',
          style: AppTypography.caption(group.isRequired ? AppColors.danger : AppColors.textMuted),
        ),
        const Spacer(),
        if (!group.isSingleSelect)
          Text('${selected.length}/${group.maxSelections}', style: AppTypography.caption()),
      ]),
      const SizedBox(height: 10),
      ...group.options.map((o) {
        final isSel = selected.contains(o.id);
        return AnimatedPress(
          onTap: () => onToggle(o),
          borderRadius: BorderRadius.circular(12),
          child: AnimatedContainer(
            duration: Motion.fast,
            curve: Motion.spring,
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: isSel ? AppColors.primary.withOpacity(0.06) : AppColors.background,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isSel ? AppColors.primary : Colors.transparent,
                width: 1.5,
              ),
            ),
            child: Row(children: [
              AnimatedContainer(
                duration: Motion.fast,
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  shape: group.isSingleSelect ? BoxShape.circle : BoxShape.rectangle,
                  borderRadius: group.isSingleSelect ? null : BorderRadius.circular(5),
                  color: isSel ? AppColors.primary : Colors.transparent,
                  border: Border.all(color: isSel ? AppColors.primary : AppColors.textMuted, width: 2),
                ),
                child: isSel ? const Icon(Icons.check, color: Colors.white, size: 14) : null,
              ),
              const SizedBox(width: 12),
              Expanded(child: Text(o.name, style: AppTypography.body().copyWith(fontWeight: FontWeight.w600))),
              Text(
                o.priceAdjustment > 0 ? '+${Formatters.money(o.priceAdjustment)}' : 'Included',
                style: AppTypography.bodySm(o.priceAdjustment > 0 ? AppColors.textPrimary : AppColors.success).copyWith(fontWeight: FontWeight.w700),
              ),
            ]),
          ),
        );
      }),
    ]);
  }
}

class _QtyBtn extends StatelessWidget {
  const _QtyBtn({required this.icon, required this.onTap, this.filled = false});
  final IconData icon;
  final VoidCallback onTap;
  final bool filled;
  @override
  Widget build(BuildContext context) {
    return AnimatedPress(
      onTap: onTap,
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: filled ? AppColors.primary : Colors.transparent,
          shape: BoxShape.circle,
        ),
        child: Icon(icon, size: 16, color: filled ? Colors.white : AppColors.textPrimary),
      ),
    );
  }
}
